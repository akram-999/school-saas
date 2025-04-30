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
  driverId: {
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
  studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
  },
  
})

module.exports = mongoose.model('Transportation', transportationSchema);
