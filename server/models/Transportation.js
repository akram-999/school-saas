const mongoose = require('mongoose');

const transportationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    unique: true
  },
  busNumber: {
    type: String,
    required: [true, 'Please add a number'],
    unique: true
  },
  type: {
    type: String,
    required: [true, 'Please add a type']
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
    enum: ['active', 'maintenance', 'inactive'],
    default: 'active'
  },
  notes: {
    type: String
  },  
  school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
  },
  student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
  },
  
}, { timestamps: true })

module.exports = mongoose.model('Transportation', transportationSchema);
