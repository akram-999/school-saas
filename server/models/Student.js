const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    firstName_ar: {
        type: String,
        required: [true, 'Please add a first name'],
        trim: true,
        maxlength: [50, 'First name cannot be more than 50 characters']
    },
    lastName_ar: {
        type: String,
        required: [true, 'Please add a last name'],
        trim: true,
        maxlength: [50, 'Last name cannot be more than 50 characters']
    },
    pupilCode: {
        type: String,
        required: [true, 'Please add a pupil code'],
        unique: true,
        trim: true
    },
    palaceOfBirth: {
        type: String,
        required: [true, 'Please add a palace of birth'],
    },
    palaceOfBirth_ar: {
        type: String,
        required: [true, 'Please add a palace of birth'],
    },
    cin: {
        type: String,
        // required: [false, 'Please add a cin'],
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
    nationality: {
        type: String,
        required: [true, 'Please add a nationality'],
    },
    phoneNumber: {
        type: String,
        match: [/^[0-9]{10,15}$/, 'Please enter a valid phone number']
    },
    gender: {
        type: String,
        enum: ['Male', 'Female']
    },
    dateOfBirth: {
        type: Date,
        required: true,
    },
    address: {
        type: String,
    },
    address_ar: {
        type: String
    },
    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'Class'
    },
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    },
    transportationId: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Transportation' },
    image: {
        type: String,
    },
    // Activities the student is registered for
    activities: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Activity'
    }],
    rol: {
        type: String,
        default: 'student'
    },
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema); 