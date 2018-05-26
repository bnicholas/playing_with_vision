const fetch = require('node-fetch')
const mime = require('mime-to-extensions')

module.exports = function(url) {
  return new Promise((resolve, reject) => {
    fetch(url)
    .then(res => {
      let chunks = []
      let content_type = res.headers.get('Content-Type')
      let ext = `.${mime.extension(content_type)}`

      const image_params = {
        buffer: '',
        content_type: content_type,
        filename: new Date().getTime() + ext,
      }

      res.body.on('data', chunk => {
        chunks.push(Buffer.from(chunk, 'binary'))
      })

      res.body.on('end', () => {
        image_params.buffer = Buffer.concat(chunks)
        resolve(image_params)
      })
    })
    .catch(error => reject(error))

  })
}
