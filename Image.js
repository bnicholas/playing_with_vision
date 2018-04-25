const mongoose = require('mongoose')
mongoose.connect(process.env.MONGODB_URI)

function getImagesIndex() {
  // get the entire Images collection
  // return the data JSON.stringified
}

function getImage(id) {
  // find the record
  // retrun JSON data
}

const ImageModel = mongoose.model('Images', {
  image:    String,
  fileName: String,
  labels:   Array,
})

// I'm not sure this needs to be a class.
class Image {
  constructor() {

  }

  createImage(record) {
    // record.save().then(() => console.log('saved'));
  }

  fetchVisionData(imgURI) {
    // send the request then ...
    // const testImg = new ImageModel({ fileName: 'test2.jpg' });
    // add the image to the model then save ...
    // return testImg
  }
}

// export default function () { ··· }


// NOTES
// -----------------------------------------------------------------------
// String, Number, Date, Buffer, Boolean, Mixed, ObjectId, Array
// file, labels, text, faces, landmarks, logos, properties, web
