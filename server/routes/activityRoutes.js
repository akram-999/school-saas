const router = require("express").Router();
const Activity = require("../models/Activity");
const { verifyToken, verifySchool, verifyAdmin, verifySchoolOrAdmin } = require("../config/jwt");
const Student = require("../models/Student");
const Guard = require("../models/Guard");

// Create a new activity (School only)
router.post("/activities", verifySchool, async (req, res) => {
    try {
        const newActivity = new Activity({
            ...req.body,
            school: req.user.id // Set school ID from authenticated user
        });
        
        const activity = await newActivity.save();
        res.status(201).json(activity);
    } catch (error) {
        res.status(500).json({ message: "Error creating activity", error: error.message });
    }
});

// Get all activities (Public)
router.get("/activities", async (req, res) => {
    try {
        const query = {};
        
        // Filter by school if provided
        if (req.query.school) {
            query.school = req.query.school;
        }
        
        // Filter by category if provided
        if (req.query.category) {
            query.category = req.query.category;
        }
        
        // Filter by active status
        if (req.query.active === 'true') {
            query.isActive = true;
        }
        
        // Create date filter for current and future activities
        if (req.query.upcoming === 'true') {
            query.endDate = { $gte: new Date() };
        }
        
        const activities = await Activity.find(query)
            .populate("school", "name address phone email website image")
            .sort({ startDate: 1 });
            
        res.status(200).json(activities);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving activities", error: error.message });
    }
});

// Get activities created by the authenticated school (School only)
router.get("/school/activities", verifySchool, async (req, res) => {
    try {
        const activities = await Activity.find({ school: req.user.id })
            .sort({ createdAt: -1 });
            
        res.status(200).json(activities);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving school activities", error: error.message });
    }
});

// Get single activity by ID (Public)
router.get("/activities/:id", async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.id)
            .populate("school", "name address phone email website image")
            .populate("participants", "firstName lastName email"); // Only populate if we have a Student model
            
        if (!activity) {
            return res.status(404).json({ message: "Activity not found" });
        }
        
        res.status(200).json(activity);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving activity", error: error.message });
    }
});

// Update an activity (School owner only)
router.put("/activities/:id", verifySchool, async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.id);
        
        if (!activity) {
            return res.status(404).json({ message: "Activity not found" });
        }
        
        // Check if school owns this activity
        if (activity.school.toString() !== req.user.id) {
            return res.status(403).json({ message: "You can only update your own activities" });
        }
        
        const updatedActivity = await Activity.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );
        
        res.status(200).json(updatedActivity);
    } catch (error) {
        res.status(500).json({ message: "Error updating activity", error: error.message });
    }
});

// Delete an activity (School owner or Admin)
router.delete("/activities/:id", verifySchoolOrAdmin, async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.id);
        
        if (!activity) {
            return res.status(404).json({ message: "Activity not found" });
        }
        
        // If school (not admin) is trying to delete, check ownership
        if (req.user.rol === 'school' && activity.school.toString() !== req.user.id) {
            return res.status(403).json({ message: "You can only delete your own activities" });
        }
        
        await Activity.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Activity successfully deleted" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting activity", error: error.message });
    }
});

// Register a student for an activity (School or Guard can register students)
router.post("/activities/:id/register", verifyToken, async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.id);
        
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
        
        // Get student ID
        const studentId = req.body.studentId;
        if (!studentId) {
            return res.status(400).json({ message: "Student ID is required" });
        }
        
        // Find the student
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        
        // Check permissions based on role
        if (req.user.rol === 'school') {
            // School can only register students from their school
            if (student.school.toString() !== req.user.id) {
                return res.status(403).json({ message: "You can only register students from your school" });
            }
        } else if (req.user.rol === 'guard') {
            // Guard can only register students from their school
            const guard = await Guard.findById(req.user.id);
            if (!guard) {
                return res.status(404).json({ message: "Guard not found" });
            }
            
            if (student.school.toString() !== guard.school.toString()) {
                return res.status(403).json({ message: "You can only register students from your school" });
            }
        } else if (req.user.rol === 'student') {
            // Students can only register themselves
            if (studentId !== req.user.id) {
                return res.status(403).json({ message: "You can only register yourself for activities" });
            }
        } else {
            return res.status(403).json({ message: "You are not authorized to register students for activities" });
        }
        
        // Check if student is already registered
        if (activity.participants.includes(studentId)) {
            return res.status(400).json({ message: "Student is already registered for this activity" });
        }
        
        // Add student to participants
        activity.participants.push(studentId);
        await activity.save();
        
        // Add activity to student activities
        if (!student.activities) {
            student.activities = [];
        }
        student.activities.push(activity._id);
        await student.save();
        
        res.status(200).json({ message: "Student successfully registered for activity" });
    } catch (error) {
        res.status(500).json({ message: "Error registering for activity", error: error.message });
    }
});

// Deregister a student from an activity (School or Guard can deregister students)
router.post("/activities/:id/deregister", verifyToken, async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.id);
        
        if (!activity) {
            return res.status(404).json({ message: "Activity not found" });
        }
        
        // Get student ID
        const studentId = req.body.studentId;
        if (!studentId) {
            return res.status(400).json({ message: "Student ID is required" });
        }
        
        // Find the student
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        
        // Check permissions based on role
        if (req.user.rol === 'school') {
            // School can only deregister students from their school
            if (student.school.toString() !== req.user.id) {
                return res.status(403).json({ message: "You can only deregister students from your school" });
            }
        } else if (req.user.rol === 'guard') {
            // Guard can only deregister students from their school
            const guard = await Guard.findById(req.user.id);
            if (!guard) {
                return res.status(404).json({ message: "Guard not found" });
            }
            
            if (student.school.toString() !== guard.school.toString()) {
                return res.status(403).json({ message: "You can only deregister students from your school" });
            }
        } else if (req.user.rol === 'student') {
            // Students can only deregister themselves
            if (studentId !== req.user.id) {
                return res.status(403).json({ message: "You can only deregister yourself from activities" });
            }
        } else {
            return res.status(403).json({ message: "You are not authorized to deregister students from activities" });
        }
        
        // Check if student is registered for the activity
        if (!activity.participants.some(id => id.toString() === studentId)) {
            return res.status(400).json({ message: "Student is not registered for this activity" });
        }
        
        // Remove student from participants
        activity.participants = activity.participants.filter(
            participant => participant.toString() !== studentId
        );
        
        await activity.save();
        
        // Remove activity from student activities
        if (student.activities && student.activities.length > 0) {
            student.activities = student.activities.filter(
                act => act.toString() !== activity._id.toString()
            );
            await student.save();
        }
        
        res.status(200).json({ message: "Student successfully deregistered from activity" });
    } catch (error) {
        res.status(500).json({ message: "Error deregistering from activity", error: error.message });
    }
});

module.exports = router;
