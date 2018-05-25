// process_upload.js
const createAttachment = require('./create_attachment')
const getExifData = require('./get_exif_data')
const getVisionData = require('./get_vision_data')
const filterLabelConfidence = require('./filter_label_confidence')
const processThumbnail = require('./process_thumbnail')
const createPhoto = require('./create_photo')
const gpsToCoords = require('./exif_to_coords')

module.exports = async function(params) {
  if (!params.buffer) reject(new Error('params.buffer was not supplied'))
  if (!params.buffer instanceof Buffer) reject(new Error('params.buffer is not a Buffer'))
  let attachment = await createAttachment(params)
  let exif = await getExifData(params.buffer)
  let vision = await getVisionData(params.buffer)
  let labels = await filterLabelConfidence(vision.labels)
  let thumbnail = await processThumbnail(params.buffer)
  let props = {
    phone: params.phone,
    labels_raw: labels,
    exif: exif,
    colors: vision.props.dominantColors.colors,
    crop: vision.crop.cropHints,
    thumbnail: thumbnail
  }
  if (exif && exif.gps) {
    let coords = gpsToCoords(exif.gps)
    props.exifGeo = coords
  }
  console.log('props.exifGeo', props.exifGeo)
  let photo = await createPhoto(props, attachment)
  return photo
}
