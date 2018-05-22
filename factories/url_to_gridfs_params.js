// url_to_gridfs_params.js

const fetch = require('node-fetch')

module.exports = function(url) {
  return new Promise((resolve, reject) => {
    fetch(url)
    .then(res => {
      let chunks = []
      let ext = '.jpg'
      if (res.headers.get('Content-Type') === 'image/jpeg') ext = '.jpg'
      const gridParams = {
        content_type: res.headers.get('Content-Type'),
        filename: new Date().getTime() + ext,
        buffer: ''
      }
      res.body.on('data', chunk => {
        chunks.push(Buffer.from(chunk, 'binary'))
      })
      res.body.on('end', () => {
        gridParams.buffer = Buffer.concat(chunks)
        resolve(gridParams)
      })
    })
    .catch(error => reject(error))
  })
}
