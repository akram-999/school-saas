const mongoose = require('mongoose');

const CycleSchema = new mongoose.Schema({
  
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  name: {
    type: String,
    enum: ['Maternelle', 'Primaire', 'College', 'Lycee'],
    required: true
  },
  academicYear: {
    type: String,
    required: [true, 'Please add academic year']
  },
  remarks: {
    type: String
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



module.exports = mongoose.model('Grade', CycleSchema); 
