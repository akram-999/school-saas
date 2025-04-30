const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  userType: { 
    type: String, 
    enum: ['Student', 'Teacher'], 
    required: true },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true, 
    refPath: 'userType' },
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
AttendanceSchema.index({ userId: 1, class: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema); 