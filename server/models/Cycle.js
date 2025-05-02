const mongoose = require('mongoose');

const cycleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
    // Reference to the school this cycle belongs to
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true
    },
    // Type of cycle (semester, quarter, trimester, etc.)
    type: {
        type: String,
        enum: ['semester', 'trimester', 'quarter', 'annual', 'other'],
        required: true
    },
    // Classes associated with this cycle
    classes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class'
    }],
    academicYear: {
        type: String,
        required: true
    },
    gradePostingStartDate: {
        type: Date
    },
    gradePostingEndDate: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Cycle', cycleSchema); 
