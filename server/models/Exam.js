const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  title: { type: String, required: true },              // e.g., "Midterm Exam"
  title_ar: { type: String },                           // Arabic title (optional)
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  cycleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cycle' },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  examDate: { type: Date, required: true },
  duration: { type: Number, required: true },                           // in minutes
  totalMarks: { type: Number, required: true },
  passingMarks: { type: Number, required: true },
  description: { type: String, required: true },
  results: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    marks: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['pass', 'fail'],
      required: true
    },
    remarks: {
      type: String
    }
  }],
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Exam', examSchema);
