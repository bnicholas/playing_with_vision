// delete_attachment_by_id.js

const Attachment = require('../models/attachment')

// Attachment.delete(id)

module.exports = function(fileID) {
  return new Promise((resolve, reject) => {
    Attachment.unlinkById(fileID, function (err, removed) {
      if (err) reject(err)
      else resolve(removed)
    })
  })
}
