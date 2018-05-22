// process_upload.js
const paramsToGridFs = require('./params_to_gridfs')
const getExifData = require('./get_exif_data')
const getVisionData = require('./get_vision_data')
const filterLabelConfidence = require('./label_confidence')
const processThumbnail = require('./process_thumbnail')
const createPhoto = require('./create_photo')

module.exports = async function(params) {
  if (!params.buffer) reject(new Error('params.buffer was not supplied'))
  if (!params.buffer instanceof Buffer) reject(new Error('params.buffer is not a Buffer'))
  // let file = await Attachment.create(params)
  let gfsPhoto = await paramsToGridFs(params).catch(err => console.error(err))
  let exif = await getExifData(params.buffer).catch(err => console.error(err))
  let vision = await getVisionData(params.buffer).catch(err => console.error(err))
  let labels = await filterLabelConfidence(vision.labels).catch(err => console.error(err))
  let thumbnail = await processThumbnail(params.buffer).catch(err => console.error(err) )
  let props = {
    phone: params.phone,
    labels_raw: labels,
    exif: exif,
    colors: vision.props.dominantColors.colors,
    crop: vision.crop.cropHints,
    thumbnail: thumbnail
  }
  // console.log('thumbnail', thumbnail)
  let photo = await createPhoto(props, gfsPhoto).catch(err => console.error(err))
  // sendSMS(photo, process.env.MY_PHONE)
  return photo
}
