const router = require("express").Router();
const Schedule = require("../models/Schedule");
const Class = require("../models/Class");
const Subject = require("../models/Subject");
const Teacher = require("../models/Teacher");
const { verifySchool, verifyGuardOrSchool } = require("../config/jwt");

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

// Create a new schedule (School or Guard)
router.post("/schedules", verifyGuardOrSchool, async (req, res) => {
    try {
        const { classId, day, periods } = req.body;
        
        // Get the school ID based on user role
        const schoolId = await getSchoolId(req);
        if (!schoolId) {
            return res.status(404).json({ message: "School not found" });
        }

        // Validate class exists and belongs to school
        const classExists = await Class.findOne({
            _id: classId,
            school: schoolId
        });
        if (!classExists) {
            return res.status(404).json({ message: "Class not found" });
        }

        // Validate day
        const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        if (!validDays.includes(day)) {
            return res.status(400).json({ message: "Invalid day" });
        }

        // Validate periods
        if (!Array.isArray(periods) || periods.length === 0) {
            return res.status(400).json({ message: "At least one period is required" });
        }

        // Validate each period
        for (const period of periods) {
            const { startTime, endTime, subjectId, teacherId, room } = period;

            // Validate time format (HH:MM)
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
                return res.status(400).json({ message: "Invalid time format. Use HH:MM" });
            }

            // Validate subject exists and belongs to school
            const subjectExists = await Subject.findOne({
                _id: subjectId,
                school: schoolId
            });
            if (!subjectExists) {
                return res.status(404).json({ message: "Subject not found" });
            }

            // Validate teacher if provided
            if (teacherId) {
                const teacherExists = await Teacher.findOne({
                    _id: teacherId,
                    school: schoolId
                });
                if (!teacherExists) {
                    return res.status(404).json({ message: "Teacher not found" });
                }
            }
        }

        // Check for schedule conflicts
        const existingSchedule = await Schedule.findOne({
            classId,
            day,
            'periods.startTime': { $in: periods.map(p => p.startTime) }
        });
        if (existingSchedule) {
            return res.status(400).json({ message: "Schedule conflict detected" });
        }

        // Create new schedule
        const newSchedule = new Schedule({
            classId,
            schoolId,
            day,
            periods
        });

        const createdSchedule = await newSchedule.save();
        res.status(201).json(createdSchedule);
    } catch (error) {
        res.status(500).json({ message: "Error creating schedule", error: error.message });
    }
});

// Get all schedules for a school (School or Guard)
router.get("/schedules", verifyGuardOrSchool, async (req, res) => {
    try {
        const schoolId = await getSchoolId(req);
        if (!schoolId) {
            return res.status(404).json({ message: "School not found" });
        }

        const schedules = await Schedule.find({ schoolId })
            .populate("classId", "name grade section")
            .populate("periods.subjectId", "name code")
            .populate("periods.teacherId", "firstName lastName email");

        res.status(200).json(schedules);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving schedules", error: error.message });
    }
});

// Get schedule for a specific class (School or Guard)
router.get("/schedules/class/:classId", verifyGuardOrSchool, async (req, res) => {
    try {
        const schoolId = await getSchoolId(req);
        if (!schoolId) {
            return res.status(404).json({ message: "School not found" });
        }

        const schedules = await Schedule.find({
            classId: req.params.classId,
            schoolId
        })
        .populate("classId", "name grade section")
        .populate("periods.subjectId", "name code")
        .populate("periods.teacherId", "firstName lastName email");

        if (!schedules || schedules.length === 0) {
            return res.status(404).json({ message: "No schedules found for this class" });
        }

        res.status(200).json(schedules);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving class schedule", error: error.message });
    }
});

// Update a schedule (School or Guard)
router.put("/schedules/:id", verifyGuardOrSchool, async (req, res) => {
    try {
        const { day, periods } = req.body;
        const schoolId = await getSchoolId(req);
        if (!schoolId) {
            return res.status(404).json({ message: "School not found" });
        }

        const schedule = await Schedule.findOne({
            _id: req.params.id,
            schoolId
        });

        if (!schedule) {
            return res.status(404).json({ message: "Schedule not found" });
        }

        // Validate day if provided
        if (day) {
            const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
            if (!validDays.includes(day)) {
                return res.status(400).json({ message: "Invalid day" });
            }
        }

        // Validate periods if provided
        if (periods) {
            if (!Array.isArray(periods) || periods.length === 0) {
                return res.status(400).json({ message: "At least one period is required" });
            }

            // Validate each period
            for (const period of periods) {
                const { startTime, endTime, subjectId, teacherId } = period;

                // Validate time format
                const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
                if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
                    return res.status(400).json({ message: "Invalid time format. Use HH:MM" });
                }

                // Validate subject exists and belongs to school
                const subjectExists = await Subject.findOne({
                    _id: subjectId,
                    school: schoolId
                });
                if (!subjectExists) {
                    return res.status(404).json({ message: "Subject not found" });
                }

                // Validate teacher if provided
                if (teacherId) {
                    const teacherExists = await Teacher.findOne({
                        _id: teacherId,
                        school: schoolId
                    });
                    if (!teacherExists) {
                        return res.status(404).json({ message: "Teacher not found" });
                    }
                }
            }

            // Check for schedule conflicts
            const existingSchedule = await Schedule.findOne({
                classId: schedule.classId,
                day: day || schedule.day,
                'periods.startTime': { $in: periods.map(p => p.startTime) },
                _id: { $ne: schedule._id }
            });
            if (existingSchedule) {
                return res.status(400).json({ message: "Schedule conflict detected" });
            }
        }

        // Update schedule
        const updateObj = {};
        if (day) updateObj.day = day;
        if (periods) updateObj.periods = periods;

        const updatedSchedule = await Schedule.findByIdAndUpdate(
            req.params.id,
            { $set: updateObj },
            { new: true }
        )
        .populate("classId", "name grade section")
        .populate("periods.subjectId", "name code")
        .populate("periods.teacherId", "firstName lastName email");

        res.status(200).json(updatedSchedule);
    } catch (error) {
        res.status(500).json({ message: "Error updating schedule", error: error.message });
    }
});

// Delete a schedule (School or Guard)
router.delete("/schedules/:id", verifyGuardOrSchool, async (req, res) => {
    try {
        const schoolId = await getSchoolId(req);
        if (!schoolId) {
            return res.status(404).json({ message: "School not found" });
        }

        const schedule = await Schedule.findOne({
            _id: req.params.id,
            schoolId
        });

        if (!schedule) {
            return res.status(404).json({ message: "Schedule not found" });
        }

        await Schedule.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Schedule successfully deleted" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting schedule", error: error.message });
    }
});

module.exports = router; 