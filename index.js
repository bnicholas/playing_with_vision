(require('dotenv').config({ silent: process.env.NODE_ENV === 'production' }))
const express = require('express')
const app = express()

const getVisionData = require('./getVisionData.js')
const uploader = require('./gridFsUploader.js')

const ExifImage = require('exif').ExifImage;

// Abstract all this section -----------------------------------------------
let gfs
const Grid = require('gridfs-stream')
const mongoose = require('mongoose')
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

function createPhoto(data, req) {
  return new Promise((resolve, reject) => {
    let labels = data.labels.map(item => {
      let label = { label: item.description, score: item.score }
      return label
    })
    const photo = new Photo({
      fileID: req.file.id,
      fileURL: `http://${req.headers.host}/image/${req.file.filename}`,
      fileName: req.file.filename,
      fileContentType: req.file.mimetype,
      labels: labels,
      exif: data.exif
    })
    photo.save((err, doc) => {
      if (!err) resolve(doc)
      else reject({ error: err})
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

async function processUpload(req) {
  let buffer = await gridFsIdToBuffer(req.file.id).catch(err => console.log(err))
  let exif = await getExifData(buffer).catch(err => console.log(err))
  let vision = await getVisionData(buffer).catch(err => console.log(err))
  let labels = await filterLabelConfidence(vision).catch(err => console.log(err))
  let props = { labels: labels, exif: exif }
  let photo = await createPhoto(props, req).catch(err => console.log(err))
  return photo
}

// -------------------------------------------------------------------------

app.use(express.static('public'))

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
  next()
})

app.get('/', (req, res) => res.sendFile(__dirname + '/public/upload.html'))

app.post('/api/upload', uploader.single('photo'), async (req, res) => {
  let photo = await processUpload(req)
  res.send(photo)
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

// process.on('unhandledRejection', r => {
//   console.log('\n OOPS');
//   console.log('===================================');
//   console.log(r)
// })
