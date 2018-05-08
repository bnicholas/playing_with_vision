(require('dotenv').config({ silent: process.env.NODE_ENV === 'production' }))
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const bufferToStream = require('buffer-to-stream')
const fetch = require('node-fetch')
const getVisionData = require('./getVisionData.js')
const fs = require('fs')
const ExifImage = require('exif').ExifImage
const _difference = require('lodash/difference')
const gm = require('gm')

// Abstract all this section -----------------------------------------------
let gfs, host
const Grid = require('gridfs-stream')
const mongoose = require('mongoose')
const timestamps = require('mongoose-timestamp')
const multer = require('multer')
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

mongoose.connect(process.env.MONGODB_URI, null, error => {
  gfs = Grid(mongoose.connection.db, mongoose.mongo)
  gfs.collection('photos')
})

const PhotoSchema = mongoose.Schema({
  fileID: String,
  fileName: String,
  fileURL: String,
  fileContentType: String,
  labels: Array,
  exif: mongoose.Schema.Types.Mixed,
  colors: Array,
  crop: Array,
  thumbnail: Buffer,
  thumbnailURL: String
})
PhotoSchema.plugin(timestamps)

PhotoSchema.pre('remove', async function() {
  await deleteFileById(this.fileID)
})

PhotoSchema.post('remove', async function(photo) {
  let count = await gfs.files.find({}).count()
  console.log('POST remove count: ' + count)
})

const Photo = mongoose.model('Photo', PhotoSchema)

function filterLabelConfidence(list) {
  return new Promise((resolve, reject) => {
    let minScore = 0.8
    let labelsArray = []
    list.forEach(item => {
      if (item.score > minScore) labelsArray.push(item)
    })
    resolve(labelsArray)
    reject(error)
  })
}

function createPhoto(data, photo) {
  return new Promise((resolve, reject) => {
    let labels = data.labels.map(item => {
      let label = { label: item.description, score: item.score }
      return label
    })
    const newPhoto = new Photo({
      fileID: photo._id,
      fileURL: `http://${host}/image/${photo.filename}`,
      fileName: photo.filename,
      fileContentType: photo.contentType,
      labels: labels,
      exif: data.exif,
      colors: data.colors,
      crop: data.crop,
      thumbnail: data.thumbnail
    })
    newPhoto.set({ thumbnailURL: `http://${host}/thumbnail/${newPhoto._id}` })
    newPhoto.save((err, doc) => {
      if (!err) resolve(doc)
      else reject(err)
    })
  })
}

function gridFsIdToBuffer(id) {
  return new Promise(function(resolve, reject) {
    gfs.files.findOne({ _id: id }, (err, file) => {
      const readstream = gfs.createReadStream(file.filename)
      let buffer = new Buffer(0)
      readstream.on('data', chunk => buffer = Buffer.concat([buffer, chunk]))
      readstream.on('error', err => reject(err))
      readstream.on('end', () => resolve(buffer))
    })
  })
}

function getExifData(buffer) {
  return new Promise((resolve, reject)=>{
    new ExifImage({ image : buffer }, (error, exifData) => {
      if (error) reject({})
      else resolve(exifData)
    })
  })
}

function deleteFileById(fileID) {
  return new Promise((resolve, reject) => {
    gfs.remove({ _id: fileID, root: 'photos' }, function (err, gridStore) {
      if (err) reject(err)
      else resolve(true)
    })
  })
}

function superConsole(what) {
  console.log("\n===========================================")
  console.log(what)
  console.log("===========================================\n")
}

async function removeOrphanedFiles() {
  try {
    let toRemove = await Photo.distinct('fileID')
    let gridIDs = await gfs.files.distinct('_id')
    let removeFrom = gridIDs.map(item => `${item}`)
    let idsToDelete = _difference(removeFrom, toRemove)
    for (let id of idsToDelete) {
      await deleteFileById(id)
    }
    return `remove ${idsToDelete.length} photo files`
  } catch (err) {
    return err
  }
}

async function processUpload(gfsParams) {
  let gfsPhoto = await paramsToGridFs(gfsParams).catch(err => console.log(err))
  // let buffer = await gridFsIdToBuffer(gfsPhoto._id).catch(err => console.log(err))
  let exif = await getExifData(gfsParams.buffer).catch(err => console.log(err))
  let vision = await getVisionData(gfsParams.buffer).catch(err => console.log(err))
  let labels = await filterLabelConfidence(vision.labels).catch(err => console.log(err))
  let thumbnail = await generateThumbnail(gfsParams.buffer).catch(err => { console.log(err) })
  let props = {
    labels: labels,
    exif: exif,
    colors: vision.props.dominantColors.colors,
    crop: vision.crop.cropHints[0].boundingPoly.vertices,
    thumbnail: thumbnail
  }
  let photo = await createPhoto(props, gfsPhoto).catch(err => console.log(err))
  // console.log(photo.thumbnail)
  console.log(photo.thumbnailURL)
  return photo
}

