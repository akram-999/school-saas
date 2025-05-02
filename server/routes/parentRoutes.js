const router = require("express").Router();
const Parent = require("../models/Parent");
const Student = require("../models/Student");
const Exam = require("../models/Exam");
const Attendance = require("../models/Attendance");
const Activity = require("../models/Activity");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { verifySchool, verifyParent, verifyParentOrSchool, generateParentToken } = require("../config/jwt");

// Parent Registration (School only can register parents)
router.post("/parents", verifySchool, async (req, res) => {
    try {
        const { firstName, lastName, email, password, phoneNumber, address, occupation, relationToStudent, children } = req.body;
        
        // Check if parent exists
        const exists = await Parent.findOne({ email });
        if (exists) {
            return res.status(400).json({ message: 'Parent already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(password, salt);

        // Create new parent
        const newParent = new Parent({
            firstName,
            lastName,
            email,
            password: hashedPass,
            phoneNumber,
            address,
            occupation,
            relationToStudent,
            children: children || [],
            school: req.user.id,  // Associate parent with the school that's creating it
        });

        // Save parent
        const parent = await newParent.save();
        
        // If children IDs were provided, update each student with this parent
        if (children && children.length > 0) {
            await Student.updateMany(
                { _id: { $in: children } },
                { $set: { parent: parent._id } }
            );
        }
        
        // Send response without sensitive data
        const { password: _, ...parentWithoutPassword } = parent.toObject();
        res.status(201).json(parentWithoutPassword);
    } catch (error) {
        res.status(500).json({ message: 'Error creating parent', error: error.message });
    }
});

// Parent Login
router.post("/parent/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find parent
        const parent = await Parent.findOne({ email });
        if (!parent) {
            return res.status(404).json({ message: "Parent not found" });
        }

        // Validate password
        const isMatch = await bcrypt.compare(password, parent.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Generate token
        const token = generateParentToken(parent);

        // Return parent data without password
        const { password: _, ...parentWithoutPassword } = parent.toObject();
        res.status(200).json({ ...parentWithoutPassword, token });
    } catch (error) {
        res.status(500).json({ message: "Login failed", error: error.message });
    }
});

// Get Parent Profile
router.get("/parent/profile", verifyParent, async (req, res) => {
    try {
        const parent = await Parent.findById(req.user.id)
            .select("-password")
            .populate("children", "firstName lastName email");
            
        if (!parent) {
            return res.status(404).json({ message: "Parent not found" });
        }
        res.status(200).json(parent);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving profile", error: error.message });
    }
});

// Update Parent Profile
router.put("/parent/profile", verifyParent, async (req, res) => {
    try {
        const { firstName, lastName, email, password, phoneNumber, address, occupation, image } = req.body;
        
        // Prepare update object
        const updateObj = {};
        if (firstName) updateObj.firstName = firstName;
        if (lastName) updateObj.lastName = lastName;
        if (email) updateObj.email = email;
        if (phoneNumber) updateObj.phoneNumber = phoneNumber;
        if (address) updateObj.address = address;
        if (occupation) updateObj.occupation = occupation;
        if (image) updateObj.image = image;
        
        // Handle password update if provided
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateObj.password = await bcrypt.hash(password, salt);
        }
        
        // Update parent
        const updatedParent = await Parent.findByIdAndUpdate(
            req.user.id,
            { $set: updateObj },
            { new: true }
        ).select("-password");
        
        res.status(200).json(updatedParent);
    } catch (error) {
        res.status(500).json({ message: "Error updating profile", error: error.message });
    }
});

// Get all parents (School only)
router.get("/parents", verifySchool, async (req, res) => {
    try {
        const parents = await Parent.find({ school: req.user.id })
            .select("-password")
            .populate("children", "firstName lastName");
            
        res.status(200).json(parents);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving parents", error: error.message });
    }
});

// Delete parent (School only)
router.delete("/parents/:id", verifySchool, async (req, res) => {
    try {
        const parent = await Parent.findOne({ 
            _id: req.params.id,
            school: req.user.id
        });
        
        if (!parent) {
            return res.status(404).json({ message: "Parent not found" });
        }
        
        await Parent.findByIdAndDelete(req.params.id);
        
        // Update students to remove this parent reference
        await Student.updateMany(
            { parent: req.params.id },
            { $unset: { parent: "" } }
        );
        
        res.status(200).json({ message: "Parent successfully deleted" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting parent", error: error.message });
    }
});

// Add a child to a parent (School only)
router.post("/parents/:id/children", verifySchool, async (req, res) => {
    try {
        const { studentId } = req.body;
        
        if (!studentId) {
            return res.status(400).json({ message: "Student ID is required" });
        }
        
        const parent = await Parent.findOne({ 
            _id: req.params.id,
            school: req.user.id
        });
        
        if (!parent) {
            return res.status(404).json({ message: "Parent not found" });
        }
        
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        
        // Add student to parent's children if not already there
        if (!parent.children.includes(studentId)) {
            parent.children.push(studentId);
            await parent.save();
            
            // Update student to reference this parent
            student.parent = parent._id;
            await student.save();
        }
        
        res.status(200).json({ message: "Child added to parent successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error adding child to parent", error: error.message });
    }
});

// Get all children's information (Parent only)
router.get("/parent/children", verifyParent, async (req, res) => {
    try {
        const parent = await Parent.findById(req.user.id);
        if (!parent) {
            return res.status(404).json({ message: "Parent not found" });
        }
        
        if (!parent.children || parent.children.length === 0) {
            return res.status(200).json({ message: "No children found", children: [] });
        }
        
        const children = await Student.find({ _id: { $in: parent.children } })
            .select("-password");
            
        res.status(200).json(children);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving children", error: error.message });
    }
});

// Get a child's exam results (Parent only)
router.get("/parent/children/:childId/exams", verifyParent, async (req, res) => {
    try {
        // Verify this child belongs to the parent
        const parent = await Parent.findById(req.user.id);
        if (!parent.children.includes(req.params.childId)) {
            return res.status(403).json({ message: "You are not authorized to view this child's information" });
        }
        
        // Find all exams where this student has results
        const exams = await Exam.find({
            "results.student": req.params.childId
        })
        .populate("subject", "name code")
        .populate("teacher", "firstName lastName")
        .sort({ examDate: -1 });
        
        // Extract just the relevant results for this student
        const results = exams.map(exam => {
            const studentResult = exam.results.find(
                result => result.student.toString() === req.params.childId
            );
            
            return {
                examId: exam._id,
                title: exam.title,
                subject: exam.subject,
                examDate: exam.examDate,
                totalMarks: exam.totalMarks,
                passingMarks: exam.passingMarks,
                teacher: exam.teacher,
                marks: studentResult ? studentResult.marks : null,
                status: studentResult ? studentResult.status : null,
                remarks: studentResult ? studentResult.remarks : null
            };
        });
        
        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving exam results", error: error.message });
    }
});

// Get a child's attendance (Parent only)
router.get("/parent/children/:childId/attendance", verifyParent, async (req, res) => {
    try {
        // Verify this child belongs to the parent
        const parent = await Parent.findById(req.user.id);
        if (!parent.children.includes(req.params.childId)) {
            return res.status(403).json({ message: "You are not authorized to view this child's information" });
        }
        
        // Find all attendance records for this student
        const attendance = await Attendance.find({
            "records.student": req.params.childId
        })
        .populate("subject", "name code")
        .populate("teacher", "firstName lastName")
        .sort({ date: -1 });
        
        // Extract just the relevant attendance records for this student
        const records = attendance.map(att => {
            const studentRecord = att.records.find(
                record => record.student.toString() === req.params.childId
            );
            
            return {
                attendanceId: att._id,
                date: att.date,
                subject: att.subject,
                teacher: att.teacher,
                status: studentRecord ? studentRecord.status : null,
                remarks: studentRecord ? studentRecord.remarks : null
            };
        });
        
        res.status(200).json(records);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving attendance records", error: error.message });
    }
});

// Get a child's activities (Parent only)
router.get("/parent/children/:childId/activities", verifyParent, async (req, res) => {
    try {
        // Verify this child belongs to the parent
        const parent = await Parent.findById(req.user.id);
        if (!parent.children.includes(req.params.childId)) {
            return res.status(403).json({ message: "You are not authorized to view this child's information" });
        }
        
        // Find the student to get their registered activities
        const student = await Student.findById(req.params.childId);
        if (!student || !student.activities) {
            return res.status(200).json([]);
        }
        
        // Get the activity details
        const activities = await Activity.find({
            _id: { $in: student.activities }
        })
        .populate("school", "name")
        .sort({ startDate: -1 });
        
        res.status(200).json(activities);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving activities", error: error.message });
    }
});

module.exports = router; 