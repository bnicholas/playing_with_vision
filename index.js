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

  const multer = require('multer')
  const storage = multer.memoryStorage()
  const upload = multer({ storage: storage })

  const apiUpload = async function(req, res) {
    const uploads = []
    let ip = await public_ip(req)
    let geoIp = await ip_location(ip)
    for (let params of req.files) {
      params.host = app.get('host')
      params.filename = new Date().getTime() + params.originalname.slice(-4)
      params.content_type = params.mimetype
      params.ip = ip
      params.geoIp = geoIp
      let photo = await processUpload(params)
      let upload = {}
      let view = app.render('partials/record', {photo: photo}, (err, html) => {
        upload.markup = JSON.stringify(html)
        upload.record = photo
      })
      uploads.push(upload)
    }
    return uploads
  }

  app.post('/api/upload', upload.array('photo'), (req, res) => {
    apiUpload(req, res)
    .then(uploads => res.send(uploads))
    .catch(err => res.send({error: err}))
  })

  app.post('/api/index/upload', upload.array('photo'), (req, res) => {
    apiUpload(req, res)
    .then(uploads => res.send(uploads))
    .catch(err => res.send({error: err}))
  })

  const processUpload = require('./modules/process_upload')
  const urlToParams = require('./modules/url_to_params')
  const sms = require('./modules/send_sms')

  const postSms = async function (req, res) {
    const imageURL = req.body.photo
    const phone = req.body.phone
    const params = await urlToParams(imageURL)
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

  app.put('/api/image', async (req, res) => {
    if (!req.body.id) res.send('no id was provided')
    let photo = await Photo.findById(req.body.id).exec()
    if (req.body.geo_from === 'browser' && req.body.coords) {
      photo.geo_from = 'browser'
      photo.located = true
      let coords = req.body.coords
      photo.coords = {lat: parseInt(coords.lat), lng: parseInt(coords.lng)}
    }
    let saved = await photo.save()
    if (saved) res.send(saved)
    else res.send(new Error('record was not saved'))
  })

  app.get('/geodata/:photo_id', async function(req, res) {
    let record = await Photo.findById(req.params.photo_id).exec()
    let ip = await public_ip(req)
    console.log('geo_from', record.geo_from)
    if (!record.geo_from === 'exif' && !record.geo_from === 'browser') {
      record.coords = await ip_location(ip)
      record.geo_from = 'ip'
      record.located = true
    }
    let locals = {photo: record}
    res.once('finish', () => {
      console.log('RENDERED in ' + res.get('X-Response-Time'))
      record.save()
    })
    res.render('geo', locals)
  })

  app.get('/image/:id', (req, res) => {
    Photo.findById(req.params.id, 'img_large', (err, photo) => {
      if (err) res.send(err)
      res.contentType(photo.img_large.content_type)
      res.send(photo.img_large.buffer.buffer)
    })
  })

  app.get('/thumbnail/:id', (req, res) => {
    Photo.findById(req.params.id, 'img_small', (err, photo) => {
      if (err) res.send(err)
      res.contentType(photo.img_small.content_type)
      res.send(photo.img_small.buffer.buffer)
    })
  })

  app.delete('/api/image/:id', (req, res) => {
    Photo.findByIdAndRemove(req.params.id).exec()
    .then(photo => res.send(photo))
    .catch(err => res.send({error: err}))
  })

  app.get('/api/images', (req, res) => {
    Photo.find({}).exec()
    .then(images => res.send(images))
    .catch(err => res.json({error: err}))
  })

  app.get('/upload', (req, res) => res.render('upload'))

  app.get('/', (req, res) => {
    Photo.find().sort({createdAt: 'desc'}).exec()
    .then(records => {
      res.render('records', { photos: records })
    })
    .catch(err => {
      console.log("ERROR", err)
      res.render('records', { photos: [], error: err })
    })
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
