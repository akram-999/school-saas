const router = require("express").Router();
const Student = require("../models/Student");
const Activity = require("../models/Activity");
const Guard = require("../models/Guard");
const Teacher = require("../models/Teacher");
const Class = require("../models/Class");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { 
    verifyToken,
    verifySchool, 
    verifyAdmin, 
    verifyStudent, 
    verifyTeacher,
    verifySchoolOrAdmin, 
    generateStudentToken 
} = require("../config/jwt");

// Student Registration (Only School can register)
router.post("/student/register", verifySchool, async (req, res) => {
    try {
        const { firstName, lastName, email, password, dateOfBirth, phoneNumber, address } = req.body;
        
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
            school: req.user.id, // Set school to the authenticated school's ID
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

// Get Student Profile 
router.get("/student/profile", async (req, res) => {
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

// Update Student Profile (Student can update own profile)
router.put("/student/profile", verifyToken, async (req, res) => {
    try {
        // Check if request is from the student themselves
        if (req.user.rol === 'student') {
            return updateStudentProfile(req.user.id, req.body, res);
        } else {
            return res.status(403).json({ message: "Use the appropriate endpoint to update student information" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error updating profile", error: error.message });
    }
});

// Update Student by ID (School, Guard can update any student in their school)
router.put("/students/:id", verifyToken, async (req, res) => {
    try {
        const studentId = req.params.id;
        
        // Find the student
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        
        // Check permissions based on role
        if (req.user.rol === 'school') {
            // School can update any student in their school
            if (student.school.toString() !== req.user.id) {
                return res.status(403).json({ message: "You can only update students in your school" });
            }
            
            return updateStudentProfile(studentId, req.body, res);
            
        } else if (req.user.rol === 'guard') {
            // Guard can update any student in their school
            const guard = await Guard.findById(req.user.id);
            if (!guard) {
                return res.status(404).json({ message: "Guard not found" });
            }
            
            if (student.school.toString() !== guard.school.toString()) {
                return res.status(403).json({ message: "You can only update students in your school" });
            }
            
            return updateStudentProfile(studentId, req.body, res);
            
        } else if (req.user.rol === 'student') {
            // Students can only update their own profile through /student/profile
            return res.status(403).json({ 
                message: "Students should use the /student/profile endpoint to update their profile" 
            });
        } else {
            return res.status(403).json({ message: "You are not authorized to update student information" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error updating student", error: error.message });
    }
});

// Helper function to update student profile
async function updateStudentProfile(studentId, updateData, res) {
    try {
        const { firstName, lastName, email, password, dateOfBirth, phoneNumber, address, image, class: classId } = updateData;
        
        // Prepare update object
        const updateObj = {};
        if (firstName) updateObj.firstName = firstName;
        if (lastName) updateObj.lastName = lastName;
        if (email) updateObj.email = email;
        if (dateOfBirth) updateObj.dateOfBirth = dateOfBirth;
        if (phoneNumber) updateObj.phoneNumber = phoneNumber;
        if (address) updateObj.address = address;
        if (image) updateObj.image = image;
        if (classId) updateObj.class = classId;
        
        // Handle password update if provided
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateObj.password = await bcrypt.hash(password, salt);
        }
        
        // Update student
        const updatedStudent = await Student.findByIdAndUpdate(
            studentId,
            { $set: updateObj },
            { new: true }
        ).select("-password");
        
        return res.status(200).json(updatedStudent);
    } catch (error) {
        return res.status(500).json({ message: "Error updating profile", error: error.message });
    }
}

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

// Get all students (Admin, School, or Guard)
router.get("/students", verifyToken, async (req, res) => {
    try {
        let query = {};
        let populateOptions = {
            path: "school",
            select: "name"
        };
        
        // Different query based on user role
        if (req.user.rol === 'school') {
            // Schools can only see students in their school
            query.school = req.user.id;
        } else if (req.user.rol === 'guard') {
            // Guards can only see students in their school
            const guard = await Guard.findById(req.user.id);
            if (!guard) {
                return res.status(404).json({ message: "Guard not found" });
            }
            query.school = guard.school;
        } else if (req.user.rol === 'teacher') {
            // Teachers should use the other route for students
            return res.status(403).json({ 
                message: "Teachers should use the /teacher/students endpoint to view their students" 
            });
        } else if (req.user.rol !== 'admin') {
            // Only admin, school, or guard can access this route
            return res.status(403).json({ message: "You are not authorized to view students" });
        }
        
        const students = await Student.find(query)
            .select("-password")
            .populate(populateOptions)
            .populate("class", "name");
            
        res.status(200).json(students);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving students", error: error.message });
    }
});

// Get students for a teacher (Teacher only)
router.get("/teacher/students", verifyTeacher, async (req, res) => {
    try {
        // Get the teacher's subjects and classes
        const teacher = await Teacher.findById(req.user.id)
            .populate("subjects");
        
        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }
        
        // Get all classes associated with teacher's subjects
        const subjectIds = teacher.subjects.map(subject => subject._id);
        
        const classes = await Class.find({
            subjects: { $in: subjectIds }
        });
        
        const classIds = classes.map(cls => cls._id);
        
        // Find students in these classes
        const students = await Student.find({
            class: { $in: classIds },
            school: teacher.school
        })
        .select("-password")
        .populate("class", "name")
        .populate("school", "name");
        
        res.status(200).json(students);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving students", error: error.message });
    }
});

// Delete student (Admin or School)
router.delete("/student/:id", verifySchoolOrAdmin, async (req, res) => {
    try {
        let studentQuery = { _id: req.params.id };
        
        // If school is making the request, only allow deleting students of that school
        if (req.user.rol === 'school') {
            studentQuery.school = req.user.id;
        }
        
        const student = await Student.findOne(studentQuery);
        
        if (!student) {
            return res.status(404).json({ message: "Student not found or you don't have permission to delete this student" });
        }
        
        await Student.findByIdAndDelete(req.params.id);
        
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