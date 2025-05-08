const router = require("express").Router();
const Teacher = require("../models/Teacher");
const Exam = require("../models/Exam");
const Subject = require("../models/Subject");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { verifySchool, verifyTeacher, verifySchoolOrTeacher, generateTeacherToken } = require("../config/jwt");

// Teacher Registration (School only can register teachers)
router.post("/teachers", verifySchool, async (req, res) => {
    try {
        const { 
            firstName, firstName_ar, lastName, lastName_ar, 
            email, password, phoneNumber, address, address_ar,
            dateOfBirth, palaceOfBirth, palaceOfBirth_ar, cin,
            nationality, specialization, image 
        } = req.body;
        
        // Check if teacher exists
        const exists = await Teacher.findOne({ email });
        if (exists) {
            return res.status(400).json({ message: 'Teacher already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(password, salt);

        // Create new teacher
        const newTeacher = new Teacher({
            firstName,
            firstName_ar,
            lastName,
            lastName_ar,
            email,
            password: hashedPass,
            phoneNumber,
            address,
            address_ar,
            dateOfBirth,
            palaceOfBirth,
            palaceOfBirth_ar,
            cin,
            nationality,
            specialization,
            image,
            school: req.user.id,  // Associate teacher with the school that's creating it
            status: 'Active'  // Default status
        });

        // Save teacher
        const teacher = await newTeacher.save();
        
        // Send response without sensitive data
        const { password: _, ...teacherWithoutPassword } = teacher.toObject();
        res.status(201).json(teacherWithoutPassword);
    } catch (error) {
        res.status(500).json({ message: 'Error creating teacher', error: error.message });
    }
});

// Teacher Login
router.post("/teacher/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find teacher
        const teacher = await Teacher.findOne({ email });
        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        // Validate password
        const isMatch = await bcrypt.compare(password, teacher.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Generate token
        const token = generateTeacherToken(teacher);

        // Return teacher data without password
        const { password: _, ...teacherWithoutPassword } = teacher.toObject();
        res.status(200).json({ ...teacherWithoutPassword, token });
    } catch (error) {
        res.status(500).json({ message: "Login failed", error: error.message });
    }
});

// Get Teacher Profile
router.get("/teacher/profile", verifyTeacher, async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.user.id)
            .select("-password")
            .populate("subjects", "name code description");
            
        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }
        res.status(200).json(teacher);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving profile", error: error.message });
    }
});

// Update Teacher Profile
router.put("/teacher/profile", verifyTeacher, async (req, res) => {
    try {
        const { 
            firstName, firstName_ar, lastName, lastName_ar, 
            email, password, phoneNumber, address, address_ar,
            dateOfBirth, palaceOfBirth, palaceOfBirth_ar, cin,
            nationality, specialization, image, status 
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
        if (address_ar) updateObj.address_ar = address_ar;
        if (dateOfBirth) updateObj.dateOfBirth = dateOfBirth;
        if (palaceOfBirth) updateObj.palaceOfBirth = palaceOfBirth;
        if (palaceOfBirth_ar) updateObj.palaceOfBirth_ar = palaceOfBirth_ar;
        if (cin) updateObj.cin = cin;
        if (nationality) updateObj.nationality = nationality;
        if (specialization) updateObj.specialization = specialization;
        if (image) updateObj.image = image;
        if (status) updateObj.status = status;
        
        // Handle password update if provided
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateObj.password = await bcrypt.hash(password, salt);
        }
        
        // Update teacher
        const updatedTeacher = await Teacher.findByIdAndUpdate(
            req.user.id,
            { $set: updateObj },
            { new: true }
        ).select("-password");
        
        res.status(200).json(updatedTeacher);
    } catch (error) {
        res.status(500).json({ message: "Error updating profile", error: error.message });
    }
});

// Get all teachers (School only)
router.get("/teachers", verifySchool, async (req, res) => {
    try {
        const teachers = await Teacher.find({ school: req.user.id })
            .select("-password")
            .populate("subjects", "name code");
            
        res.status(200).json(teachers);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving teachers", error: error.message });
    }
});

