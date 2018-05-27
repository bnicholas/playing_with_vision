const mongoose = require('mongoose')
const timestamps = require('mongoose-timestamp')
const Mixed = mongoose.Schema.Types.Mixed
const moment = require('moment')

const PhotoSchema = mongoose.Schema({
  colors: { type: Array, select: false },
  crop: { type: Array, select: false },
  exif: { type: Mixed, select: false },
  coords: Mixed,
  geo_from: String,
  img_large: { type: Mixed, select: false },
  img_small: { type: Mixed, select: false },
  ip: String,
  labels_raw: { type: Array, select: true },
  phone: String,
}, {
  strict: false,
  toObject: { virtuals: true, minimize: true },
  toJSON: { virtuals: true, minimize: true }
})

// ADD TIMESTAMPS TO RECORDS
PhotoSchema.plugin(timestamps)

// AN ARRAY OF JUST THE LABEL NAMES
PhotoSchema.virtual('labels').get(function() {
  return this.labels_raw.map(item => item.description)
})

PhotoSchema.virtual('thumbnailURL').get(function(){
  return `${process.env.HOST}/thumbnail/${this._id}`
})

PhotoSchema.virtual('thumbnailTag').get(function(){
  return `<img src="${this.thumbnailURL}" />`
})

PhotoSchema.virtual('imageURL').get(function(){
  return `${process.env.HOST}/image/${this._id}`
})

PhotoSchema.virtual('imageTag').get(function(){
  return `<img src="${this.imageURL}" />`
})

PhotoSchema.virtual('created').get(function(){
  return moment(this.createdAt).format('L, LT')
})

PhotoSchema.virtual('parsedCoords').get(function(){
  let geo = this.coords
  if (geo.lat) {
    let lat = parseFloat(geo.lat.toFixed(3))
    let lng = parseFloat(geo.lng.toFixed(3))
    return {lat: lat, lng: lng}
  } else {
    return false
  }
})


PhotoSchema.virtual('prettyGeo').get(function(){
  let geo = this.coords
  if (geo.lat) {
    geo.lat = Number.parseFloat(geo.lat).toFixed(2)
    geo.lng = Number.parseFloat(geo.lng).toFixed(2)
    return [geo.lat, geo.lng]
  } else {
    return ['none', 'none']
  }
})

// A FORMATTED ARRAY OF 'name 30.4%'
PhotoSchema.virtual('scores').get(function() {
  return this.labels_raw.map(item => `${(item.score * 100).toFixed(1) + '%'} ${item.description}`)
})

const Photo = mongoose.model('Photo', PhotoSchema)

module.exports = Photo
