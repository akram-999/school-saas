const router = require("express").Router();
const Class = require("../models/Class");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const Subject = require("../models/Subject");
const Guard = require("../models/Guard");
const jwt = require("jsonwebtoken");
const { verifySchool, verifyTeacher, verifySchoolOrTeacher, verifyGuardOrSchool } = require("../config/jwt");

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

// Create a new class (School or Guard)
router.post("/classes", verifyGuardOrSchool, async (req, res) => {
    try {
        const { name, grade, section, capacity, teacher, subjects, cycle, academicYear, room, schedule } = req.body;
        
        // Get the school ID based on user role
        const schoolId = await getSchoolId(req);
        if (!schoolId) {
            return res.status(404).json({ message: "School not found" });
        }
        
        // Create new class
        const newClass = new Class({
            name,
            grade,
            section,
            capacity,
            teacher,
            subjects: subjects || [],
            cycle,
            academicYear,
            room,
            schedule,
            school: schoolId,
            students: []
        });

        // Save class
        const createdClass = await newClass.save();
        
        // If teacher is assigned, update teacher's record
        if (teacher) {
            await Teacher.findByIdAndUpdate(teacher, {
                $addToSet: { classes: createdClass._id }
            });
        }
        
        // If subjects are assigned, update each subject
        if (subjects && subjects.length > 0) {
            await Subject.updateMany(
                { _id: { $in: subjects } },
                { $addToSet: { classes: createdClass._id } }
            );
        }
        
        res.status(201).json(createdClass);
    } catch (error) {
        res.status(500).json({ message: 'Error creating class', error: error.message });
    }
});

// Get all classes for a school (School or Guard)
router.get("/classes", verifyGuardOrSchool, async (req, res) => {
    try {
        // Get the school ID based on user role
        const schoolId = await getSchoolId(req);
        if (!schoolId) {
            return res.status(404).json({ message: "School not found" });
        }
        
        const classes = await Class.find({ school: schoolId })
            .populate("teacher", "firstName lastName email")
            .populate("subjects", "name code")
            .populate("cycle", "name type");
            
        res.status(200).json(classes);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving classes", error: error.message });
    }
});

// Get a specific class (School, Teacher, or Guard)
router.get("/classes/:id", async (req, res) => {
    try {
        const query = { _id: req.params.id };
        let hasAccess = false;
        let schoolId = null;
        
        // Check authorization based on user role from token
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.split(" ")[1];
            try {
                const decoded = jwt.verify(token, process.env.JWT_SEC);
                
                if (decoded.rol === 'school') {
                    schoolId = decoded.id;
                    query.school = schoolId;
                    hasAccess = true;
                } else if (decoded.rol === 'teacher') {
                    const teacherClasses = await Class.find({ teacher: decoded.id });
                    hasAccess = teacherClasses.some(cls => cls._id.toString() === req.params.id);
                } else if (decoded.rol === 'guard') {
                    const guard = await Guard.findById(decoded.id);
                    if (guard) {
                        schoolId = guard.school;
                        query.school = schoolId;
                        hasAccess = true;
                    }
                }
            } catch (error) {
                // Invalid token
                return res.status(401).json({ message: "Invalid token" });
            }
        }
        
        if (!hasAccess) {
            return res.status(403).json({ message: "You don't have permission to view this class" });
        }
        
        const classDetails = await Class.findOne(query)
            .populate("teacher", "firstName lastName email specialization")
            .populate("subjects", "name code description")
            .populate("students", "firstName lastName email")
            .populate("cycle", "name type startDate endDate");
            
        if (!classDetails) {
            return res.status(404).json({ message: "Class not found or you don't have permission" });
        }
        
        res.status(200).json(classDetails);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving class", error: error.message });
    }
});

