const router = require("express").Router();
const StaffAttendance = require("../models/StaffAttendance");
const Teacher = require("../models/Teacher");
const Guard = require("../models/Guard");
const Driver = require("../models/Driver");
const Accompaniment = require("../models/Accompaniment");
const { verifySchool, verifyGuard, verifyGuardOrSchool } = require("../config/jwt");

// Helper function to get school ID based on user role
const getSchoolId = async (req) => {
    if (req.user.rol === 'school') {
        return req.user.id;
    } else if (req.user.rol === 'guard') {
        const guard = await Guard.findById(req.user.id);
        if (!guard) {
            throw new Error("Guard not found");
        }
        return guard.school;
    }
    return null;
};

// Create staff attendance record (School or Guard)
router.post("/staff-attendance", verifyGuardOrSchool, async (req, res) => {
    try {
        const { date, records } = req.body;
        
        if (!date || !records || !Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ message: "Date and records are required" });
        }
        
        // Get the school ID based on user role
        const schoolId = await getSchoolId(req);
        if (!schoolId) {
            return res.status(404).json({ message: "School not found" });
        }
        
        // Process records and calculate summary
        const summary = {
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            totalTeachers: 0,
            totalGuards: 0,
            totalDrivers: 0,
            totalAccompaniments: 0
        };
        
        // Validate each record
        for (const record of records) {
            if (!record.staffId || !record.staffType || !record.status) {
                return res.status(400).json({ message: "Each record must have staffId, staffType, and status" });
            }
            
            // Validate the staff member exists and belongs to this school
            let staffExists = false;
            
            switch (record.staffType) {
                case 'teacher':
                    const teacher = await Teacher.findOne({ _id: record.staffId, school: schoolId });
                    if (teacher) {
                        staffExists = true;
                        summary.totalTeachers++;
                    }
                    break;
                case 'guard':
                    const guard = await Guard.findOne({ _id: record.staffId, school: schoolId });
                    if (guard) {
                        staffExists = true;
                        summary.totalGuards++;
                    }
                    break;
                case 'driver':
                    const driver = await Driver.findOne({ _id: record.staffId, school: schoolId });
                    if (driver) {
                        staffExists = true;
                        summary.totalDrivers++;
                    }
                    break;
                case 'accompaniment':
                    const accompaniment = await Accompaniment.findOne({ _id: record.staffId, school: schoolId });
                    if (accompaniment) {
                        staffExists = true;
                        summary.totalAccompaniments++;
                    }
                    break;
                default:
                    return res.status(400).json({ message: "Invalid staff type" });
            }
            
            if (!staffExists) {
                return res.status(404).json({ message: `Staff member with ID ${record.staffId} not found or does not belong to this school` });
            }
            
            // Validate check-in time for present or late status
            if ((record.status === 'present' || record.status === 'late') && !record.checkInTime) {
                return res.status(400).json({ message: "Check-in time is required for present or late status" });
            }
            
            // Update summary
            summary[record.status]++;
        }
        
        // Create new attendance record
        const newAttendance = new StaffAttendance({
            date: new Date(date),
            school: schoolId,
            records,
            summary,
            createdBy: req.user.id,
            createdByRole: req.user.rol
        });
        
        const attendance = await newAttendance.save();
        
        res.status(201).json(attendance);
    } catch (error) {
        res.status(500).json({ message: "Error creating staff attendance record", error: error.message });
    }
});

