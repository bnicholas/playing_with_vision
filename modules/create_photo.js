// create_photo.js

const Photo = require('../models/photo')
const gpsCoords = require('./exif_to_coords')

module.exports = function(props, photo) {
  return new Promise((resolve, reject) => {
    if (!props.labels_raw) reject(new Error('data.labels is not passed in'))
    const newPhoto = new Photo({
      fileID: photo._id,
      fileURL: `${process.env.HOST}/image/${photo.filename}`,
      fileName: photo.filename,
      fileContentType: photo.contentType,
      labels_raw: props.labels_raw,
      exif: props.exif,
      exifGeo: props.exifGeo,
      colors: props.colors,
      crop: props.crop,
      thumbnail: props.thumbnail
    })
    newPhoto.save((err, doc) => {
      if (!err) resolve(doc)
      else reject(err)
    })
  })
}
