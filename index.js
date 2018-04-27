(require('dotenv').config({ silent: process.env.NODE_ENV === 'production' }))
const fs = require('fs')
const path = require('path')
const fileData = JSON.stringify({
  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.GOOGLE_CLIENT_EMAIL
})
fs.writeFileSync(__dirname + '/ford-vision.json', fileData, {encoding:'utf8'});

const express = require('express')
const app = express()

const imgPath = 'images/DSC_5454.jpg'

const mongoose = require('mongoose')
mongoose.connect(process.env.MONGODB_URI)
mongoose.Promise = global.Promise;
const connection = mongoose.connection
const ObjectId = mongoose.Types.ObjectId

const vision = require('@google-cloud/vision')
const client = new vision.ImageAnnotatorClient()

const clear = require("cli-clear")

function getVisionData(img) {
  return new Promise(function(resolve, reject) {
    client
    .labelDetection(img)
    .then(results => resolve(results[0].labelAnnotations))
    .catch(err => reject(err))
  })
}

connection.once('open', function () {
  console.log('mongodb connection OPEN');
  const multer = require('multer')
  const Grid = require('gridfs-stream');
  Grid.mongo = mongoose.mongo
  const gfs = Grid(connection.db)
  const GridFsStorage = require('multer-gridfs-storage')
  gfs.collection('photos')

  const storage = new GridFsStorage({
    url: process.env.MONGODB_URI,
    file: (req, file) => {
      if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        return {
          bucketName: 'photos',
          filename: Date.now() + path.extname(file.originalname)
        };
      } else {
        return null;
      }
    }
  })
  const upload = multer({ storage });

  const PhotoModel = mongoose.model('Photos', {
    fileID: String,
    fileName: String,
    fileURL: String,
    fileContentType: String,
    labels: Array
  })

  app.get('/', (req, res) => res.send('hello world'))

  app.post('/upload', upload.single('photo'), function (req, res) {

    gfs.files.findOne({ _id: req.file.id }, (err, file) => {
      console.log(file);
      const readstream = gfs.createReadStream(file.filename)
      let buffer = new Buffer(0)
      readstream.on('data', chunk => buffer = Buffer.concat([buffer, chunk]))
      readstream.on('end', () => {
        getVisionData(buffer)
        .then(data => {
          let photo = new PhotoModel
          photo.fileID = req.file.id
          photo.fileURL = `/image/${req.file.filename}`
          photo.fileName = req.file.filename
          photo.fileContentType = req.file.mimetype
          photo.labels = data.map(item => item.description)
          photo.save((err, photo) => {
            console.log('photo.save');
            console.log(photo);
            res.send(photo)
          })
        })
        .catch(err => res.send(err))
      })
    })
  })

  app.get('/image/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
      const readstream = gfs.createReadStream(file.filename)
      readstream.pipe(res)
    })
  })

  app.get('/images', (req, res) => {
    ImageModel.find(function (err, records) {
      if (err) res.send(err);
      else res.send(records)
    })
  });

  app.listen(process.env.PORT || 5000, () => console.log(`Ford Vision is listening on ${process.env.PORT || 5000}`))

})
