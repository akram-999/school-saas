const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    address_ar: {
        type: String,
    },
    phoneNumber: {
        type: String,
        required: true,
    },
    rol: {
        type: String,
        default: 'school' 
    },
    email: {
        type: String,
        required: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: true,
    },
    website: {
        type: String,
    },
    image: {
        type: String,
    },
}, { timestamps: true });

module.exports = mongoose.model('School', schoolSchema);
