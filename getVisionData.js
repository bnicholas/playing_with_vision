(require('dotenv').config({ silent: process.env.NODE_ENV === 'production' }))

const fs = require('fs')

// google key hack ----------------------------------------------------------------
const fileData = JSON.stringify({
  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.GOOGLE_CLIENT_EMAIL
})
fs.writeFileSync(__dirname + '/ford-vision.json', fileData, {encoding:'utf8'})
// --------------------------------------------------------------------------------

const vision = require('@google-cloud/vision')
const client = new vision.ImageAnnotatorClient()

module.exports = function(img) {
  return new Promise(function(resolve, reject) {
    client
    .labelDetection(img)
    .then(results => {
      console.log(results[0].labelAnnotations)
      resolve(results[0].labelAnnotations)
    })
    .catch(err => {
      reject(err)
    })
  })
}
