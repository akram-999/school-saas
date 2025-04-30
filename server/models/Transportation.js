const mongoose = require('mongoose');

const transportationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    unique: true
  },
  number: {
    type: String,
    required: [true, 'Please add a number'],
    unique: true
  },
  type: {
    type: String,
    required: [true, 'Please add a type']
  },
  route: {
    type: String,
    required: [true, 'Please add a route']
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver'
  },
  capacity: {
    type: Number,
    required: [true, 'Please add a capacity']
  },
  status: {
    type: String,
    required: [true, 'Please add a status']
  },
  schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
  },
})

module.exports = mongoose.model('Transportation', transportationSchema);
