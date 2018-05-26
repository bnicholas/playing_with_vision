// process_thumbnail.js

const gm = require('gm')

// GIVE IT AN IMAGE BUFFER
// AND IT WILL RESIZE IT WITH GRAPHICSMAGICK
// THEN RESOLVE WITH A SMALLER IMG BUFFER
module.exports = function (params) {
  return new Promise((resolve, reject) => {
    try {
      let filename = `thumb_${params.filename}`
      gm(params.buffer, filename)
      .resize(null, 200)
      .toBuffer((err, buffer) => {
        if (err) reject(err)
        let image = {
          buffer: buffer,
          content_type: params.content_type,
          filename: filename,
        }
        resolve(image)
      })
    } catch (e) {
      reject(e)
    }
  })
}
