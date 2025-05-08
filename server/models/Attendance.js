const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
    },
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true
    },
    // Records of student attendance
    records: [{
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
            required: true
        },
        status: {
            type: String,
            enum: ['present', 'absent', 'late', 'excused'],
            required: true
        },
        remarks: {
            type: String
        }
    }],
    // Statistics summary
    summary: {
        present: {
            type: Number,
            default: 0
        },
        absent: {
            type: Number,
            default: 0
        },
        late: {
            type: Number,
            default: 0
        },
        excused: {
            type: Number,
            default: 0
        }
    }
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema); 