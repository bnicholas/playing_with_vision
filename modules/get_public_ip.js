const ip = require('ip')
const publicIp = require('public-ip')
const requestIp = require('request-ip')

module.exports = function(req) {
  return new Promise((resolve, reject) => {
    if (!req) reject(new Error('no request object was provided'))
    let reqIP = requestIp.getClientIp(req)
    if (ip.isPrivate(reqIP)) resolve(publicIp.v4())
    else resolve(reqIP)
  })
}
