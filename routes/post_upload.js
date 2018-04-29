app.post('/api/upload', uploader.single('photo'), function (req, res) {
  let photoData = {}
  gridFsIdToBuffer(req.file.id)
  .then(buffer => {
    getExifData(buffer)
    .then(exif => photoData.exif = exif)
    .catch(empty => photoData.exif = empty)
    getVisionData(buffer)
    .then(data => {
      filterLabelConfidence(data)
      .then(labels => {
        photoData.labels = labels
        createPhoto(photoData, req)
        .then(doc => res.json(doc))
        .catch(err => res.send({promise: 'createPhoto', error: err}))
      })
      .catch(err => photoData.labels = [])
    })
    .catch(err => res.send({promise: 'getVisionData', error: err}))
  })
  .catch(err => res.send({promise: 'gridFsIdToBuffer', error: err}))
})
