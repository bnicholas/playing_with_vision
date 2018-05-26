// https://developers.google.com/maps/documentation/maps-static/intro
const urlToParams = require('./url_to_params')
const fetch = require('node-fetch')
const map_width = 400
const map_height = 400
const map_zoom = 12

module.exports = function(coords) {
  return new Promise((resolve, reject) => {
    let url = [
      `https://maps.googleapis.com/maps/api/staticmap?`,
      `center=${coords.lat},${coords.lng}`,
      `&zoom=${map_zoom}`,
      `&size=${map_width}x${map_height}`,
      `&markers=${coords.lat},${coords.lng}`,
      `&maptype=terrain&key=${process.env.GOOGLE_MAPS_KEY}`
    ]
    urlToParams(url.join(''))
    .then(params => {
      console.log(params)
      resolve(params)
    })
    .catch(err => reject(err))
  })
}
