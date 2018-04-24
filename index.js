(require('dotenv').config({ silent: process.env.NODE_ENV === 'production' }))
const express = require('express')
const app = express()
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI);

const Photo = mongoose.model('Photos', {
  image:    String,
  fileName: String,
  labels:   Array,
});

const testImg = new Photo({ fileName: 'test2.jpg' });

testImg.save().then(() => console.log('saved'));

// respond with "hello world" when a GET request is made to the homepage
app.get('/', function (req, res) {
  res.send('hello world')
})


app.listen(process.env.PORT || 5000, () => console.log('Example app listening on port 3000!'))
