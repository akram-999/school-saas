const router = require("express").Router();
const Student = require("../models/Student");
const Activity = require("../models/Activity");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { verifySchool, verifyAdmin, verifyStudent, verifySchoolOrAdmin, generateStudentToken } = require("../config/jwt");

// Student Registration (Public or School can register)
router.post("/student/register", async (req, res) => {
    try {
        const { firstName, lastName, email, password, dateOfBirth, phoneNumber, address, school } = req.body;
        
        // Check if student exists
        const exists = await Student.findOne({ email });
        if (exists) {
            return res.status(400).json({ message: 'Student already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(password, salt);

        // Create new student
        const newStudent = new Student({
            firstName,
            lastName,
            email,
            password: hashedPass,
            dateOfBirth,
            phoneNumber,
            address,
            school,
        });

        // Save student
        const student = await newStudent.save();
        
        // Send response without sensitive data
        const { password: _, ...studentWithoutPassword } = student.toObject();
        res.status(201).json(studentWithoutPassword);
    } catch (error) {
        res.status(500).json({ message: 'Error creating student', error: error.message });
    }
});

// Student Login
router.post("/student/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find student
        const student = await Student.findOne({ email });
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Validate password
        const isMatch = await bcrypt.compare(password, student.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Generate token
        const token = generateStudentToken(student);

        // Return student data without password
        const { password: _, ...studentWithoutPassword } = student.toObject();
        res.status(200).json({ ...studentWithoutPassword, token });
    } catch (error) {
        res.status(500).json({ message: "Login failed", error: error.message });
    }
});

// Get Student Profile (Protected route)
router.get("/student/profile", verifyStudent, async (req, res) => {
    try {
        const student = await Student.findById(req.user.id)
            .select("-password")
            .populate("activities", "name description startDate endDate location");
            
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        res.status(200).json(student);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving profile", error: error.message });
    }
});

// Update Student Profile (Protected route)
router.put("/student/profile", verifyStudent, async (req, res) => {
    try {
        const { firstName, lastName, email, password, dateOfBirth, phoneNumber, address, image } = req.body;
        
        // Prepare update object
        const updateObj = {};
        if (firstName) updateObj.firstName = firstName;
        if (lastName) updateObj.lastName = lastName;
        if (email) updateObj.email = email;
        if (dateOfBirth) updateObj.dateOfBirth = dateOfBirth;
        if (phoneNumber) updateObj.phoneNumber = phoneNumber;
        if (address) updateObj.address = address;
        if (image) updateObj.image = image;
        
        // Handle password update if provided
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateObj.password = await bcrypt.hash(password, salt);
        }
        
        // Update student
        const updatedStudent = await Student.findByIdAndUpdate(
            req.user.id,
            { $set: updateObj },
            { new: true }
        ).select("-password");
        
        res.status(200).json(updatedStudent);
    } catch (error) {
        res.status(500).json({ message: "Error updating profile", error: error.message });
    }
});

// Register for an activity (Student protected route)
router.post("/student/activities/:activityId/register", verifyStudent, async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.activityId);
        
        if (!activity) {
            return res.status(404).json({ message: "Activity not found" });
        }
        
        // Check if activity is active
        if (!activity.isActive) {
            return res.status(400).json({ message: "This activity is no longer available" });
        }
        
        // Check if activity has capacity
        if (activity.participants.length >= activity.capacity) {
            return res.status(400).json({ message: "This activity is already at full capacity" });
        }
        
        // Check if student is already registered
        if (activity.participants.includes(req.user.id)) {
            return res.status(400).json({ message: "You are already registered for this activity" });
        }
        
        // Add student to activity participants
        activity.participants.push(req.user.id);
        await activity.save();
        
        // Add activity to student activities
        const student = await Student.findById(req.user.id);
        student.activities.push(req.params.activityId);
        await student.save();
        
        res.status(200).json({ message: "Successfully registered for activity" });
    } catch (error) {
        res.status(500).json({ message: "Error registering for activity", error: error.message });
    }
});

// Deregister from an activity (Student protected route)
router.post("/student/activities/:activityId/deregister", verifyStudent, async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.activityId);
        
        if (!activity) {
            return res.status(404).json({ message: "Activity not found" });
        }
        
        // Remove student from activity participants
        activity.participants = activity.participants.filter(
            participant => participant.toString() !== req.user.id
        );
        await activity.save();
        
        // Remove activity from student activities
        const student = await Student.findById(req.user.id);
        student.activities = student.activities.filter(
            activityId => activityId.toString() !== req.params.activityId
        );
        await student.save();
        
        res.status(200).json({ message: "Successfully deregistered from activity" });
    } catch (error) {
        res.status(500).json({ message: "Error deregistering from activity", error: error.message });
    }
});

// Get all students (School or Admin only)
router.get("/students", verifySchoolOrAdmin, async (req, res) => {
    try {
        let query = {};
        
        // If school is making the request, only show students associated with that school
        if (req.user.rol === 'school') {
            query.school = req.user.id;
        }
        
        const students = await Student.find(query)
            .select("-password")
            .populate("school", "name");
            
        res.status(200).json(students);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving students", error: error.message });
    }
});

// Delete student (Admin only)
router.delete("/student/:id", verifyAdmin, async (req, res) => {
    try {
        const student = await Student.findByIdAndDelete(req.params.id);
        
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        
        // Also remove student from all activities they were registered for
        await Activity.updateMany(
            { participants: req.params.id },
            { $pull: { participants: req.params.id } }
        );
        
        res.status(200).json({ message: "Student successfully deleted" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting student", error: error.message });
    }
});

module.exports = router; 