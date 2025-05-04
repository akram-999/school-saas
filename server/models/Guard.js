const mongoose = require('mongoose');


const guardSchema = new mongoose.Schema({
    firstName: {
      type: String,
      required: true,
    },
    firstName_ar: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    lastName_ar: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phoneNumber: {
      type: String,
      required: true,
      
    },
    address: {
      type: String,
      required: true,
    },
    cin:{
      type:String,
      required:true
    },
    address_ar: {
    type: String,
    required: true,
    },
    rol:{
        type:String,
        default:'guard'
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true
    },
    dateOfBirth: {
      type: Date,
      required: true
    },
    
}, { timestamps: true })

const Guard = mongoose.model('Guard', guardSchema);

module.exports = Guard;