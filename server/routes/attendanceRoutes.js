const router = require("express").Router();
const Attendance = require("../models/Attendance");
const Student = require("../models/Student");
const Subject = require("../models/Subject");
const Guard = require("../models/Guard");
const { verifyTeacher, verifySchool, verifySchoolOrTeacher, verifyParent, verifyGuardOrSchool } = require("../config/jwt");

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

// Create attendance record (Teacher, School, or Guard)
router.post("/attendance", async (req, res) => {
    try {
        const { date, subject, records } = req.body;
        
        if (!date || !subject || !records || !Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ message: "Date, subject, and records are required" });
        }
        
        let schoolId, teacherId;
        
        // Handle different roles
        if (req.user.rol === 'teacher') {
            // Verify teacher is assigned to this subject
            const subjectDoc = await Subject.findOne({
                _id: subject,
                teachers: req.user.id
            });
            
            if (!subjectDoc) {
                return res.status(403).json({ message: "You are not authorized to create attendance for this subject" });
            }
            
            teacherId = req.user.id;
            schoolId = subjectDoc.school;
        } else if (req.user.rol === 'school') {
            // Verify subject belongs to this school
            const subjectDoc = await Subject.findOne({
                _id: subject,
                school: req.user.id
            });
            
            if (!subjectDoc) {
                return res.status(403).json({ message: "This subject does not belong to your school" });
            }
            
            schoolId = req.user.id;
            teacherId = req.body.teacher; // School can specify a teacher
            
            // Verify teacher exists and belongs to this school
            if (teacherId) {
                const teacherExists = await Teacher.findOne({
                    _id: teacherId,
                    school: schoolId
                });
                
                if (!teacherExists) {
                    return res.status(404).json({ message: "Teacher not found" });
                }
            } else {
                return res.status(400).json({ message: "Teacher ID is required" });
            }
        } else if (req.user.rol === 'guard') {
            // Get the guard's school
            const guard = await Guard.findById(req.user.id);
            if (!guard) {
                return res.status(404).json({ message: "Guard not found" });
            }
            
            // Verify subject belongs to the guard's school
            const subjectDoc = await Subject.findOne({
                _id: subject,
                school: guard.school
            });
            
            if (!subjectDoc) {
                return res.status(403).json({ message: "This subject does not belong to your school" });
            }
            
            schoolId = guard.school;
            teacherId = req.body.teacher; // Guard can specify a teacher
            
            // Verify teacher exists and belongs to this school
            if (teacherId) {
                const teacherExists = await Teacher.findOne({
                    _id: teacherId,
                    school: schoolId
                });
                
                if (!teacherExists) {
                    return res.status(404).json({ message: "Teacher not found" });
                }
            } else {
                return res.status(400).json({ message: "Teacher ID is required" });
            }
        } else {
            return res.status(403).json({ message: "Unauthorized" });
        }
        
        // Verify each student belongs to the school
        for (const record of records) {
            if (!record.student || !record.status) {
                return res.status(400).json({ message: "Each record must have student ID and status" });
            }
            
            const studentExists = await Student.findOne({
                _id: record.student,
                school: schoolId
            });
            
            if (!studentExists) {
                return res.status(404).json({ message: `Student with ID ${record.student} not found or does not belong to this school` });
            }
        }
        
        // Process records and calculate summary
        const summary = {
            present: 0,
            absent: 0,
            late: 0,
            excused: 0
        };
        
        records.forEach(record => {
            summary[record.status]++;
        });
        
        // Create new attendance record
        const newAttendance = new Attendance({
            date,
            subject,
            school: schoolId,
            teacher: teacherId,
            records,
            summary
        });
        
        const attendance = await newAttendance.save();
        
        res.status(201).json(attendance);
    } catch (error) {
        res.status(500).json({ message: "Error creating attendance record", error: error.message });
    }
});

