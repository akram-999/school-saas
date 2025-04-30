const mongoose = require('mongoose');

const TeacherSchema = new mongoose.Schema({
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
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number'],
    maxlength: [20, 'Phone number cannot be longer than 20 characters']
  },
  subject: {
    type: String,
    required: [true, 'Please add a subject']
  },
  qualification: {
    type: String,
    required: [true, 'Please add qualification']
  },
  experience: {
    type: Number,
    required: [true, 'Please add years of experience']
  },
  address: {
    type: String
  },
  joinDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Active', 'On Leave', 'Resigned'],
    default: 'Active'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  classes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  }],
  schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
  },
}, { timestamps: true });

module.exports = mongoose.model('Teacher', TeacherSchema); 