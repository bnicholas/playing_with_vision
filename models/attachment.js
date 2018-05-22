const mongoose = require('mongoose')

const gridfs = require('mongoose-gridfs')({
  collection:'photos',
  model:'Attachment',
  mongooseConnection: mongoose.connection
})

const AttachmentSchema = gridfs.schema
const Attachment = mongoose.model('Attachment', AttachmentSchema)

module.exports = Attachment

// Attachment.create = function(params) {
//   return new Promise((resolve, reject) => {
//     if (!params.filename || !params.content_type) {
//       reject(new Error('expected {filename: String, content_type: String}'))
//     }
//     let writeStream = Attachment.createWriteStream({
//       filename: params.filename,
//       content_type: params.content_type,
//       root: 'photos'
//     })
//     bufferToStream(params.buffer).pipe(writeStream)
//     writeStream.on('close', file => resolve(file))
//     writeStream.on('error', error => reject(error))
//   })
// }

// const bufferToStream = require('buffer-to-stream')
