const accountSid = process.env.TWILIO_SID
const authToken = process.env.TWILIO_TOKEN
const client = require('twilio')(accountSid, authToken)

// GIVE IT A PHOTO RECORD AND A PHONE NUMBER
// AND IT WILL SEND A FORMATED SMS MESSAGE
module.exports = function(photo, phone) {
  return new Promise((resolve, reject) => {
    let message = []
    message.push('Photo successfully saved.')
    message.push(`Labels: ${photo.scores.join('\n')}`)
    message.push(`Click the link below to record geodata`)
    message.push(`http://ford-vision.herokuapp.com/geodata/${photo._id}`)
    let send = message.join('\n')

    console.log("=================SMS=======================")
    console.log(send)
    console.log("===========================================")

    client.messages
    .create({
       body: send,
       from: `+1${process.env.TWILIO_PHONE}`,
       to: phone
     })
    .then(response => {
      // console.log(send)
      resolve(response.sid)
    })
    .done()
  })

}
