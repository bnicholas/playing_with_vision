const accountSid = process.env.TWILIO_SID
const authToken = process.env.TWILIO_TOKEN
const client = require('twilio')(accountSid, authToken)

// GIVE IT A PHOTO RECORD AND A PHONE NUMBER
// AND IT WILL SEND A FORMATED SMS MESSAGE
const send = function(phone, message) {
  return new Promise((resolve, reject) => {
    client.messages
    .create({ body: message, from: `+1${process.env.TWILIO_PHONE}`, to: phone })
    .then(response => resolve(response.sid))
    .catch(error => reject(error))
    .done()
  })
}

const send_labels = function(photo, phone) {
  return new Promise((resolve, reject) => {
    let message = `Labels: \n ${photo.scores.join('\n')}`
    send(phone, message)
    .then(res => resolve(res))
    .catch(err => reject(err))
  })
}

const send_geolink = function(photo, phone) {
  return new Promise((resolve, reject) => {
    let message = `http://ford-vision.herokuapp.com/geodata/${photo._id}`
    send(phone, message)
    .then(res => resolve(res))
    .catch(err => reject(err))
  })
}

const send_saved = function(photo, phone) {
  return new Promise((resolve, reject) => {
    send(phone, "Photo Received")
    .then(res => resolve(res))
    .catch(err => reject(err))
  })
}

module.exports = {send_labels, send_geolink, send_saved}
