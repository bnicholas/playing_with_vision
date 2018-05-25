(require('dotenv').config({ silent: process.env.NODE_ENV === 'production' }))
const util = require('util')
const express = require('express')
const app = express()
const mongoose = require('mongoose')

const bodyParser = require('body-parser')
const requestIp = require('request-ip')
const responseTime = require('response-time')

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
})

app.use(express.static('public'))
app.use(bodyParser.json())
app.use(responseTime())
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
  next()
})
app.set('view engine', 'ejs')

app.on('ready', function() {

  console.log('APP ready')

  const public_ip = require('./modules/get_public_ip')
  const ip_location = require('./modules/get_ip_location')

  const removeOrphanedAttachments = require('./modules/remove_orphaned_attachments')

  app.get('/api/cleanup', (req, res) => {
    removeOrphanedAttachments()
    .then(response => res.send(response))
    .catch(error => res.send('seems there was not a cleanup on isle 4'))
  })

  const multer = require('multer')
  const storage = multer.memoryStorage()
  const upload = multer({ storage: storage })

  const apiUpload = async function(req, res) {
    const uploads = []
    let ip = await public_ip(req)
    let ipGeo = await ip_location(ip)
    for (let params of req.files) {
      params.host = app.get('host')
      params.filename = new Date().getTime() + params.originalname.slice(-4)
      params.content_type = params.mimetype
      params.ip = ip
      params.ipGeo = ipGeo
      let fromFile = await processUpload(params)
      uploads.push(fromFile)
    }
    return uploads
  }

  app.post('/api/upload', upload.array('photo'), (req, res) => {
    apiUpload(req, res)
    .then(uploads => res.send("OK"))
    .catch(err => res.send({error: err}))
  })


  const processUpload = require('./modules/process_upload')
  const attachmentParamsFromUrl = require('./modules/attachment_params_from_url')
  const sms = require('./modules/send_sms')

  const postSms = async function (req, res) {
    const imageURL = req.body.photo
    const phone = req.body.phone
    const params = await attachmentParamsFromUrl(imageURL)
    params.phone = req.body.phone
    let photo = await processUpload(params)
    let saved = await sms.send_saved(photo, req.body.phone)
    let labels = await sms.send_labels(photo, req.body.phone)
    let geo = await sms.send_geolink(photo, req.body.phone)
    return photo
  }

  app.post('/api/sms', (req, res) => {
    postSms(req, res)
    .then(photo => res.send(photo))
    .catch(err => res.send({error: err}))
  })

  const Photo = require('./models/photo')
  const Attachment = require('./models/attachment')

  app.put('/api/image', async (req, res) => {
    if (!req.body._id) res.send('no id was provided')
    let record = await Photo.findById(req.body._id).exec()
    record.browserGeo = req.body.browserGeo || false
    let saved = await record.save()
    if (saved) res.send(saved)
    else res.send(new Error('record was not saved'))
  })

  app.get('/geodata/:photo_id', async function(req, res) {
    let record = await Photo.findById(req.params.photo_id).exec()
    let ip = await public_ip(req)
    if (!record.ipGeo) {
      record.ipGeo = await ip_location(ip)
    }
    let locals = {photo: record}
    res.once('finish', () => {
      // THIS IS JUST TO CHECK THE GEOIP LAG
      console.log('RENDERED in ' + res.get('X-Response-Time'))
      record.save()
      // .then(saved => console.log("SAVED"))
      // .catch(error => console.log("NOT SAVED", error))
    })
    res.render('geo', locals)
  })

  app.get('/image/:filename', (req, res) => {
    Attachment.findOne({ filename: req.params.filename }, (err, file) => {
      const readStream = Attachment.readById(file._id)
      readStream.pipe(res)
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

  app.get('/', (req, res) => {
    res.render('upload')
  })

  app.listen(process.env.PORT || 5000, '0.0.0.0', () => {
    console.log(`Ford Vision is listening on ${process.env.PORT || 5000}`)
    console.log(`NODE VERSION: ${process.version}`)
  })

})

mongoose.connect(process.env.MONGODB_URI)
mongoose.Promise = global.Promise
mongoose.connection.once('open', function() {
  console.log('Mongoose Connected')
  app.emit('ready')
})
