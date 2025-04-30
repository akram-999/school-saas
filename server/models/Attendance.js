const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  person: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'personType',
    required: true
  },
  personType: {
    type: String,
    required: true,
    enum: ['Student', 'Teacher']
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  date: {
    type: Date,
    required: [true, 'Please add a date'],
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Late', 'Excused'],
    required: [true, 'Please add attendance status'],
    default: 'Present'
  },
  remarks: {
    type: String
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Prevent user from submitting more than one attendance record per day for the same person and class
AttendanceSchema.index({ person: 1, personType: 1, class: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema); 