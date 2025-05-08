const mongoose = require('mongoose');

const parentSchema = new mongoose.Schema({
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
    cin: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: true,
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
    occupation: {
        type: String,
    },
    // Children associated with this parent
    children: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
    }],
    // Reference to the school
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true
    },
    relationToStudent: {
        type: String,
        enum: ['father', 'mother', 'guardian', 'other'],
        required: true
    },
    image: {
        type: String,
    },
    rol: {
        type: String,
        default: 'parent'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Parent', parentSchema);
