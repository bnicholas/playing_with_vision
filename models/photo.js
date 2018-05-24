const mongoose = require('mongoose')
const timestamps = require('mongoose-timestamp')
const deleteAttachment = require('../modules/delete_attachment_by_id')

const Mixed = mongoose.Schema.Types.Mixed
const PhotoSchema = mongoose.Schema({
  phone: String,
  fileID: String,
  fileName: String,
  fileURL: String,
  fileContentType: String,
  labels_raw: Array,
  exif: Mixed,
  colors: Array,
  crop: Array,
  thumbnail: Buffer,
  browserGeo: {type: Mixed, default: false },
  exifGeo: {type: Mixed, default: false },
  ipGeo: {type: Mixed, default: false },
  ip: String
}, {
  strict: false,
  toObject: { virtuals: true },
  toJSON: { virtuals: true }
})

// ADD TIMESTAMPS TO RECORDS
PhotoSchema.plugin(timestamps)

// DELETE ASSOCIATED ATTACHMENTS FROM GRIDFS
PhotoSchema.pre('remove', async function() {
  // await Attachment.delete(id)
  await deleteAttachment(this.fileID)
})

// AN ARRAY OF JUST THE LABEL NAMES
PhotoSchema.virtual('labels').get(function() {
  return this.labels_raw.map(item => item.description)
})

PhotoSchema.virtual('thumbnailURL').get(function(){
  return `${process.env.HOST}/thumbnail/${this._id}`
})

// A FORMATTED ARRAY OF 'name 30.4%'
PhotoSchema.virtual('scores').get(function() {
  return this.labels_raw.map(item => `${item.description} ${(item.score * 100).toFixed(1) + '%'}`)
})

const Photo = mongoose.model('Photo', PhotoSchema)

module.exports = Photo
