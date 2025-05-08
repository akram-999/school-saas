const router = require("express").Router();
const Guard = require("../models/Guard");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const Class = require("../models/Class");
const Subject = require("../models/Subject");
const Cycle = require("../models/Cycle");
const Attendance = require("../models/Attendance");
const Activity = require("../models/Activity");
const Exam = require("../models/Exam");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { verifySchool, verifyGuard, verifyGuardOrSchool, generateGuardToken } = require("../config/jwt");

// Guard Login
router.post("/guard/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find guard
        const guard = await Guard.findOne({ email });
        if (!guard) {
            return res.status(404).json({ message: "Guard not found" });
        }

        // Validate password
        const isMatch = await bcrypt.compare(password, guard.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Generate token
        const token = generateGuardToken(guard);

        // Return guard data without password
        const { password: _, ...guardWithoutPassword } = guard.toObject();
        res.status(200).json({ ...guardWithoutPassword, token });
    } catch (error) {
        res.status(500).json({ message: "Login failed", error: error.message });
    }
});

// Guard Registration (School only can register guards)
router.post("/guards", verifySchool, async (req, res) => {
    try {
        const { 
            firstName, firstName_ar, lastName, lastName_ar,
            email, password, phoneNumber, address, cin,
            address_ar, dateOfBirth 
        } = req.body;
        
        // Check if guard exists
        const exists = await Guard.findOne({ email });
        if (exists) {
            return res.status(400).json({ message: 'Guard already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(password, salt);

        // Create new guard
        const newGuard = new Guard({
            firstName,
            firstName_ar,
            lastName,
            lastName_ar,
            email,
            password: hashedPass,
            phoneNumber,
            address,
            cin,
            address_ar,
            dateOfBirth,
            school: req.user.id,  // Associate guard with the school that's creating it
            rol: 'guard'
        });

        // Save guard
        const guard = await newGuard.save();
        
        // Send response without sensitive data
        const { password: _, ...guardWithoutPassword } = guard.toObject();
        res.status(201).json(guardWithoutPassword);
    } catch (error) {
        res.status(500).json({ message: 'Error creating guard', error: error.message });
    }
});

// Get Guard Profile
router.get("/guard/profile", verifyGuard, async (req, res) => {
    try {
        const guard = await Guard.findById(req.user.id)
            .select("-password")
            .populate("school", "name address phoneNumber email");
            
        if (!guard) {
            return res.status(404).json({ message: "Guard not found" });
        }
        res.status(200).json(guard);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving profile", error: error.message });
    }
});

// Update Guard Profile
router.put("/guard/profile", verifyGuard, async (req, res) => {
    try {
        const { 
            firstName, firstName_ar, lastName, lastName_ar,
            email, password, phoneNumber, address, cin,
            address_ar, dateOfBirth 
        } = req.body;
        
        // Prepare update object
        const updateObj = {};
        if (firstName) updateObj.firstName = firstName;
        if (firstName_ar) updateObj.firstName_ar = firstName_ar;
        if (lastName) updateObj.lastName = lastName;
        if (lastName_ar) updateObj.lastName_ar = lastName_ar;
        if (email) updateObj.email = email;
        if (phoneNumber) updateObj.phoneNumber = phoneNumber;
        if (address) updateObj.address = address;
        if (cin) updateObj.cin = cin;
        if (address_ar) updateObj.address_ar = address_ar;
        if (dateOfBirth) updateObj.dateOfBirth = dateOfBirth;
        
        // Handle password update if provided
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateObj.password = await bcrypt.hash(password, salt);
        }
        
        // Update guard
        const updatedGuard = await Guard.findByIdAndUpdate(
            req.user.id,
            { $set: updateObj },
            { new: true }
        ).select("-password");
        
        res.status(200).json(updatedGuard);
    } catch (error) {
        res.status(500).json({ message: "Error updating profile", error: error.message });
    }
});

// STUDENT MANAGEMENT

// Get all students (Guard)
router.get("/guard/students", verifyGuard, async (req, res) => {
    try {
        // Get the guard's school
        const guard = await Guard.findById(req.user.id);
        if (!guard) {
            return res.status(404).json({ message: "Guard not found" });
        }

        // Find all students in the guard's school
        const students = await Student.find({ school: guard.school })
            .select("-password")
            .populate("class", "name")
            .populate("parent", "firstName lastName phoneNumber");
            
        res.status(200).json(students);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving students", error: error.message });
    }
});

// Get student details (Guard)
router.get("/guard/students/:id", verifyGuard, async (req, res) => {
    try {
        // Get the guard's school
        const guard = await Guard.findById(req.user.id);
        if (!guard) {
            return res.status(404).json({ message: "Guard not found" });
        }

        // Find the student in the guard's school
        const student = await Student.findOne({ 
            _id: req.params.id,
            school: guard.school
        })
        .select("-password")
        .populate("class", "name")
        .populate("parent", "firstName lastName phoneNumber email address");
        
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        
        res.status(200).json(student);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving student", error: error.message });
    }
});

// TEACHER MANAGEMENT

// Get all teachers (Guard)
router.get("/guard/teachers", verifyGuard, async (req, res) => {
    try {
        // Get the guard's school
        const guard = await Guard.findById(req.user.id);
        if (!guard) {
            return res.status(404).json({ message: "Guard not found" });
        }

        // Find all teachers in the guard's school
        const teachers = await Teacher.find({ school: guard.school })
            .select("-password")
            .populate("subjects", "name code");
            
        res.status(200).json(teachers);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving teachers", error: error.message });
    }
});

// Get teacher details (Guard)
router.get("/guard/teachers/:id", verifyGuard, async (req, res) => {
    try {
        // Get the guard's school
        const guard = await Guard.findById(req.user.id);
        if (!guard) {
            return res.status(404).json({ message: "Guard not found" });
        }

        // Find the teacher in the guard's school
        const teacher = await Teacher.findOne({ 
            _id: req.params.id,
            school: guard.school
        })
        .select("-password")
        .populate("subjects", "name code description");
        
        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }
        
        res.status(200).json(teacher);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving teacher", error: error.message });
    }
});

// CLASS MANAGEMENT

// Get all classes (Guard)
router.get("/guard/classes", verifyGuard, async (req, res) => {
    try {
        // Get the guard's school
        const guard = await Guard.findById(req.user.id);
        if (!guard) {
            return res.status(404).json({ message: "Guard not found" });
        }

        // Find all classes in the guard's school
        const classes = await Class.find({ school: guard.school })
            .populate("cycle", "name")
            .populate("subjects", "name code")
            .populate({
                path: "classTeacher",
                select: "firstName lastName email phoneNumber"
            });
            
        res.status(200).json(classes);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving classes", error: error.message });
    }
});

// Get class details (Guard)
router.get("/guard/classes/:id", verifyGuard, async (req, res) => {
    try {
        // Get the guard's school
        const guard = await Guard.findById(req.user.id);
        if (!guard) {
            return res.status(404).json({ message: "Guard not found" });
        }

        // Find the class in the guard's school
        const classData = await Class.findOne({ 
            _id: req.params.id,
            school: guard.school
        })
        .populate("cycle", "name")
        .populate("subjects", "name code description")
        .populate({
            path: "classTeacher",
            select: "firstName lastName email phoneNumber"
        });
        
        if (!classData) {
            return res.status(404).json({ message: "Class not found" });
        }
        
        // Get students in this class
        const students = await Student.find({ 
            class: req.params.id,
            school: guard.school
        }).select("firstName lastName roll email phoneNumber");
        
        res.status(200).json({
            ...classData.toObject(),
            students
        });
    } catch (error) {
        res.status(500).json({ message: "Error retrieving class", error: error.message });
    }
});

// SUBJECT MANAGEMENT

// Get all subjects (Guard)
router.get("/guard/subjects", verifyGuard, async (req, res) => {
    try {
        // Get the guard's school
        const guard = await Guard.findById(req.user.id);
        if (!guard) {
            return res.status(404).json({ message: "Guard not found" });
        }

        // Find all subjects in the guard's school
        const subjects = await Subject.find({ school: guard.school })
            .populate("teachers", "firstName lastName email")
            .populate("classes", "name");
            
        res.status(200).json(subjects);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving subjects", error: error.message });
    }
});

// CYCLE MANAGEMENT

// Get all cycles (Guard)
router.get("/guard/cycles", verifyGuard, async (req, res) => {
    try {
        // Get the guard's school
        const guard = await Guard.findById(req.user.id);
        if (!guard) {
            return res.status(404).json({ message: "Guard not found" });
        }

        // Find all cycles in the guard's school
        const cycles = await Cycle.find({ school: guard.school });
            
        res.status(200).json(cycles);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving cycles", error: error.message });
    }
});

// ATTENDANCE MANAGEMENT

// Get attendances by date (Guard)
router.get("/guard/attendance", verifyGuard, async (req, res) => {
    try {
        const { date, classId } = req.query;
        
        // Get the guard's school
        const guard = await Guard.findById(req.user.id);
        if (!guard) {
            return res.status(404).json({ message: "Guard not found" });
        }
        
        // Prepare filter
        const filter = { school: guard.school };
        
        // Add date filter if provided
        if (date) {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);
            
            filter.date = { $gte: startDate, $lte: endDate };
        }
        
        // Add class filter if provided
        if (classId) {
            filter.class = classId;
        }
        
        // Find attendances
        const attendances = await Attendance.find(filter)
            .populate("student", "firstName lastName roll")
            .populate("class", "name")
            .sort({ date: -1 });
            
        res.status(200).json(attendances);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving attendance", error: error.message });
    }
});

