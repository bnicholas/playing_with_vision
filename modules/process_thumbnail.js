// process_thumbnail.js

const gm = require('gm')

// GIVE IT AN IMAGE BUFFER
// AND IT WILL RESIZE IT WITH GRAPHICSMAGICK
// THEN RESOLVE WITH A SMALLER IMG BUFFER
module.exports = function (buffer) {
  return new Promise((resolve, reject) => {
    if (!buffer instanceof Buffer) reject(new Error('parameter was not a Buffer'))
    gm(buffer, 'image.jpg')
    .resize(null, 200)
    .toBuffer((err, buffer) => {
      if (err) reject(err)
      resolve(buffer)
    })
  })
}