// Update a class (School or Guard)
router.put("/classes/:id", verifyGuardOrSchool, async (req, res) => {
    try {
        const { name, grade, section, capacity, teacher, subjects, cycle, academicYear, room, schedule, isActive } = req.body;
        
        // Get the school ID based on user role
        const schoolId = await getSchoolId(req);
        if (!schoolId) {
            return res.status(404).json({ message: "School not found" });
        }
        
        const classDetails = await Class.findOne({
            _id: req.params.id,
            school: schoolId
        });
        
        if (!classDetails) {
            return res.status(404).json({ message: "Class not found" });
        }
        
        // Prepare update object
        const updateObj = {};
        if (name) updateObj.name = name;
        if (grade) updateObj.grade = grade;
        if (section) updateObj.section = section;
        if (capacity) updateObj.capacity = capacity;
        if (cycle) updateObj.cycle = cycle;
        if (academicYear) updateObj.academicYear = academicYear;
        if (room) updateObj.room = room;
        if (schedule) updateObj.schedule = schedule;
        if (isActive !== undefined) updateObj.isActive = isActive;
        
        // Handle teacher assignment change if provided
        if (teacher !== undefined) {
            // If there was a previous teacher, remove this class from their record
            if (classDetails.teacher) {
                await Teacher.findByIdAndUpdate(classDetails.teacher, {
                    $pull: { classes: classDetails._id }
                });
            }
            
            // If a new teacher is assigned, update their record
            if (teacher) {
                await Teacher.findByIdAndUpdate(teacher, {
                    $addToSet: { classes: classDetails._id }
                });
            }
            
            updateObj.teacher = teacher || null;
        }
        
        // Handle subjects changes if provided
        if (subjects) {
            // Remove this class from subjects that are no longer assigned
            const subjectsToRemove = classDetails.subjects.filter(id => !subjects.includes(id.toString()));
            if (subjectsToRemove.length > 0) {
                await Subject.updateMany(
                    { _id: { $in: subjectsToRemove } },
                    { $pull: { classes: classDetails._id } }
                );
            }
            
            // Add this class to newly assigned subjects
            const currentSubjects = classDetails.subjects.map(id => id.toString());
            const subjectsToAdd = subjects.filter(id => !currentSubjects.includes(id));
            if (subjectsToAdd.length > 0) {
                await Subject.updateMany(
                    { _id: { $in: subjectsToAdd } },
                    { $addToSet: { classes: classDetails._id } }
                );
            }
            
            updateObj.subjects = subjects;
        }
        
        // Update class
        const updatedClass = await Class.findByIdAndUpdate(
            req.params.id,
            { $set: updateObj },
            { new: true }
        )
        .populate("teacher", "firstName lastName email")
        .populate("subjects", "name code")
        .populate("cycle", "name type");
        
        res.status(200).json(updatedClass);
    } catch (error) {
        res.status(500).json({ message: "Error updating class", error: error.message });
    }
});

