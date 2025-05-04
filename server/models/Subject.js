const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    code: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: true,
    },
    // Reference to the school this subject belongs to
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true
    },
    // Teachers assigned to this subject
    teachers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher'
    }],
    // Cycle
    cycle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cycle'
    },
    // Number of credits/hours
    credits: {
        type: Number,
        required: true,
        min: 1
    },
}, { timestamps: true });

module.exports = mongoose.model('Subject', subjectSchema); 