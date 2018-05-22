// create_photo.js

const Photo = require('../models/photo')

module.exports = function(data, photo) {

  return new Promise((resolve, reject) => {
    if (!data.labels_raw) reject(new Error('data.labels is not passed in'))
    const newPhoto = new Photo({
      fileID: photo._id,
      fileURL: `${process.env.HOST}/image/${photo.filename}`,
      fileName: photo.filename,
      fileContentType: photo.contentType,
      labels: data.labels,
      exif: data.exif,
      colors: data.colors,
      crop: data.crop,
      thumbnail: data.thumbnail
    })
    // newPhoto.set({ thumbnailURL: `${process.env.HOST}/thumbnail/${newPhoto._id}` })
    newPhoto.save((err, doc) => {
      if (!err) resolve(doc)
      else reject(err)
    })
  })
}