// Get attendance by subject (Teacher, School, or Guard)
router.get("/attendance/subject/:subjectId", async (req, res) => {
    try {
        const query = { subject: req.params.subjectId };
        
        // Handle different roles
        if (req.user.rol === 'teacher') {
            // Verify teacher is assigned to this subject
            const subjectDoc = await Subject.findOne({
                _id: req.params.subjectId,
                teachers: req.user.id
            });
            
            if (!subjectDoc) {
                return res.status(403).json({ message: "You don't have permission to view this subject's attendance" });
            }
            
            query.teacher = req.user.id;
        } else if (req.user.rol === 'school') {
            // Verify subject belongs to this school
            const subjectDoc = await Subject.findOne({
                _id: req.params.subjectId,
                school: req.user.id
            });
            
            if (!subjectDoc) {
                return res.status(403).json({ message: "This subject does not belong to your school" });
            }
            
            query.school = req.user.id;
        } else if (req.user.rol === 'guard') {
            // Get the guard's school
            const guard = await Guard.findById(req.user.id);
            if (!guard) {
                return res.status(404).json({ message: "Guard not found" });
            }
            
            // Verify subject belongs to the guard's school
            const subjectDoc = await Subject.findOne({
                _id: req.params.subjectId,
                school: guard.school
            });
            
            if (!subjectDoc) {
                return res.status(403).json({ message: "This subject does not belong to your school" });
            }
            
            query.school = guard.school;
        } else {
            return res.status(403).json({ message: "Unauthorized" });
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
            .populate("records.student", "firstName lastName pupilCode")
            .sort({ date: -1 });
            
        res.status(200).json(attendance);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving attendance records", error: error.message });
    }
});

// Get attendance by date (Teacher, School, or Guard)
router.get("/attendance/date/:date", async (req, res) => {
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
        } else if (req.user.rol === 'guard') {
            // Get the guard's school
            const guard = await Guard.findById(req.user.id);
            if (!guard) {
                return res.status(404).json({ message: "Guard not found" });
            }
            
            query.school = guard.school;
        } else {
            return res.status(403).json({ message: "Unauthorized" });
        }
        
        const attendance = await Attendance.find(query)
            .populate("subject", "name code")
            .populate("teacher", "firstName lastName")
            .populate("records.student", "firstName lastName pupilCode")
            .sort({ subject: 1 });
            
        res.status(200).json(attendance);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving attendance records", error: error.message });
    }
});

// Get attendance for a specific student (Teacher, School, Guard, or Parent)
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
        } else if (req.user.rol === 'guard') {
            // Guards can only view students in their school
            const guard = await Guard.findById(req.user.id);
            if (!guard) {
                return res.status(404).json({ message: "Guard not found" });
            }
            
            if (student.school.toString() !== guard.school.toString()) {
                return res.status(403).json({ message: "This student does not belong to your school" });
            }
        } else {
            return res.status(403).json({ message: "Unauthorized" });
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

// Update attendance record (Teacher, School, or Guard)
router.put("/attendance/:id", async (req, res) => {
    try {
        const { records } = req.body;
        
        if (!records || !Array.isArray(records)) {
            return res.status(400).json({ message: "Records array is required" });
        }
        
        let query = { _id: req.params.id };
        
        // Apply role-based filters
        if (req.user.rol === 'teacher') {
            query.teacher = req.user.id;
        } else if (req.user.rol === 'school') {
            query.school = req.user.id;
        } else if (req.user.rol === 'guard') {
            // Get the guard's school
            const guard = await Guard.findById(req.user.id);
            if (!guard) {
                return res.status(404).json({ message: "Guard not found" });
            }
            
            query.school = guard.school;
        } else {
            return res.status(403).json({ message: "Unauthorized" });
        }
        
        // Find attendance record
        const attendance = await Attendance.findOne(query);
        
        if (!attendance) {
            return res.status(404).json({ message: "Attendance record not found or you don't have permission" });
        }
        
        // Verify each student belongs to the school
        for (const record of records) {
            if (!record.student || !record.status) {
                return res.status(400).json({ message: "Each record must have student ID and status" });
            }
            
            const studentExists = await Student.findOne({
                _id: record.student,
                school: attendance.school
            });
            
            if (!studentExists) {
                return res.status(404).json({ message: `Student with ID ${record.student} not found or does not belong to this school` });
            }
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
        
        await attendance.save();
        
        res.status(200).json(attendance);
    } catch (error) {
        res.status(500).json({ message: "Error updating attendance record", error: error.message });
    }
});

// Delete attendance record (Teacher, School, or Guard)
router.delete("/attendance/:id", async (req, res) => {
    try {
        let query = { _id: req.params.id };
        
        // Apply role-based filters
        if (req.user.rol === 'teacher') {
            query.teacher = req.user.id;
        } else if (req.user.rol === 'school') {
            query.school = req.user.id;
        } else if (req.user.rol === 'guard') {
            // Get the guard's school
            const guard = await Guard.findById(req.user.id);
            if (!guard) {
                return res.status(404).json({ message: "Guard not found" });
            }
            
            query.school = guard.school;
        } else {
            return res.status(403).json({ message: "Unauthorized" });
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