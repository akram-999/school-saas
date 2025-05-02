const router = require("express").Router();
const Attendance = require("../models/Attendance");
const Student = require("../models/Student");
const Subject = require("../models/Subject");
const { verifyTeacher, verifySchool, verifySchoolOrTeacher, verifyParent } = require("../config/jwt");

// Create attendance record (Teacher only)
router.post("/attendance", verifyTeacher, async (req, res) => {
    try {
        const { date, subject, records } = req.body;
        
        if (!date || !subject || !records || !Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ message: "Date, subject, and records are required" });
        }
        
        // Verify teacher is assigned to this subject
        const subjectDoc = await Subject.findOne({
            _id: subject,
            teachers: req.user.id
        });
        
        if (!subjectDoc) {
            return res.status(403).json({ message: "You are not authorized to create attendance for this subject" });
        }
        
        // Process records and calculate summary
        const summary = {
            present: 0,
            absent: 0,
            late: 0,
            excused: 0
        };
        
        records.forEach(record => {
            if (!record.student || !record.status) {
                throw new Error("Each record must have student ID and status");
            }
            
            summary[record.status]++;
        });
        
        // Create new attendance record
        const newAttendance = new Attendance({
            date,
            subject,
            school: subjectDoc.school,
            teacher: req.user.id,
            records,
            totalStudents: records.length,
            summary
        });
        
        const attendance = await newAttendance.save();
        
        res.status(201).json(attendance);
    } catch (error) {
        res.status(500).json({ message: "Error creating attendance record", error: error.message });
    }
});

// Get attendance by subject (Teacher or School)
router.get("/attendance/subject/:subjectId", verifySchoolOrTeacher, async (req, res) => {
    try {
        const query = { subject: req.params.subjectId };
        
        // If teacher is making the request, verify they teach this subject
        if (req.user.rol === 'teacher') {
            const subjectDoc = await Subject.findOne({
                _id: req.params.subjectId,
                teachers: req.user.id
            });
            
            if (!subjectDoc) {
                return res.status(403).json({ message: "You don't have permission to view this subject's attendance" });
            }
            
            query.teacher = req.user.id;
        } 
        // If school is making the request, verify this subject belongs to the school
        else if (req.user.rol === 'school') {
            const subjectDoc = await Subject.findOne({
                _id: req.params.subjectId,
                school: req.user.id
            });
            
            if (!subjectDoc) {
                return res.status(403).json({ message: "This subject does not belong to your school" });
            }
            
            query.school = req.user.id;
        }
        
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
        
        const attendance = await Attendance.find(query)
            .populate("subject", "name code")
            .populate("teacher", "firstName lastName")
            .sort({ date: -1 });
            
        res.status(200).json(attendance);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving attendance records", error: error.message });
    }
});

// Get attendance by date (Teacher or School)
router.get("/attendance/date/:date", verifySchoolOrTeacher, async (req, res) => {
    try {
        const date = new Date(req.params.date);
        
        if (isNaN(date.getTime())) {
            return res.status(400).json({ message: "Invalid date format" });
        }
        
        // Set start and end of the day
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        const query = {
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        };
        
        // Apply role-based filters
        if (req.user.rol === 'teacher') {
            query.teacher = req.user.id;
        } else if (req.user.rol === 'school') {
            query.school = req.user.id;
        }
        
        const attendance = await Attendance.find(query)
            .populate("subject", "name code")
            .populate("teacher", "firstName lastName")
            .sort({ date: -1 });
            
        res.status(200).json(attendance);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving attendance records", error: error.message });
    }
});

// Get attendance for a specific student (Teacher, School, or Parent)
router.get("/attendance/student/:studentId", async (req, res) => {
    try {
        const studentId = req.params.studentId;
        
        // Get the student
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        
        // Check permissions
        if (req.user.rol === 'parent') {
            // Parents can only view their children's attendance
            const parent = await Parent.findById(req.user.id);
            if (!parent.children.includes(studentId)) {
                return res.status(403).json({ message: "You can only view your children's attendance" });
            }
        } else if (req.user.rol === 'school') {
            // Schools can only view their students' attendance
            if (student.school.toString() !== req.user.id) {
                return res.status(403).json({ message: "This student does not belong to your school" });
            }
        } else if (req.user.rol === 'teacher') {
            // Teachers can only view attendance for students in subjects they teach
            const teacherSubjects = await Subject.find({ teachers: req.user.id });
            const subjectIds = teacherSubjects.map(subject => subject._id.toString());
            
            // We'll filter attendance records by these subjects later
        }
        
        // Find attendance records for this student
        const query = { "records.student": studentId };
        
        // Add date filtering if provided
        if (req.query.startDate && req.query.endDate) {
            query.date = {
                $gte: new Date(req.query.startDate),
                $lte: new Date(req.query.endDate)
            };
        }
        
        // For teachers, limit to subjects they teach
        if (req.user.rol === 'teacher') {
            const teacherSubjects = await Subject.find({ teachers: req.user.id });
            const subjectIds = teacherSubjects.map(subject => subject._id);
            query.subject = { $in: subjectIds };
        }
        
        const attendanceRecords = await Attendance.find(query)
            .populate("subject", "name code")
            .populate("teacher", "firstName lastName")
            .sort({ date: -1 });
            
        // Extract records specific to this student
        const studentAttendance = attendanceRecords.map(record => {
            const studentRecord = record.records.find(r => 
                r.student.toString() === studentId
            );
            
            return {
                date: record.date,
                subject: record.subject,
                teacher: record.teacher,
                status: studentRecord ? studentRecord.status : null,
                remarks: studentRecord ? studentRecord.remarks : null
            };
        });
        
        res.status(200).json(studentAttendance);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving student attendance", error: error.message });
    }
});

// Update attendance record (Teacher only)
router.put("/attendance/:id", verifyTeacher, async (req, res) => {
    try {
        const { records } = req.body;
        
        if (!records || !Array.isArray(records)) {
            return res.status(400).json({ message: "Records array is required" });
        }
        
        // Find attendance record and verify teacher owns it
        const attendance = await Attendance.findOne({
            _id: req.params.id,
            teacher: req.user.id
        });
        
        if (!attendance) {
            return res.status(404).json({ message: "Attendance record not found or you don't have permission" });
        }
        
        // Update records and recalculate summary
        attendance.records = records;
        
        const summary = {
            present: 0,
            absent: 0,
            late: 0,
            excused: 0
        };
        
        records.forEach(record => {
            summary[record.status]++;
        });
        
        attendance.summary = summary;
        attendance.totalStudents = records.length;
        
        await attendance.save();
        
        res.status(200).json(attendance);
    } catch (error) {
        res.status(500).json({ message: "Error updating attendance record", error: error.message });
    }
});

// Delete attendance record (Teacher or School)
router.delete("/attendance/:id", verifySchoolOrTeacher, async (req, res) => {
    try {
        const query = { _id: req.params.id };
        
        // Apply role-based filters
        if (req.user.rol === 'teacher') {
            query.teacher = req.user.id;
        } else if (req.user.rol === 'school') {
            query.school = req.user.id;
        }
        
        const attendance = await Attendance.findOne(query);
        
        if (!attendance) {
            return res.status(404).json({ message: "Attendance record not found or you don't have permission" });
        }
        
        await Attendance.findByIdAndDelete(req.params.id);
        
        res.status(200).json({ message: "Attendance record successfully deleted" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting attendance record", error: error.message });
    }
});

module.exports = router; 