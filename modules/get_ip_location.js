const iplocation = require('iplocation')
const providers = [`http://api.ipstack.com/*?access_key=${process.env.GEO_IP_KEY}`]

// https://domain-name.tld/?ip=*&format=json

module.exports = function(ip) {
  return new Promise((resolve, reject) => {
    iplocation(ip, providers)
    .then(res => {
      let location = {lat: res.latitude, lng: res.longitude}
      resolve(location)
    })
    .catch(err => {
      reject(err)
    })
  })
}
