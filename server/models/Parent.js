import mongoose from 'mongoose';

const parentSchema = new mongoose.Schema({
  firstName: {
    type:String,
    required:true,
  },
  firstName_ar: {
    type:String,
    required:true,
  },
  lastName:{
    type:String,
    required:true,
  },
  lastName_ar:{
    type:String,
    required:true,
  },
  cin:{
    type:String,
    required:true,
  },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  phone: String,
  address:{
    type:String,
    required:true,
  },
  rol:{
    type:String,
    default:'parent'
  },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
}, { timestamps: true });

export default mongoose.model('Parent', parentSchema);
