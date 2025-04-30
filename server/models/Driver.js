const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Please add a first name'],
    trim: true,
    unique: true
  },
  lastName: {
    type: String,
    required: [true, 'Please add a last name'],
    trim: true,
    unique: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\S+@\S+\.\S+$/,
      'Please add a valid email address'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number'],
    unique: true,
    match: [
      /^\d{10}$/,
      'Please add a valid phone number'
    ]
  },
  address: {
    type: String,
    required: [true, 'Please add an address']
  },
  schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
  },
}, { timestamps: true })

module.exports = mongoose.model('Driver', driverSchema);
