// params_to_gridfs.js

const Attachment = require('../models/attachment')
const bufferToStream = require('buffer-to-stream')

// TAKE PARAMS {filename: ... , content_type: ... buffer: ...}
// WRITE IT TO THE GRID FILESYSTEM AND RESOLVE WITH THE RECORD
module.exports = function(params) {
  return new Promise((resolve, reject) => {
    if (!params.filename || !params.content_type) {
      reject(new Error('expected {filename: String, content_type: String}'))
    }
    const details = {
      filename: params.filename,
      contentType: params.content_type
    }
    const stream = bufferToStream(params.buffer)
    Attachment.write(details, stream, (error, attachment) => {
      if (error) reject(error)
      resolve(attachment)
    })
  })
}
