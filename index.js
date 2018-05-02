(require('dotenv').config({ silent: process.env.NODE_ENV === 'production' }))
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const bufferToStream = require('buffer-to-stream')
const fetch = require('node-fetch')
const getVisionData = require('./getVisionData.js')
const fs = require('fs')
const ExifImage = require('exif').ExifImage


// Abstract all this section -----------------------------------------------
let gfs, host
const Grid = require('gridfs-stream')
const mongoose = require('mongoose')
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
  exif: mongoose.Schema.Types.Mixed
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
      exif: data.exif
    })
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

async function processUpload(gfsParams) {
  let gfsPhoto = await paramsToGridFs(gfsParams).catch(err => console.log(err))
  let buffer = await gridFsIdToBuffer(gfsPhoto._id).catch(err => console.log(err))
  let exif = await getExifData(buffer).catch(err => console.log(err))
  let vision = await getVisionData(buffer).catch(err => console.log(err))
  let labels = await filterLabelConfidence(vision).catch(err => console.log(err))
  let props = { labels: labels, exif: exif }
  let photo = await createPhoto(props, gfsPhoto).catch(err => console.log(err))
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


// -------------------------------------------------------------------------

app.use(express.static('public'))
app.use(bodyParser.json())
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
  next()
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

app.delete('/api/image/:id', (req, res) => {
  Photo.findOne({ _id: req.params.id }, (err, doc) => {
    gfs.files.deleteOne({ _id: doc.fileID }, err => {
      Photo.deleteOne({ _id: req.params.id }, err => {
        if (err) console.log('error deleting photo')
        else res.send("WERD")
      })
    })
  })
})

app.get('/api/images', (req, res) => {
  Photo.find(function (err, records) {
    if (err) res.send(err)
    else res.send(records)
  })
})

app.listen(process.env.PORT || 5000, () => {
  console.log(`Ford Vision is listening on ${process.env.PORT || 5000}`)
  console.log(`NODE VERSION: ${process.version}`)
})
