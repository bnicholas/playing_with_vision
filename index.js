(require('dotenv').config({ silent: process.env.NODE_ENV === 'production' }))
const util = require('util')
const express = require('express')
const app = express()
const mongoose = require('mongoose')

const bodyParser = require('body-parser')
const requestIp = require('request-ip')

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
})

app.use(express.static('public'))
app.use(bodyParser.json())
app.use(requestIp.mw())
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
  next()
})
app.set('view engine', 'ejs')

app.on('ready', function() {

  console.log('APP ready')

  const removeOrphanedAttachments = require('./factories/remove_orphaned_attachments')

  app.get('/api/cleanup', (req, res) => {
    removeOrphanedAttachments()
    .then(response => res.send(response))
    .catch(error => res.send('seems there was not a cleanup on isle 4'))
  })

  const multer = require('multer')
  const storage = multer.memoryStorage()
  const upload = multer({ storage: storage })

  app.post('/api/upload', upload.array('photo'), async (req, res) => {
    const uploads = []
    if (req.files) {
      for (let params of req.files) {
        console.log(params)
        params.host = app.get('host')
        params.filename = new Date().getTime() + params.originalname.slice(-4)
        params.content_type = params.mimetype
        let fromFile = await processUpload(params).catch(err => console.error(err))
        uploads.push(fromFile)
      }
      res.send(uploads)
    } else {
      res.send('No files provided')
    }
  })

  const sendSMS = require('./factories/send_sms')
  const processUpload = require('./factories/process_upload')
  const urlToGridFsParams = require('./factories/params_to_gridfs')

  app.post('/api/sms', upload.array('photo'), async (req, res) => {
    const imageURL = req.body.photo
    const params = await urlToGridFsParams(imageURL).catch(err => console.error(err))
    params.phone = req.body.phone
    let photo = await processUpload(params).catch(err => console.error(err))
    sendSMS(photo, req.body.phone)
    .then(msg => res.send('ok'))
    .catch(err => res.send('oops'))
  })

  const Photo = require('./models/photo')
  const Attachment = require('./models/attachment')

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
      console.log(record)
      res.render('geo', {photo: record})
    })
  })

  app.get('/image/:filename', (req, res) => {
    Attachment.files.findOne({ filename: req.params.filename }, (err, file) => {
      const readstream = Attachment.createReadStream(file.filename)
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
        console.log('error removing photo', err)
        res.send('error')
      })

    })
  })

  app.get('/api/images', async (req, res) => {
    const response = { }
    Photo.find(function (err, records) {
      if (err) res.send(err)
      if (records.length === 0) res.send([])
      else {
        response.records = records

        res.send(response)
      }
    })
  })

  app.get('/', (req, res) => res.render('upload'))

  app.listen(process.env.PORT || 5000, () => {
    console.log(`Ford Vision is listening on ${process.env.PORT || 5000}`)
    console.log(`NODE VERSION: ${process.version}`)
  })

})

mongoose.connect(process.env.MONGODB_URI)
mongoose.connection.once('open', function() {
  console.log('Mongoose Connected')
  app.emit('ready')
})