// Delete a class (School or Guard)
router.delete("/classes/:id", verifyGuardOrSchool, async (req, res) => {
    try {
        // Get the school ID based on user role
        const schoolId = await getSchoolId(req);
        if (!schoolId) {
            return res.status(404).json({ message: "School not found" });
        }
        
        const classDetails = await Class.findOne({
            _id: req.params.id,
            school: schoolId
        });
        
        if (!classDetails) {
            return res.status(404).json({ message: "Class not found" });
        }
        
        // Remove this class from teacher's record if assigned
        if (classDetails.teacher) {
            await Teacher.findByIdAndUpdate(classDetails.teacher, {
                $pull: { classes: classDetails._id }
            });
        }
        
        // Remove this class from all subjects
        if (classDetails.subjects && classDetails.subjects.length > 0) {
            await Subject.updateMany(
                { _id: { $in: classDetails.subjects } },
                { $pull: { classes: classDetails._id } }
            );
        }
        
        // Update student records to remove this class
        if (classDetails.students && classDetails.students.length > 0) {
            await Student.updateMany(
                { _id: { $in: classDetails.students } },
                { $unset: { class: "" } }
            );
        }
        
        await Class.findByIdAndDelete(req.params.id);
        
        res.status(200).json({ message: "Class successfully deleted" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting class", error: error.message });
    }
});

// Add a student to a class (School or Guard)
router.post("/classes/:id/students", verifyGuardOrSchool, async (req, res) => {
    try {
        const { studentId } = req.body;
        
        if (!studentId) {
            return res.status(400).json({ message: "Student ID is required" });
        }
        
        // Get the school ID based on user role
        const schoolId = await getSchoolId(req);
        if (!schoolId) {
            return res.status(404).json({ message: "School not found" });
        }
        
        const classDetails = await Class.findOne({
            _id: req.params.id,
            school: schoolId
        });
        
        if (!classDetails) {
            return res.status(404).json({ message: "Class not found" });
        }
        
        const student = await Student.findOne({
            _id: studentId,
            school: schoolId
        });
        
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        
        // Check if class is at capacity
        if (classDetails.students.length >= classDetails.capacity) {
            return res.status(400).json({ message: "Class is at maximum capacity" });
        }
        
        // Add student to class if not already there
        if (!classDetails.students.includes(studentId)) {
            classDetails.students.push(studentId);
            await classDetails.save();
            
            // Update student's class
            student.class = classDetails._id;
            await student.save();
        }
        
        res.status(200).json({ message: "Student added to class successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error adding student to class", error: error.message });
    }
});

// Remove a student from a class (School or Guard)
router.delete("/classes/:id/students/:studentId", verifyGuardOrSchool, async (req, res) => {
    try {
        // Get the school ID based on user role
        const schoolId = await getSchoolId(req);
        if (!schoolId) {
            return res.status(404).json({ message: "School not found" });
        }
        
        const classDetails = await Class.findOne({
            _id: req.params.id,
            school: schoolId
        });
        
        if (!classDetails) {
            return res.status(404).json({ message: "Class not found" });
        }
        
        // Remove student from class
        classDetails.students = classDetails.students.filter(
            student => student.toString() !== req.params.studentId
        );
        await classDetails.save();
        
        // Remove class from student
        await Student.updateOne(
            { _id: req.params.studentId },
            { $unset: { class: "" } }
        );
        
        res.status(200).json({ message: "Student removed from class successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error removing student from class", error: error.message });
    }
});

// Get all students in a class (School, Teacher, or Guard)
router.get("/classes/:id/students", async (req, res) => {
    try {
        // Check authorization based on user role from token
        let hasAccess = false;
        let schoolId = null;
        
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: "Authentication required" });
        }
        
        const token = authHeader.split(" ")[1];
        let decoded;
        
        try {
            decoded = jwt.verify(token, process.env.JWT_SEC);
        } catch (error) {
            return res.status(401).json({ message: "Invalid token" });
        }
        
        const classDetails = await Class.findById(req.params.id);
        if (!classDetails) {
            return res.status(404).json({ message: "Class not found" });
        }
        
        if (decoded.rol === 'teacher') {
            // Teachers can see students in classes they teach
            hasAccess = classDetails.teacher && classDetails.teacher.toString() === decoded.id;
        } else if (decoded.rol === 'school') {
            // Schools can see students in their classes
            hasAccess = classDetails.school.toString() === decoded.id;
            schoolId = decoded.id;
        } else if (decoded.rol === 'guard') {
            // Guards can see students in classes from their school
            const guard = await Guard.findById(decoded.id);
            if (guard) {
                schoolId = guard.school;
                hasAccess = classDetails.school.toString() === schoolId.toString();
            }
        }
        
        if (!hasAccess) {
            return res.status(403).json({ message: "You don't have permission to view students in this class" });
        }
        
        // Get all students in this class
        const students = await Student.find({ _id: { $in: classDetails.students } })
            .select("-password");
            
        res.status(200).json(students);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving class students", error: error.message });
    }
});

module.exports = router; 