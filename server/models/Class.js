const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    grade: {
        type: String,
        required: true,
    },
    section: {
        type: String,
        required: true,
    },
    capacity: {
        type: Number,
        required: true,
        min: [1, 'Capacity must be at least 1']
    },
    // Reference to the school this class belongs to
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true
    },
    // Assigned teacher (class teacher/homeroom teacher)
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher'
    },
    // Students enrolled in this class
    students: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
    }],
    // Subjects taught in this class
    subjects: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject'
    }],
    // Associated cycle
    cycle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cycle'
    },
    academicYear: {
        type: String,
        required: true
    },
    room: {
        type: String
    },
    schedule: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Class', classSchema); 