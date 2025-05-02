const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
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
    location: {
        type: String,
        required: true,
    },
    capacity: {
        type: Number,
        required: true,
        min: [1, 'Capacity must be at least 1']
    },
    price: {
        type: Number,
        default: 0,
        min: [0, 'Price cannot be negative']
    },
    category: {
        type: String,
        enum: ['sports', 'academic', 'art', 'music', 'other'],
        default: 'other'
    },
    status: {
        type: String,
        required: true,
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
    },
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
    },
}, { timestamps: true });

module.exports = mongoose.model('Activity', activitySchema);
