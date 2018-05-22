// remove_orphaned_attachments.js

const Attachment = require('../models/attachment')
const Photo = require('../models/photo')
const deleteFileById = require('./delete_attachment_by_id')
const _difference = require('lodash/difference')

module.exports = async function() {
  try {
    let toRemove = await Photo.distinct('fileID')
    let attachmentIDs = await Attachment.files.distinct('_id')
    let removeFrom = attachmentIDs.map(item => `${item}`)
    let idsToDelete = _difference(removeFrom, toRemove)
    for (let id of idsToDelete) {
      await deleteFileById(id)
    }
    return `remove ${idsToDelete.length} photo files`
  } catch (err) {
    return err
  }
}

// app.get('/api/cleanup', (req, res) => {
//   removeOrphanedFiles()
//   .then(response => res.send(response))
//   .catch(error => res.send('seems there was not a cleanup on isle 4'))
// })
