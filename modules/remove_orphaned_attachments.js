// remove_orphaned_attachments.js

const Attachment = require('../models/attachment')
const Photo = require('../models/photo')
const deleteAttachmentById = require('./delete_attachment_by_id')
const _difference = require('lodash/difference')

module.exports = async function() {
  try {
    let toRemove = await Photo.distinct('fileID')
    let attachmentIDs = await Attachment.files.distinct('_id')
    let removeFrom = attachmentIDs.map(item => `${item}`)
    let idsToDelete = _difference(removeFrom, toRemove)
    for (let id of idsToDelete) {
      await deleteAttachmentById(id)
    }
    return `remove ${idsToDelete.length} photo files`
  } catch (err) {
    return err
  }
}
