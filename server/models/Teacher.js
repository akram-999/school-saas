const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
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
        match: [/^[0-9]{10,15}$/, 'Please enter a valid phone number']
    },
    address: {
        type: String,
    },
    dateOfBirth: {
        type: Date,
    },
    specialization: {
        type: String,
        required: true,
    },
    biography: {
        type: String,
    },
    // Reference to the school this teacher belongs to
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true
    },
    // Classes/Subjects the teacher is assigned to
    subjects: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject'
    }],
    image: {
        type: String,
    },
    rol: {
        type: String,
        default: 'teacher'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Teacher', teacherSchema); 