// Delete teacher (School only)
router.delete("/teachers/:id", verifySchool, async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ 
            _id: req.params.id,
            school: req.user.id
        });
        
        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }
        
        await Teacher.findByIdAndDelete(req.params.id);
        
        // Also remove teacher from all subjects they were assigned to
        await Subject.updateMany(
            { teachers: req.params.id },
            { $pull: { teachers: req.params.id } }
        );
        
        res.status(200).json({ message: "Teacher successfully deleted" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting teacher", error: error.message });
    }
});

// Get teacher's subjects
router.get("/teacher/subjects", verifyTeacher, async (req, res) => {
    try {
        const subjects = await Subject.find({ teachers: req.user.id });
        res.status(200).json(subjects);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving subjects", error: error.message });
    }
});

// Create an exam (Teacher only)
router.post("/exams", verifyTeacher, async (req, res) => {
    try {
        const { title, description, subject, examDate, duration, totalMarks, passingMarks } = req.body;
        
        // Check if the subject exists and teacher is assigned to it
        const subjectDoc = await Subject.findOne({
            _id: subject,
            teachers: req.user.id
        });
        
        if (!subjectDoc) {
            return res.status(403).json({ message: "You are not authorized to create an exam for this subject" });
        }
        
        const newExam = new Exam({
            title,
            description,
            subject,
            teacher: req.user.id,
            school: subjectDoc.school,
            examDate,
            duration,
            totalMarks,
            passingMarks,
            status: 'scheduled'
        });
        
        const exam = await newExam.save();
        res.status(201).json(exam);
    } catch (error) {
        res.status(500).json({ message: "Error creating exam", error: error.message });
    }
});

// Get all exams for a teacher
router.get("/teacher/exams", verifyTeacher, async (req, res) => {
    try {
        const exams = await Exam.find({ teacher: req.user.id })
            .populate("subject", "name code")
            .sort({ examDate: -1 });
            
        res.status(200).json(exams);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving exams", error: error.message });
    }
});

// Update exam status
router.put("/exams/:id/status", verifyTeacher, async (req, res) => {
    try {
        const { status } = req.body;
        
        if (!['scheduled', 'ongoing', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }
        
        const exam = await Exam.findOne({
            _id: req.params.id,
            teacher: req.user.id
        });
        
        if (!exam) {
            return res.status(404).json({ message: "Exam not found or you don't have permission" });
        }
        
        exam.status = status;
        await exam.save();
        
        res.status(200).json({ message: "Exam status updated", status });
    } catch (error) {
        res.status(500).json({ message: "Error updating exam status", error: error.message });
    }
});

// Add exam results for students
router.post("/exams/:id/results", verifyTeacher, async (req, res) => {
    try {
        const { results } = req.body;
        
        if (!Array.isArray(results) || results.length === 0) {
            return res.status(400).json({ message: "Results array is required" });
        }
        
        const exam = await Exam.findOne({
            _id: req.params.id,
            teacher: req.user.id
        });
        
        if (!exam) {
            return res.status(404).json({ message: "Exam not found or you don't have permission" });
        }
        
        // Validate all results before adding
        for (const result of results) {
            if (!result.student || !result.marks || typeof result.marks !== 'number') {
                return res.status(400).json({ message: "Each result must have student ID and marks" });
            }
            
            // Determine pass or fail status
            result.status = result.marks >= exam.passingMarks ? 'pass' : 'fail';
        }
        
        // Add results to the exam
        exam.results = results;
        
        // Update exam status to completed if not already
        if (exam.status !== 'completed') {
            exam.status = 'completed';
        }
        
        await exam.save();
        
        res.status(200).json({ message: "Exam results updated successfully", exam });
    } catch (error) {
        res.status(500).json({ message: "Error adding exam results", error: error.message });
    }
});

module.exports = router; 