const mongoose = require('mongoose')
const timestamps = require('mongoose-timestamp')
const Mixed = mongoose.Schema.Types.Mixed

const PhotoSchema = mongoose.Schema({
  colors: Array,
  crop: Array,
  exif: Mixed,
  geoBrowser: {type: Mixed, default: false },
  geoExif: {type: Mixed, default: false },
  geoIp: {type: Mixed, default: false },
  img_large: Mixed,
  img_map: Mixed,
  img_small: Mixed,
  ip: String,
  labels_raw: Array,
  located: {type: Boolean, default: false },
  phone: String,
}, {
  strict: false,
  toObject: { virtuals: true },
  toJSON: { virtuals: true }
})

// ADD TIMESTAMPS TO RECORDS
PhotoSchema.plugin(timestamps)

// AN ARRAY OF JUST THE LABEL NAMES
PhotoSchema.virtual('labels').get(function() {
  return this.labels_raw.map(item => item.description)
})

PhotoSchema.virtual('mapURL').get(function(){
  return `${process.env.HOST}/map/${this._id}`
})

PhotoSchema.virtual('mapTag').get(function(){
  return `<img src="${this.mapURL}" />`
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

PhotoSchema.method('prettyGeo', function(field) {
  let geo = this[field]
  if (geo.lat) {
    geo.lat = Number.parseFloat(geo.lat).toFixed(3)
    geo.lng = Number.parseFloat(geo.lng).toFixed(3)
    console.log(geo)
    return [geo.lat, geo.lng]
  } else {
    return ['none', 'none']
  }
})

PhotoSchema.virtual('bestCoords').get(function() {
  if (this.geoExif) return { coords: this.prettyGeo('geoExif'), source: 'photo GPS' }
  if (this.geoBrowser) return { coords: this.prettyGeo('geoBrowser'), source: 'browser' }
  if (this.geoIp) return { coords: this.prettyGeo('geoIp'), source: 'ip lookup'}
  else return { coords: 'none', source: 'none'}
})

// A FORMATTED ARRAY OF 'name 30.4%'
PhotoSchema.virtual('scores').get(function() {
  return this.labels_raw.map(item => `${item.description} ${(item.score * 100).toFixed(1) + '%'}`)
})

const Photo = mongoose.model('Photo', PhotoSchema)

module.exports = Photo
