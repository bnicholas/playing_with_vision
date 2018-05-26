// create_photo.js

const Photo = require('../models/photo')
const gpsCoords = require('./exif_to_coords')

module.exports = function(props) {
  return new Promise((resolve, reject) => {
    const newPhoto = new Photo({...props})
    newPhoto.save((err, doc) => {
      if (!err) resolve(doc)
      else reject(err)
    })
  })
}
