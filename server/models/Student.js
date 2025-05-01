const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Please add a first name'],
    trim: true,
    maxlength: [50, 'First name cannot be more than 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Please add a last name'],
    trim: true,
    maxlength: [50, 'Last name cannot be more than 50 characters']
  },
  firstName_ar: {
    type: String,
    required: [true, 'Please add a first name'],
    trim: true,
    maxlength: [50, 'First name cannot be more than 50 characters']
  },
  lastName_ar: {
    type: String,
    required: [true, 'Please add a last name'],
    trim: true,
    maxlength: [50, 'Last name cannot be more than 50 characters']
  },
  pupilCode: {
    type: String,
    required: [true, 'Please add a pupil code'],
    unique: true,
    trim: true
  },
  palaceOfBirth: {
    type: String,
    required: [true, 'Please add a palace of birth'],
  },
  palaceOfBirth_ar: {
    type: String,
    required: [true, 'Please add a palace of birth'],
  },
  cin: {
    type: String,
    // required: [false, 'Please add a cin'],
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  nationality: {
    type: String,
    required: [true, 'Please add a nationality'],
  },
  phone: {
    type: String,
    maxlength: [20, 'Phone number cannot be longer than 20 characters']
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other']
  },
  dateOfBirth: {
    type: Date
  },
  address: {
    type: String
  },
  address_ar: {
    type: String
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref:'Class'
  },
  schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  transportationId: {
     type: mongoose.Schema.Types.ObjectId, 
     ref: 'Transportation' },
}, { timestamps: true });

module.exports = mongoose.model('Student', StudentSchema); 