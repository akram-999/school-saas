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
    address_ar: {
        type: String,
    },
    dateOfBirth: {
        type: Date,
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
        required: [true, 'Please add a cin'],
    },
    nationality: {
        type: String,
        required: [true, 'Please add a nationality'],
    },
    specialization: {
        type: String,
        required: true,
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
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    },
}, { timestamps: true });

module.exports = mongoose.model('Teacher', teacherSchema); 