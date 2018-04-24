const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI);

// module exports

// String
// Number
// Date
// Buffer
// Boolean
// Mixed
// ObjectId
// Array

// file:       String,
// labels:     Object,
// text:       Object,
// faces:      Object,
// landmarks:  Object,
// logos:      Object,
// properties: Object,
// web:        Object

const Photo = mongoose.model('Images', {
  image:    String,
  fileName: String,
  labels:   Array,
});
// const kitty = new Cat({ name: 'Zildjian' });
// kitty.save().then(() => console.log('meow'));
