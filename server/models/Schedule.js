const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  day: { 
    type: String, 
    enum: [ 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', ],
    required: true 
  },
  periods: [
    {
      startTime: { type: String, required: true },   // e.g., "08:00"
      endTime: { type: String, required: true },     // e.g., "08:45"
      subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
      teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
      room: { type: String }                         // Optional: room number or location
    }
  ]
}, { timestamps: true });

export default mongoose.model('Schedule', scheduleSchema);
