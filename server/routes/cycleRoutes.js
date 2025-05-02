const router = require("express").Router();
const Cycle = require("../models/Cycle");
const Class = require("../models/Class");
const { verifySchool } = require("../config/jwt");

// Create a new cycle (School only)
router.post("/cycles", verifySchool, async (req, res) => {
    try {
        const { name, description, startDate, endDate, type, academicYear, gradePostingStartDate, gradePostingEndDate } = req.body;
        
        // Create new cycle
        const newCycle = new Cycle({
            name,
            description,
            startDate,
            endDate,
            type,
            academicYear,
            gradePostingStartDate,
            gradePostingEndDate,
            school: req.user.id,
            classes: []
        });

        // Save cycle
        const createdCycle = await newCycle.save();
        
        res.status(201).json(createdCycle);
    } catch (error) {
        res.status(500).json({ message: 'Error creating cycle', error: error.message });
    }
});

// Get all cycles for a school
router.get("/cycles", verifySchool, async (req, res) => {
    try {
        const cycles = await Cycle.find({ school: req.user.id })
            .populate("classes", "name grade section");
            
        res.status(200).json(cycles);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving cycles", error: error.message });
    }
});

// Get a specific cycle
router.get("/cycles/:id", verifySchool, async (req, res) => {
    try {
        const cycleDetails = await Cycle.findOne({
            _id: req.params.id,
            school: req.user.id
        })
        .populate("classes", "name grade section capacity teacher students");
            
        if (!cycleDetails) {
            return res.status(404).json({ message: "Cycle not found" });
        }
        
        res.status(200).json(cycleDetails);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving cycle", error: error.message });
    }
});

// Update a cycle (School only)
router.put("/cycles/:id", verifySchool, async (req, res) => {
    try {
        const { name, description, startDate, endDate, type, academicYear, gradePostingStartDate, gradePostingEndDate, isActive } = req.body;
        
        const cycleDetails = await Cycle.findOne({
            _id: req.params.id,
            school: req.user.id
        });
        
        if (!cycleDetails) {
            return res.status(404).json({ message: "Cycle not found" });
        }
        
        // Prepare update object
        const updateObj = {};
        if (name) updateObj.name = name;
        if (description) updateObj.description = description;
        if (startDate) updateObj.startDate = startDate;
        if (endDate) updateObj.endDate = endDate;
        if (type) updateObj.type = type;
        if (academicYear) updateObj.academicYear = academicYear;
        if (gradePostingStartDate) updateObj.gradePostingStartDate = gradePostingStartDate;
        if (gradePostingEndDate) updateObj.gradePostingEndDate = gradePostingEndDate;
        if (isActive !== undefined) updateObj.isActive = isActive;
        
        // Update cycle
        const updatedCycle = await Cycle.findByIdAndUpdate(
            req.params.id,
            { $set: updateObj },
            { new: true }
        ).populate("classes", "name grade section");
        
        res.status(200).json(updatedCycle);
    } catch (error) {
        res.status(500).json({ message: "Error updating cycle", error: error.message });
    }
});

// Delete a cycle (School only)
router.delete("/cycles/:id", verifySchool, async (req, res) => {
    try {
        const cycleDetails = await Cycle.findOne({
            _id: req.params.id,
            school: req.user.id
        });
        
        if (!cycleDetails) {
            return res.status(404).json({ message: "Cycle not found" });
        }
        
        // Update classes to remove this cycle
        if (cycleDetails.classes && cycleDetails.classes.length > 0) {
            await Class.updateMany(
                { _id: { $in: cycleDetails.classes } },
                { $unset: { cycle: "" } }
            );
        }
        
        await Cycle.findByIdAndDelete(req.params.id);
        
        res.status(200).json({ message: "Cycle successfully deleted" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting cycle", error: error.message });
    }
});

// Add a class to a cycle (School only)
router.post("/cycles/:id/classes", verifySchool, async (req, res) => {
    try {
        const { classId } = req.body;
        
        if (!classId) {
            return res.status(400).json({ message: "Class ID is required" });
        }
        
        const cycleDetails = await Cycle.findOne({
            _id: req.params.id,
            school: req.user.id
        });
        
        if (!cycleDetails) {
            return res.status(404).json({ message: "Cycle not found" });
        }
        
        const classDetails = await Class.findOne({
            _id: classId,
            school: req.user.id
        });
        
        if (!classDetails) {
            return res.status(404).json({ message: "Class not found" });
        }
        
        // Add class to cycle if not already there
        if (!cycleDetails.classes.includes(classId)) {
            cycleDetails.classes.push(classId);
            await cycleDetails.save();
            
            // Update class's cycle
            classDetails.cycle = cycleDetails._id;
            await classDetails.save();
        }
        
        res.status(200).json({ message: "Class added to cycle successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error adding class to cycle", error: error.message });
    }
});

// Remove a class from a cycle (School only)
router.delete("/cycles/:id/classes/:classId", verifySchool, async (req, res) => {
    try {
        const cycleDetails = await Cycle.findOne({
            _id: req.params.id,
            school: req.user.id
        });
        
        if (!cycleDetails) {
            return res.status(404).json({ message: "Cycle not found" });
        }
        
        // Remove class from cycle
        cycleDetails.classes = cycleDetails.classes.filter(
            cls => cls.toString() !== req.params.classId
        );
        await cycleDetails.save();
        
        // Remove cycle from class
        await Class.updateOne(
            { _id: req.params.classId },
            { $unset: { cycle: "" } }
        );
        
        res.status(200).json({ message: "Class removed from cycle successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error removing class from cycle", error: error.message });
    }
});

module.exports = router; 