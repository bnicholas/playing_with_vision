// Store multipart form data to gridFS
// as seen ... app.post('/api/upload', uploader.single('photo'), function (req, res) {
const path = require('path')
const multer = require('multer')
const GridFsStorage = require('multer-gridfs-storage')
const storage = new GridFsStorage({
  url: process.env.MONGODB_URI,
  file: (req, file) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
      return {
        bucketName: 'photos',
        filename: Date.now() + path.extname(file.originalname)
      };
    } else {
      return null
    }
  }
})
module.exports = multer({ storage })
