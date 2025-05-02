const router = require("express").Router();
const Class = require("../models/Class");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const Subject = require("../models/Subject");
const { verifySchool, verifyTeacher, verifySchoolOrTeacher } = require("../config/jwt");

// Create a new class (School only)
router.post("/classes", verifySchool, async (req, res) => {
    try {
        const { name, grade, section, capacity, teacher, subjects, cycle, academicYear, room, schedule } = req.body;
        
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
            school: req.user.id,
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

// Get all classes for a school
router.get("/classes", verifySchool, async (req, res) => {
    try {
        const classes = await Class.find({ school: req.user.id })
            .populate("teacher", "firstName lastName email")
            .populate("subjects", "name code")
            .populate("cycle", "name type");
            
        res.status(200).json(classes);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving classes", error: error.message });
    }
});

// Get a specific class
router.get("/classes/:id", verifySchoolOrTeacher, async (req, res) => {
    try {
        const query = { _id: req.params.id };
        
        // If teacher is making the request, verify they're assigned to this class
        if (req.user.rol === 'teacher') {
            const teacherClasses = await Class.find({ teacher: req.user.id });
            const isTeacherClass = teacherClasses.some(cls => cls._id.toString() === req.params.id);
            
            if (!isTeacherClass) {
                return res.status(403).json({ message: "You don't have permission to view this class" });
            }
        } else if (req.user.rol === 'school') {
            query.school = req.user.id;
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

// Update a class (School only)
router.put("/classes/:id", verifySchool, async (req, res) => {
    try {
        const { name, grade, section, capacity, teacher, subjects, cycle, academicYear, room, schedule, isActive } = req.body;
        
        const classDetails = await Class.findOne({
            _id: req.params.id,
            school: req.user.id
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

// Delete a class (School only)
router.delete("/classes/:id", verifySchool, async (req, res) => {
    try {
        const classDetails = await Class.findOne({
            _id: req.params.id,
            school: req.user.id
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

// Add a student to a class (School only)
router.post("/classes/:id/students", verifySchool, async (req, res) => {
    try {
        const { studentId } = req.body;
        
        if (!studentId) {
            return res.status(400).json({ message: "Student ID is required" });
        }
        
        const classDetails = await Class.findOne({
            _id: req.params.id,
            school: req.user.id
        });
        
        if (!classDetails) {
            return res.status(404).json({ message: "Class not found" });
        }
        
        const student = await Student.findOne({
            _id: studentId,
            school: req.user.id
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

// Remove a student from a class (School only)
router.delete("/classes/:id/students/:studentId", verifySchool, async (req, res) => {
    try {
        const classDetails = await Class.findOne({
            _id: req.params.id,
            school: req.user.id
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

// Get all students in a class
router.get("/classes/:id/students", verifySchoolOrTeacher, async (req, res) => {
    try {
        const classDetails = await Class.findById(req.params.id);
        
        if (!classDetails) {
            return res.status(404).json({ message: "Class not found" });
        }
        
        // Verify permissions
        if (req.user.rol === 'teacher' && classDetails.teacher.toString() !== req.user.id) {
            return res.status(403).json({ message: "You don't have permission to view students in this class" });
        } else if (req.user.rol === 'school' && classDetails.school.toString() !== req.user.id) {
            return res.status(403).json({ message: "This class does not belong to your school" });
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