import mongoose from 'mongoose';

const examSchema = new mongoose.Schema({
  title: { type: String, required: true },              // e.g., "Midterm Exam"
  title_ar: { type: String },                           // Arabic title (optional)
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  cycleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cycle' },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  date: { type: Date, required: true },
  duration: { type: Number },                           // in minutes
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
}, { timestamps: true });

export default mongoose.model('Exam', examSchema);
