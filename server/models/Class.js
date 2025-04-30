const mongoose = require('mongoose');

const ClassSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a class name'],
    trim: true,
    unique: true
  },
  cycleId: {
    type:  mongoose.Schema.Types.ObjectId,
    ref: 'Cycle'
  },
  academicYear: {
    type: String,
    required: [true, 'Please add academic year']
  },
  schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
  },
  classTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher'
  },
  subjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  }],
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  schedule: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },
    periods: [{
      subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject'
      },
      teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher'
      },
      startTime: String,
      endTime: String
    }]
  }],
  room: {
    type: String
  },
  maxCapacity: {
    type: Number,
    default: 40
  },
}, { timestamps: true });

module.exports = mongoose.model('Class', ClassSchema); 