// Record attendance (Guard)
router.post("/guard/attendance", verifyGuard, async (req, res) => {
    try {
        const { studentId, classId, status, date, remark } = req.body;
        
        // Get the guard's school
        const guard = await Guard.findById(req.user.id);
        if (!guard) {
            return res.status(404).json({ message: "Guard not found" });
        }
        
        // Verify student belongs to this school
        const student = await Student.findOne({
            _id: studentId,
            school: guard.school
        });
        
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        
        // Verify class belongs to this school
        const classObj = await Class.findOne({
            _id: classId,
            school: guard.school
        });
        
        if (!classObj) {
            return res.status(404).json({ message: "Class not found" });
        }
        
        // Check if attendance already exists for this student on this date
        const attendanceDate = new Date(date);
        attendanceDate.setHours(0, 0, 0, 0);
        
        const existingAttendance = await Attendance.findOne({
            student: studentId,
            date: {
                $gte: attendanceDate,
                $lt: new Date(attendanceDate.getTime() + 24 * 60 * 60 * 1000)
            }
        });
        
        if (existingAttendance) {
            // Update existing attendance
            existingAttendance.status = status;
            if (remark) existingAttendance.remark = remark;
            
            await existingAttendance.save();
            res.status(200).json(existingAttendance);
        } else {
            // Create new attendance record
            const newAttendance = new Attendance({
                student: studentId,
                class: classId,
                school: guard.school,
                status,
                date: date || new Date(),
                remark
            });
            
            const attendance = await newAttendance.save();
            res.status(201).json(attendance);
        }
    } catch (error) {
        res.status(500).json({ message: "Error recording attendance", error: error.message });
    }
});

// ACTIVITY MANAGEMENT

// Get all activities (Guard)
router.get("/guard/activities", verifyGuard, async (req, res) => {
    try {
        // Get the guard's school
        const guard = await Guard.findById(req.user.id);
        if (!guard) {
            return res.status(404).json({ message: "Guard not found" });
        }

        // Find all activities in the guard's school
        const activities = await Activity.find({ school: guard.school })
            .populate("class", "name")
            .sort({ date: -1 });
            
        res.status(200).json(activities);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving activities", error: error.message });
    }
});

// EXAM MANAGEMENT

// Get all exams (Guard)
router.get("/guard/exams", verifyGuard, async (req, res) => {
    try {
        // Get the guard's school
        const guard = await Guard.findById(req.user.id);
        if (!guard) {
            return res.status(404).json({ message: "Guard not found" });
        }

        // Find all exams in the guard's school
        const exams = await Exam.find({ school: guard.school })
            .populate("subject", "name code")
            .populate("teacher", "firstName lastName")
            .sort({ examDate: -1 });
            
        res.status(200).json(exams);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving exams", error: error.message });
    }
});

module.exports = router; 