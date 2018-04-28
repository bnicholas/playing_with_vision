(require('dotenv').config({ silent: process.env.NODE_ENV === 'production' }))
const express = require('express')
const app = express()

const getVisionData = require('./getVisionData.js')
const uploader = require('./gridFsUploader.js')

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
    labels: Array
  })

  const Photo = mongoose.model('Photo', PhotoSchema)

  function createPhoto(data, req) {
    return new Promise((resolve, reject) => {
      const photo = new Photo({
        fileID: req.file.id,
        fileURL: `http://${req.headers.host}/image/${req.file.filename}`,
        fileName: req.file.filename,
        fileContentType: req.file.mimetype,
        labels: data.map(item => item.description)
      })
      photo.save((err, doc) => {
        if (err) reject({ error: err})
        else resolve(doc)
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


// -------------------------------------------------------------------------

app.use(express.static('public'))

app.get('/', (req, res) => res.sendFile(__dirname + '/public/upload.html'))

app.post('/api/upload', uploader.single('photo'), function (req, res) {
  gridFsIdToBuffer(req.file.id)
  .then(buffer => {
    getVisionData(buffer)
    .then(data => {
      createPhoto(data, req)
      .then(doc => {
        res.json(doc)
      })
      .catch(err => res.send({promise: 'createPhoto', error: err}))
    })
    .catch(err => res.send({promise: 'getVisionData', error: err}))
  })
  .catch(err => res.send({promise: 'gridFsIdToBuffer', error: err}))
})

app.get('/image/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    const readstream = gfs.createReadStream(file.filename)
    readstream.pipe(res)
  })
})

app.get('/images', (req, res) => {
  ImageModel.find(function (err, records) {
    if (err) res.send(err)
    else res.send(records)
  })
})

app.listen(process.env.PORT || 5000, () => {
  console.log(`Ford Vision is listening on ${process.env.PORT || 5000}`)
})
