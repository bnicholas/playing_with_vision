(require('dotenv').config({ silent: process.env.NODE_ENV === 'production' }))
const fs = require('fs')

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
const gridfs = require('gridfs-stream');
gridfs.mongo = mongoose.mongo;
const connection = mongoose.connection
const multer = require('multer')
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

const vision = require('@google-cloud/vision')
const client = new vision.ImageAnnotatorClient()

app.get('/vision-test', (req, res) => {
  client
  .labelDetection('./images/test.jpg')
  .then(results => {
    console.log(results[0].labelAnnotations)
    res.send(results[0].labelAnnotations)
  })
  .catch(err => {
    console.log(err);
    res.send({Error: err})
  })
})


connection.once('open', function () {
  console.log('mongodb connection OPEN');


  const gfs = gridfs(connection.db)

  const Attachment = mongoose.model('Photos', {
    fileName: String,
    labels:   Array,
    image: { data: Buffer, contentType: String }
  })

  const writestream = gfs.createWriteStream({
    filename: 'mongo_file.txt'
  })


  app.get('/', (req, res) => res.send('hello world'))

  app.get('/clear', (req, res) => {
    ImageModel.remove(function (err) {
      if (err) res.send(err);
      else {
        ImageModel.find(function (err, records) {
          if (err) res.send(err);
          else res.send(records)
        })
      }
    })
  })

  app.get('/test', (req, res) => {
    const testImg = new ImageModel
    testImg.img.data = fs.readFileSync(imgPath)
    testImg.img.contentType = 'image/jpg'
    testImg.save((err, testImg) => {
      if (err) throw err
      else {
        res.contentType(testImg.img.contentType)
        res.send(testImg.img.data)
      }
    })
  })

  app.post('/write', upload.single('photo'), function (req, res) {

    // console.log('----------------------------');
    console.log(req.file)
    // // res.send('ok')

    const writestream = gfs.createWriteStream({
      filename: req.file.originalname,
      mode: 'w',
      content_type: req.file.mimetype,
      metadata: req.body
    })

    req.pipe(writestream)

    writestream.on('close', file => {
      console.log('\n ========================= \n');
      console.log(file)
      res.send('writestream.on close')

      // file._id ... reference the fs.files id in the photos document
      // const testImg = new Attachment
      // testImg.fileName = file.filename
      // testImg.image = file
      // testImg.save((err, testImg) => {
      //   if (err) res.send(err)
      //   else {
      //     res.contentType(testImg.img.contentType)
      //     res.send(testImg)
      //   }
      // })

      // fs.unlink(req.file.path, function(err) {
      //   // handle error
      //   console.log('success!')
      // })
    })

  })

  app.post('/upload', (req, res) => {
    let writestream = gfs.createWriteStream({ filename: db_filename });
    fs.createReadStream(local_file).pipe(writestream);
    writestream.on('close', function (file) {
      res.send('File Created : ' + file.filename);
    })

    let body = '';
    req.on('data', chunk => {
      body += chunk.toString() // convert Buffer to string
    })
    req.on('end', () => {
      const testImg = new ImageModel
      testImg.img.data = body
      testImg.img.contentType = 'image/jpg'
      testImg.save((err, testImg) => {
        if (err) res.send(err)
        else {
          res.contentType(testImg.img.contentType)
          res.send(testImg.img.data)
        }
      })
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
