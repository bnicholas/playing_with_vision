// get_exif_data.js

const ExifImage = require('exif').ExifImage

// GIVE IT AN IMG BUFFER
// IT WILL RESOLVE WITH ANY EXISTING METADATA
module.exports = function (buffer) {
  return new Promise((resolve, reject) => {
    if (!buffer instanceof Buffer) {
      reject(new Error('parameter was not a Buffer'))
    }
    new ExifImage({ image : buffer }, (error, exifData) => {
      if (error) reject({})
      else resolve(exifData)
    })
  })
}
