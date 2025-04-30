const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a subject name'],
    trim: true,
    unique: true
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
  schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
  },
});

module.exports = mongoose.model('Subject', SubjectSchema); 