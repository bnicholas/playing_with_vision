// process_upload.js

const getExifData = require('./get_exif_data')
const getVisionData = require('./get_vision_data')
const filterLabelConfidence = require('./filter_label_confidence')
const processThumbnail = require('./process_thumbnail')
const createPhoto = require('./create_photo')
const gpsToCoords = require('./exif_to_coords')

module.exports = async function(params) {
  if (!params.buffer) reject(new Error('params.buffer was not supplied'))
  if (!params.buffer instanceof Buffer) reject(new Error('params.buffer is not a Buffer'))
  let img_large = {
    buffer: params.buffer,
    content_type: params.content_type,
    filename: params.filename,
  }
  let exif = await getExifData(params.buffer)
  let vision = await getVisionData(params.buffer)
  let labels = await filterLabelConfidence(vision.labels)
  let thumbnail = await processThumbnail(params)
  let props = {
    colors: vision.props.dominantColors.colors,
    crop: vision.crop.cropHints,
    exif: exif,
    img_large: img_large,
    img_small: thumbnail,
    labels_raw: labels,
    phone: params.phone,
  }
  if (exif && exif.gps) {
    let coords = gpsToCoords(exif.gps)
    props.coords = coords
    props.geo_from = 'exif'
    console.log("EXIF", props)
  }
  let photo = await createPhoto(props)
  return photo
}
