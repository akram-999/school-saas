import mongoose from 'mongoose';

const parentSchema = new mongoose.Schema({
  name: String,
  name_ar: String,
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  phone: String,
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
}, { timestamps: true });

export default mongoose.model('Parent', parentSchema);
