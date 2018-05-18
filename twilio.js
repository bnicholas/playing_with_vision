const accountSid = process.env.TWILIO_SID
const authToken = rocess.env.TWILIO_TOKEN
const client = require('twilio')(accountSid, authToken)

// SEND A GEO URL TO VISIT

// RESPOND WITH THE PHOTO LABELS

module.exports = function(photo) {
  let labels = photo.labels.join(' , ')
  let url = `${host}/geodata/${photo._id}`
}
