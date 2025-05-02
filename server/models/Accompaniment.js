const mongoose = require('mongoose');


const accompanimentSchema = new mongoose.Schema({
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
      match: [/^[0-9]{10,15}$/, 'Please enter a valid phone number']
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
    // Reference to the school this driver works for
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true
    },
    rol:{
        type:String,
        default:'accompaniment'
    }
});

module.exports = mongoose.model('Accompaniment', accompanimentSchema);
