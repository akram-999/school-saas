const router = require("express").Router();
const Subject = require("../models/Subject");
const Teacher = require("../models/Teacher");
const { verifySchool, verifySchoolOrTeacher } = require("../config/jwt");

// Create a new subject (School only)
router.post("/subjects", verifySchool, async (req, res) => {
    try {
        const { name, code, description, gradeLevel, credits, teachers } = req.body;
        
        // Check if subject code already exists for this school
        const exists = await Subject.findOne({ 
            code, 
            school: req.user.id 
        });
        
        if (exists) {
            return res.status(400).json({ message: 'Subject with this code already exists' });
        }

        // Create new subject
        const newSubject = new Subject({
            name,
            code,
            description,
            gradeLevel,
            credits,
            teachers: teachers || [],
            school: req.user.id,
        });

        // Save subject
        const subject = await newSubject.save();
        
        // If teachers were assigned, update each teacher's subjects array
        if (teachers && teachers.length > 0) {
            await Teacher.updateMany(
                { _id: { $in: teachers } },
                { $addToSet: { subjects: subject._id } }
            );
        }
        
        res.status(201).json(subject);
    } catch (error) {
        res.status(500).json({ message: 'Error creating subject', error: error.message });
    }
});

// Get all subjects for a school
router.get("/subjects", verifySchool, async (req, res) => {
    try {
        const subjects = await Subject.find({ school: req.user.id })
            .populate("teachers", "firstName lastName email specialization");
            
        res.status(200).json(subjects);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving subjects", error: error.message });
    }
});

// Get a specific subject
router.get("/subjects/:id", verifySchoolOrTeacher, async (req, res) => {
    try {
        // For teachers, only allow access to subjects they teach
        const query = { _id: req.params.id };
        
        if (req.user.rol === 'teacher') {
            query.teachers = req.user.id;
        } else if (req.user.rol === 'school') {
            query.school = req.user.id;
        }
        
        const subject = await Subject.findOne(query)
            .populate("teachers", "firstName lastName email specialization");
            
        if (!subject) {
            return res.status(404).json({ message: "Subject not found or you don't have permission" });
        }
        
        res.status(200).json(subject);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving subject", error: error.message });
    }
});

// Update a subject (School only)
router.put("/subjects/:id", verifySchool, async (req, res) => {
    try {
        const { name, description, gradeLevel, credits, teachers, isActive } = req.body;
        
        const subject = await Subject.findOne({
            _id: req.params.id,
            school: req.user.id
        });
        
        if (!subject) {
            return res.status(404).json({ message: "Subject not found" });
        }
        
        // Prepare update object
        const updateObj = {};
        if (name) updateObj.name = name;
        if (description) updateObj.description = description;
        if (gradeLevel) updateObj.gradeLevel = gradeLevel;
        if (credits) updateObj.credits = credits;
        if (isActive !== undefined) updateObj.isActive = isActive;
        
        // Handle teacher assignment changes if provided
        if (teachers) {
            // Remove this subject from teachers who are no longer assigned
            const teachersToRemove = subject.teachers.filter(id => !teachers.includes(id.toString()));
            if (teachersToRemove.length > 0) {
                await Teacher.updateMany(
                    { _id: { $in: teachersToRemove } },
                    { $pull: { subjects: subject._id } }
                );
            }
            
            // Add this subject to newly assigned teachers
            const currentTeachers = subject.teachers.map(id => id.toString());
            const teachersToAdd = teachers.filter(id => !currentTeachers.includes(id));
            if (teachersToAdd.length > 0) {
                await Teacher.updateMany(
                    { _id: { $in: teachersToAdd } },
                    { $addToSet: { subjects: subject._id } }
                );
            }
            
            updateObj.teachers = teachers;
        }
        
        // Update subject
        const updatedSubject = await Subject.findByIdAndUpdate(
            req.params.id,
            { $set: updateObj },
            { new: true }
        ).populate("teachers", "firstName lastName email specialization");
        
        res.status(200).json(updatedSubject);
    } catch (error) {
        res.status(500).json({ message: "Error updating subject", error: error.message });
    }
});

// Delete a subject (School only)
router.delete("/subjects/:id", verifySchool, async (req, res) => {
    try {
        const subject = await Subject.findOne({
            _id: req.params.id,
            school: req.user.id
        });
        
        if (!subject) {
            return res.status(404).json({ message: "Subject not found" });
        }
        
        // Remove this subject from all teachers
        await Teacher.updateMany(
            { subjects: req.params.id },
            { $pull: { subjects: req.params.id } }
        );
        
        await Subject.findByIdAndDelete(req.params.id);
        
        res.status(200).json({ message: "Subject successfully deleted" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting subject", error: error.message });
    }
});

// Assign a teacher to a subject (School only)
router.post("/subjects/:id/teachers", verifySchool, async (req, res) => {
    try {
        const { teacherId } = req.body;
        
        if (!teacherId) {
            return res.status(400).json({ message: "Teacher ID is required" });
        }
        
        const subject = await Subject.findOne({
            _id: req.params.id,
            school: req.user.id
        });
        
        if (!subject) {
            return res.status(404).json({ message: "Subject not found" });
        }
        
        const teacher = await Teacher.findOne({
            _id: teacherId,
            school: req.user.id
        });
        
        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }
        
        // Add teacher to subject if not already there
        if (!subject.teachers.includes(teacherId)) {
            subject.teachers.push(teacherId);
            await subject.save();
            
            // Add subject to teacher
            if (!teacher.subjects.includes(subject._id)) {
                teacher.subjects.push(subject._id);
                await teacher.save();
            }
        }
        
        res.status(200).json({ message: "Teacher assigned to subject successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error assigning teacher to subject", error: error.message });
    }
});

// Remove a teacher from a subject (School only)
router.delete("/subjects/:id/teachers/:teacherId", verifySchool, async (req, res) => {
    try {
        const subject = await Subject.findOne({
            _id: req.params.id,
            school: req.user.id
        });
        
        if (!subject) {
            return res.status(404).json({ message: "Subject not found" });
        }
        
        // Remove teacher from subject
        subject.teachers = subject.teachers.filter(
            teacher => teacher.toString() !== req.params.teacherId
        );
        await subject.save();
        
        // Remove subject from teacher
        await Teacher.updateOne(
            { _id: req.params.teacherId },
            { $pull: { subjects: req.params.id } }
        );
        
        res.status(200).json({ message: "Teacher removed from subject successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error removing teacher from subject", error: error.message });
    }
});

module.exports = router; 