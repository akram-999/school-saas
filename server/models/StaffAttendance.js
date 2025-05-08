const mongoose = require('mongoose');

const staffAttendanceSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true
    },
    // Records of staff attendance
    records: [{
        // Staff member can be a teacher, guard, driver, or accompaniment
        staffId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        staffType: {
            type: String,
            enum: ['teacher', 'guard', 'driver', 'accompaniment'],
            required: true
        },
        status: {
            type: String,
            enum: ['present', 'absent', 'late', 'excused'],
            required: true
        },
        checkInTime: {
            type: String,
            required: function() {
                return this.status === 'present' || this.status === 'late';
            }
        },
        checkOutTime: {
            type: String
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
        },
        totalTeachers: {
            type: Number,
            default: 0
        },
        totalGuards: {
            type: Number,
            default: 0
        },
        totalDrivers: {
            type: Number,
            default: 0
        },
        totalAccompaniments: {
            type: Number,
            default: 0
        }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    createdByRole: {
        type: String,
        enum: ['school', 'guard'],
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('StaffAttendance', staffAttendanceSchema); 