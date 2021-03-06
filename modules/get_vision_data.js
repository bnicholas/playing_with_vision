// get_vision_data.js
// (require('dotenv').config({ silent: process.env.NODE_ENV === 'production' }))

const fs = require('fs')

// google key hack ----------------------------------------------------------------
const fileData = JSON.stringify({
  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.GOOGLE_CLIENT_EMAIL
})
fs.writeFileSync('ford-vision.json', fileData, {encoding:'utf8'})
// --------------------------------------------------------------------------------

const vision = require('@google-cloud/vision')
const client = new vision.ImageAnnotatorClient()
const cropOptions = { imageContext: { cropHintsParams: { aspectRatios : [1.77, 1.333] } } }

// GIVE IT AN IMAGE BUFFER AND IT RESOLVES WITH GOOGLE DATA
module.exports = function(buffer) {
  return new Promise(function(resolve, reject) {
    const labels = client.labelDetection(buffer)
    const props = client.imageProperties(buffer, cropOptions)
    Promise.all([labels, props])
    .then(values => {
      const visionData = {
        labels: values[0][0].labelAnnotations,
        crop: values[1][0].cropHintsAnnotation,
        props: values[1][0].imagePropertiesAnnotation
      }
      resolve(visionData)
    })
    .catch(error => {
      reject(error)
    })
  })
}