// Get all staff attendance records (School or Guard)
router.get("/staff-attendance", verifyGuardOrSchool, async (req, res) => {
    try {
        // Get the school ID based on user role
        const schoolId = await getSchoolId(req);
        if (!schoolId) {
            return res.status(404).json({ message: "School not found" });
        }
        
        const query = { school: schoolId };
        
        // Add date filtering if provided
        if (req.query.startDate && req.query.endDate) {
            query.date = {
                $gte: new Date(req.query.startDate),
                $lte: new Date(req.query.endDate)
            };
        } else if (req.query.startDate) {
            query.date = { $gte: new Date(req.query.startDate) };
        } else if (req.query.endDate) {
            query.date = { $lte: new Date(req.query.endDate) };
        } else if (req.query.date) {
            const date = new Date(req.query.date);
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);
            
            query.date = {
                $gte: date,
                $lt: nextDay
            };
        }
        
        // Add staff type filtering if provided
        if (req.query.staffType) {
            query['records.staffType'] = req.query.staffType;
        }
        
        const attendanceRecords = await StaffAttendance.find(query)
            .sort({ date: -1 });
            
        res.status(200).json(attendanceRecords);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving staff attendance records", error: error.message });
    }
});

// Get staff attendance by date (School or Guard)
router.get("/staff-attendance/date/:date", verifyGuardOrSchool, async (req, res) => {
    try {
        const date = new Date(req.params.date);
        
        if (isNaN(date.getTime())) {
            return res.status(400).json({ message: "Invalid date format" });
        }
        
        // Get the school ID based on user role
        const schoolId = await getSchoolId(req);
        if (!schoolId) {
            return res.status(404).json({ message: "School not found" });
        }
        
        // Set start and end of the day
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        const attendanceRecord = await StaffAttendance.findOne({
            school: schoolId,
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });
        
        if (!attendanceRecord) {
            return res.status(404).json({ message: "No attendance record found for this date" });
        }
        
        // Process records to include staff details
        const populatedRecords = [];
        
        for (const record of attendanceRecord.records) {
            let staffDetails = null;
            
            switch (record.staffType) {
                case 'teacher':
                    staffDetails = await Teacher.findById(record.staffId).select("firstName lastName email");
                    break;
                case 'guard':
                    staffDetails = await Guard.findById(record.staffId).select("firstName lastName email");
                    break;
                case 'driver':
                    staffDetails = await Driver.findById(record.staffId).select("firstName lastName email");
                    break;
                case 'accompaniment':
                    staffDetails = await Accompaniment.findById(record.staffId).select("firstName lastName email");
                    break;
            }
            
            populatedRecords.push({
                ...record.toObject(),
                staffDetails
            });
        }
        
        const result = {
            ...attendanceRecord.toObject(),
            records: populatedRecords
        };
        
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving staff attendance record", error: error.message });
    }
});

// Get attendance for a specific staff member (School or Guard)
router.get("/staff-attendance/staff/:staffId", verifyGuardOrSchool, async (req, res) => {
    try {
        const { staffId } = req.params;
        const { staffType } = req.query;
        
        if (!staffType || !['teacher', 'guard', 'driver', 'accompaniment'].includes(staffType)) {
            return res.status(400).json({ message: "Valid staff type is required" });
        }
        
        // Get the school ID based on user role
        const schoolId = await getSchoolId(req);
        if (!schoolId) {
            return res.status(404).json({ message: "School not found" });
        }
        
        // Verify staff member exists and belongs to this school
        let staffExists = false;
        
        switch (staffType) {
            case 'teacher':
                const teacher = await Teacher.findOne({ _id: staffId, school: schoolId });
                if (teacher) staffExists = true;
                break;
            case 'guard':
                const guard = await Guard.findOne({ _id: staffId, school: schoolId });
                if (guard) staffExists = true;
                break;
            case 'driver':
                const driver = await Driver.findOne({ _id: staffId, school: schoolId });
                if (driver) staffExists = true;
                break;
            case 'accompaniment':
                const accompaniment = await Accompaniment.findOne({ _id: staffId, school: schoolId });
                if (accompaniment) staffExists = true;
                break;
        }
        
        if (!staffExists) {
            return res.status(404).json({ message: "Staff member not found or does not belong to this school" });
        }
        
        // Find attendance records for this staff member
        const query = { 
            school: schoolId,
            'records.staffId': staffId,
            'records.staffType': staffType
        };
        
        // Add date filtering if provided
        if (req.query.startDate && req.query.endDate) {
            query.date = {
                $gte: new Date(req.query.startDate),
                $lte: new Date(req.query.endDate)
            };
        } else if (req.query.startDate) {
            query.date = { $gte: new Date(req.query.startDate) };
        } else if (req.query.endDate) {
            query.date = { $lte: new Date(req.query.endDate) };
        }
        
        const attendanceRecords = await StaffAttendance.find(query)
            .sort({ date: -1 });
            
        // Extract records specific to this staff member
        const staffAttendance = attendanceRecords.map(record => {
            const staffRecord = record.records.find(r => 
                r.staffId.toString() === staffId && r.staffType === staffType
            );
            
            return {
                date: record.date,
                status: staffRecord ? staffRecord.status : null,
                checkInTime: staffRecord ? staffRecord.checkInTime : null,
                checkOutTime: staffRecord ? staffRecord.checkOutTime : null,
                remarks: staffRecord ? staffRecord.remarks : null
            };
        });
        
        res.status(200).json(staffAttendance);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving staff attendance", error: error.message });
    }
});

