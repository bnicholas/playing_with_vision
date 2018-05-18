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
const requestIp = require('request-ip')
const util = require('util')
const sendSMS = require('./twilio.js')

// Abstract all this section -----------------------------------------------
let gfs, host
const Grid = require('gridfs-stream')
const mongoose = require('mongoose')
const timestamps = require('mongoose-timestamp')
const multer = require('multer')
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

if (process.env.NODE_ENV === 'production') {
  host = 'http://ford-vision.herokuapp.com'
} else {
  host = `http://localhost:${process.env.PORT}`
}

mongoose.connect(process.env.MONGODB_URI, null, error => {
  gfs = Grid(mongoose.connection.db, mongoose.mongo)
  gfs.collection('photos')
})
const Mixed = mongoose.Schema.Types.Mixed
const PhotoSchema = mongoose.Schema({
  phone: String,
  fileID: String,
  fileName: String,
  fileURL: String,
  fileContentType: String,
  labels: Array,
  exif: Mixed,
  colors: Array,
  crop: Array,
  thumbnail: Buffer,
  thumbnailURL: String,
  geo: Mixed,
  lat: String,
  long: String,
  ip: String
}, { strict: false })

PhotoSchema.plugin(timestamps)

PhotoSchema.pre('remove', async function() {
  await deleteFileById(this.fileID)
})

const Photo = mongoose.model('Photo', PhotoSchema)

function filterLabelConfidence(list) {
  return new Promise((resolve, reject) => {
    if (!list) reject(new Error('no array of label results was provided'))
    let minScore = 0.8
    let labelsArray = []
    list.forEach(item => {
      if (item.score > minScore) labelsArray.push(item.description)
    })
    resolve(labelsArray)
  })
}

function createPhoto(data, photo) {
  return new Promise((resolve, reject) => {
    if (!data.labels) reject(new Error('data.labels is not passed in'))
    const newPhoto = new Photo({
      fileID: photo._id,
      fileURL: `http://${host}/image/${photo.filename}`,
      fileName: photo.filename,
      fileContentType: photo.contentType,
      labels: data.labels,
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

function getExifData(buffer) {
  return new Promise((resolve, reject) => {
    if (!buffer instanceof Buffer) {
      reject(new Error('parameter was not a Buffer'))
    }
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
      else resolve("File was deleted")
    })
  })
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
  if (!gfsParams.buffer) reject(new Error('gfsParams.buffer was not supplied'))
  if (!gfsParams.buffer instanceof Buffer) reject(new Error('gfsParams.buffer is not a Buffer'))
  let gfsPhoto = await paramsToGridFs(gfsParams).catch(err => console.error(err))
  let exif = await getExifData(gfsParams.buffer).catch(err => '')
  let vision = await getVisionData(gfsParams.buffer).catch(err => console.error(err))
  let labels = await filterLabelConfidence(vision.labels).catch(err => console.error(err))
  let thumbnail = await generateThumbnail(gfsParams.buffer).catch(err => console.error(err) )
  let props = {
    phone: gfsParams.phone,
    labels: labels,
    exif: exif,
    colors: vision.props.dominantColors.colors,
    crop: vision.crop.cropHints,
    thumbnail: thumbnail
  }
  let photo = await createPhoto(props, gfsPhoto).catch(err => console.error(err))

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
    if (!params.filename || !params.content_type) {
      reject(new Error('expected {filename: String, content_type: String}'))
    }
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

function generateThumbnail(imageBuffer) {
  return new Promise((resolve, reject) => {
    if (!imageBuffer instanceof Buffer) reject(new Error('parameter was not a Buffer'))
    gm(imageBuffer, 'image.jpg')
    .resize(null, 200)
    .toBuffer((err, buffer) => {
      if (err) reject(err)
      resolve(buffer)
    })
  })
}
// -------------------------------------------------------------------------

app.use(express.static('public'))
app.use(bodyParser.json())
app.use(requestIp.mw())
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
  next()
})
app.set('view engine', 'ejs')

app.post('/api/cleanup', (req, res) => {
  removeOrphanedFiles()
  .then(response => res.send(response))
  .catch(error => res.send('seems there was not a cleanup on isle 4'))
})

app.get('/', (req, res) => res.render('upload'))

app.post('/api/sms', upload.array('photo'), async (req, res) => {
  host = req.headers.host
  const requestBody = req.body
  const imageURL = req.body.photo
  const phone = req.body.phone
  console.log("\n===========================================")
  console.log(req.body.phone)
  console.log("===========================================\n")
  let gridParamsFromUrl = await urlToGridFsParams(imageURL).catch(err => console.error(err))
  gridParamsFromUrl.phone = phone
  let photo = await processUpload(gridParamsFromUrl).catch(err => console.error(err))
  sendSMS(photo, phone)
  .then(msg => res.send('ok'))
  .catch(err => res.send('oops'))
})

app.post('/api/upload', upload.array('photo'), async (req, res) => {
  host = req.headers.host
  const uploads = []
  if (req.files) {
    for (let file of req.files) {
      let gridParams = {
        content_type: file.mimetype,
        filename: new Date().getTime() + file.originalname.slice(-4),
        buffer: file.buffer
      }
      let fromFile = await processUpload(gridParams)
      uploads.push(fromFile)
    }
    // sendSMS(uploads[0])
    // .then(sid => {
    //   console.log(`TWILIO resolved with an SID of ${sid}`)
    //   res.send(uploads)
    // })
    // .catch((err) => {
    //   console.error('error sending sms')
    //   console.error(err)
    //   res.send(uploads)
    // })
    res.send(uploads)
  }
})

app.put('/api/image', (req, res) => {
  // photo.ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
  let photo = req.body
  console.log(photo)
  Photo.findById(photo._id, function (err, record) {
    if (err) res.send(err)
    // record.ip = photo.ip
    record.geo = photo.geo
    record.save((err, record) => {
      if (err) res.send(err)
      else res.send(record)
    })
  })
})

app.get('/geodata/:photo_id', (req, res) => {
  Photo.findById(req.params.photo_id, function (err, record) {
    if (err) res.send(err)
    res.render('geo', {photo: record})
  })
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
  let count = await gfs.files.find({}).count().catch(err => console.error(err) )
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
