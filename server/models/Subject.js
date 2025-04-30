const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a subject name'],
    trim: true,
    unique: true
  },
  code: {
    type: String,
    required: [true, 'Please add a subject code'],
    unique: true,
    trim: true
  },
  description: {
    type: String
  },
  teachers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher'
  }],
  classes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  }],
  curriculum: {
    type: String
  },
  credits: {
    type: Number,
    default: 1
  },
  isElective: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
  },
});

module.exports = mongoose.model('Subject', SubjectSchema); 