// Update staff attendance record (School or Guard)
router.put("/staff-attendance/:id", verifyGuardOrSchool, async (req, res) => {
    try {
        const { records } = req.body;
        
        if (!records || !Array.isArray(records)) {
            return res.status(400).json({ message: "Records array is required" });
        }
        
        // Get the school ID based on user role
        const schoolId = await getSchoolId(req);
        if (!schoolId) {
            return res.status(404).json({ message: "School not found" });
        }
        
        // Find attendance record
        const attendance = await StaffAttendance.findOne({
            _id: req.params.id,
            school: schoolId
        });
        
        if (!attendance) {
            return res.status(404).json({ message: "Attendance record not found or you don't have permission" });
        }
        
        // Process records and recalculate summary
        const summary = {
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            totalTeachers: 0,
            totalGuards: 0,
            totalDrivers: 0,
            totalAccompaniments: 0
        };
        
        // Validate each record
        for (const record of records) {
            if (!record.staffId || !record.staffType || !record.status) {
                return res.status(400).json({ message: "Each record must have staffId, staffType, and status" });
            }
            
            // Count staff types
            switch (record.staffType) {
                case 'teacher':
                    summary.totalTeachers++;
                    break;
                case 'guard':
                    summary.totalGuards++;
                    break;
                case 'driver':
                    summary.totalDrivers++;
                    break;
                case 'accompaniment':
                    summary.totalAccompaniments++;
                    break;
                default:
                    return res.status(400).json({ message: "Invalid staff type" });
            }
            
            // Validate check-in time for present or late status
            if ((record.status === 'present' || record.status === 'late') && !record.checkInTime) {
                return res.status(400).json({ message: "Check-in time is required for present or late status" });
            }
            
            // Update summary
            summary[record.status]++;
        }
        
        // Update attendance record
        attendance.records = records;
        attendance.summary = summary;
        
        await attendance.save();
        
        res.status(200).json(attendance);
    } catch (error) {
        res.status(500).json({ message: "Error updating staff attendance record", error: error.message });
    }
});

// Delete staff attendance record (School or Guard)
router.delete("/staff-attendance/:id", verifyGuardOrSchool, async (req, res) => {
    try {
        // Get the school ID based on user role
        const schoolId = await getSchoolId(req);
        if (!schoolId) {
            return res.status(404).json({ message: "School not found" });
        }
        
        // Find attendance record
        const attendance = await StaffAttendance.findOne({
            _id: req.params.id,
            school: schoolId
        });
        
        if (!attendance) {
            return res.status(404).json({ message: "Attendance record not found or you don't have permission" });
        }
        
        await StaffAttendance.findByIdAndDelete(req.params.id);
        
        res.status(200).json({ message: "Staff attendance record successfully deleted" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting staff attendance record", error: error.message });
    }
});

module.exports = router; 