function urlToGridFsParams(url) {
  return new Promise((resolve, reject) => {
    fetch(url)
    .then(res => {
      let chunks = []
      let ext = '.jpg'
      if (res.headers.get('Content-Type') === 'image/jpeg') ext = '.jpg'
      const gridParams = {
        content_type: res.headers.get('Content-Type'),
        filename: new Date().getTime() + ext,
        buffer: ''
      }
      res.body.on('data', chunk => {
        chunks.push(Buffer.from(chunk, 'binary'))
      })
      res.body.on('end', () => {
        gridParams.buffer = Buffer.concat(chunks)
        resolve(gridParams)
      })
    })
    .catch(error => reject(error))
  })
}

function paramsToGridFs(params) {
  return new Promise((resolve, reject) => {
    let writeStream = gfs.createWriteStream({
      filename: params.filename,
      content_type: params.content_type,
      root: 'photos'
    })
    bufferToStream(params.buffer).pipe(writeStream)
    writeStream.on('close', file => resolve(file))
    writeStream.on('error', error => reject(error))
  })
}

function gmToBuffer (data) {
  return new Promise((resolve, reject) => {
    data.stream((err, stdout, stderr) => {
      if (err) { return reject(err) }
      const chunks = []
      stdout.on('data', (chunk) => { chunks.push(chunk) })
      // these are 'once' because they can and do fire multiple times for multiple errors,
      // but this is a promise so you'll have to deal with them one at a time
      stdout.on('end', () => { resolve(Buffer.concat(chunks)) })
      // stderr.once('data', (data) => { reject(String(data)) })
    })
  })
}

function generateThumbnail(imageBuffer) {
  return new Promise((resolve, reject) => {
    const data = gm(imageBuffer, 'image.jpg').resize(null, 200)
    gmToBuffer(data)
    .then(buffer => resolve(buffer))
    .catch(error => reject(error))
    // .toBuffer((err, buffer) => {
    //   if (err) reject(err)
    //   console.log(buffer)
    //   resolve(buffer)
    // })
  })
}
// -------------------------------------------------------------------------

app.use(express.static('public'))
app.use(bodyParser.json())
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
  next()
})

app.post('/api/cleanup', (req, res) => {
  removeOrphanedFiles()
  .then(response => res.send(response))
  .catch(error => res.send('seems there was not a cleanup on isle 4'))
})

app.get('/', (req, res) => res.sendFile(__dirname + '/public/upload.html'))

app.post('/api/upload', upload.single('photo'), async (req, res) => {
  host = req.headers.host
  const imageURL = req.body.photo || req.query.url
  if (req.file) {
    let gridParams = {
      content_type: req.file.mimetype,
      filename: new Date().getTime() + req.file.originalname.slice(-4),
      buffer: req.file.buffer
    }
    let fromFile = await processUpload(gridParams)
    res.send(fromFile)
  }
  if (imageURL) {
    let gridParamsFromUrl = await urlToGridFsParams(imageURL).catch(err => console.log(err))
    let fromUrl = await processUpload(gridParamsFromUrl).catch(err => console.log(err))
    res.send(fromUrl)
  }
})

app.get('/image/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    const readstream = gfs.createReadStream(file.filename)
    readstream.pipe(res)
  })
})

app.get('/thumbnail/:id', (req, res) => {
  Photo.findById(req.params.id, (err, photo) => {
    if (err) res.send(err)
    res.contentType('image/jpeg')
    res.send(photo.thumbnail)
  })
})

app.delete('/api/image/:id', (req, res) => {
  Photo.findById(req.params.id, function(err, doc) {
    if (err) console.log('findById error')
    doc.remove()
    .then(photo => {
      console.log('removed photo')
      res.send('ok')
    })
    .catch(err => {
      console.log('error removing photo')
      res.send('error')
    })

  })
})

app.get('/api/images', async (req, res) => {
  let response = { count: {} }
  let count = await gfs.files.find({}).count().catch(err => { console.log(err) })
  response.count.files = count
  Photo.find(function (err, records) {
    if (err) res.send(err)
    response.records = records
    response.count.photos = records.length
    res.send(response)
  })
})

app.listen(process.env.PORT || 5000, () => {
  console.log(`Ford Vision is listening on ${process.env.PORT || 5000}`)
  console.log(`NODE VERSION: ${process.version}`)
})
