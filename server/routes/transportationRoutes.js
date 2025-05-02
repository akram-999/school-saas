const router = require("express").Router();
const Transportation = require("../models/Transportation");
const Driver = require("../models/Driver");
const Student = require("../models/Student");
const { verifySchool } = require("../config/jwt");

// Create a new vehicle (School only)
router.post("/transportation", verifySchool, async (req, res) => {
    try {
        const { name, busNumber, type, driver, capacity, notes } = req.body;
        
        // Check if vehicle with same busNumber already exists
        const existingVehicle = await Transportation.findOne({ busNumber, school: req.user.id });
        if (existingVehicle) {
            return res.status(400).json({ message: "Vehicle with this bus number already exists" });
        }
        
        // Create new vehicle
        const newVehicle = new Transportation({
            name,
            busNumber,
            type,
            capacity,
            notes,
            driver,
            school: req.user.id,
            status: 'active'
        });

        // Save vehicle
        const createdVehicle = await newVehicle.save();
        
        // If driver is assigned, update driver's record
        if (driver) {
            await Driver.findByIdAndUpdate(driver, {
                $addToSet: { vehicles: createdVehicle._id }
            });
        }
        
        res.status(201).json(createdVehicle);
    } catch (error) {
        res.status(500).json({ message: 'Error creating vehicle', error: error.message });
    }
});

// Get all vehicles for a school
router.get("/transportation", verifySchool, async (req, res) => {
    try {
        const vehicles = await Transportation.find({ school: req.user.id })
            .populate("driver", "firstName lastName phoneNumber licenseNumber");
            
        res.status(200).json(vehicles);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving vehicles", error: error.message });
    }
});

// Get a specific vehicle
router.get("/transportation/:id", verifySchool, async (req, res) => {
    try {
        const vehicleDetails = await Transportation.findOne({
            _id: req.params.id,
            school: req.user.id
        })
        .populate("driver", "firstName lastName phoneNumber licenseExpiry")
        .populate("student", "firstName lastName class");
            
        if (!vehicleDetails) {
            return res.status(404).json({ message: "Vehicle not found" });
        }
        
        res.status(200).json(vehicleDetails);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving vehicle", error: error.message });
    }
});

// Update a vehicle (School only)
router.put("/transportation/:id", verifySchool, async (req, res) => {
    try {
        const { name, busNumber, type, driver, capacity, status, notes } = req.body;
        
        const vehicleDetails = await Transportation.findOne({
            _id: req.params.id,
            school: req.user.id
        });
        
        if (!vehicleDetails) {
            return res.status(404).json({ message: "Vehicle not found" });
        }
        
        // If busNumber is being changed, check it's not already used
        if (busNumber && busNumber !== vehicleDetails.busNumber) {
            const existingVehicle = await Transportation.findOne({ 
                busNumber,
                school: req.user.id,
                _id: { $ne: req.params.id }
            });
            if (existingVehicle) {
                return res.status(400).json({ message: "Another vehicle with this bus number already exists" });
            }
        }
        
        // Handle driver assignment change if provided
        if (driver !== undefined && driver !== vehicleDetails.driver?.toString()) {
            // If there was a previous driver, remove this vehicle from their record
            if (vehicleDetails.driver) {
                await Driver.findByIdAndUpdate(vehicleDetails.driver, {
                    $pull: { vehicles: vehicleDetails._id }
                });
            }
            
            // If a new driver is assigned, update their record
            if (driver) {
                await Driver.findByIdAndUpdate(driver, {
                    $addToSet: { vehicles: vehicleDetails._id }
                });
            }
        }
        
        // Prepare update object
        const updateObj = {};
        if (name) updateObj.name = name;
        if (busNumber) updateObj.busNumber = busNumber;
        if (type) updateObj.type = type;
        if (driver !== undefined) updateObj.driver = driver || null;
        if (capacity) updateObj.capacity = capacity;
        if (status) updateObj.status = status;
        if (notes !== undefined) updateObj.notes = notes;
        
        // Update vehicle
        const updatedVehicle = await Transportation.findByIdAndUpdate(
            req.params.id,
            { $set: updateObj },
            { new: true }
        ).populate("driver", "firstName lastName phoneNumber");
        
        res.status(200).json(updatedVehicle);
    } catch (error) {
        res.status(500).json({ message: "Error updating vehicle", error: error.message });
    }
});

// Delete a vehicle (School only)
router.delete("/transportation/:id", verifySchool, async (req, res) => {
    try {
        const vehicleDetails = await Transportation.findOne({
            _id: req.params.id,
            school: req.user.id
        });
        
        if (!vehicleDetails) {
            return res.status(404).json({ message: "Vehicle not found" });
        }
        
        // Remove this vehicle from driver's record if assigned
        if (vehicleDetails.driver) {
            await Driver.findByIdAndUpdate(vehicleDetails.driver, {
                $pull: { vehicles: vehicleDetails._id }
            });
        }
        
        // Update students who use this transportation
        await Student.updateMany(
            { transportation: vehicleDetails._id },
            { $unset: { transportation: "" } }
        );
        
        await Transportation.findByIdAndDelete(req.params.id);
        
        res.status(200).json({ message: "Vehicle successfully deleted" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting vehicle", error: error.message });
    }
});

// Assign a student to a vehicle (School only)
router.post("/transportation/:id/students", verifySchool, async (req, res) => {
    try {
        const { studentId } = req.body;
        
        if (!studentId) {
            return res.status(400).json({ message: "Student ID is required" });
        }
        
        const vehicleDetails = await Transportation.findOne({
            _id: req.params.id,
            school: req.user.id
        });
        
        if (!vehicleDetails) {
            return res.status(404).json({ message: "Vehicle not found" });
        }
        
        const student = await Student.findOne({
            _id: studentId,
            school: req.user.id
        });
        
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        
        // Check if student is already assigned to another vehicle
        if (student.transportation) {
            // Remove student from previous vehicle
            await Transportation.findByIdAndUpdate(student.transportation, {
                $pull: { student: studentId }
            });
        }
        
        // Update student's transportation
        student.transportation = vehicleDetails._id;
        await student.save();
        
        // Update vehicle's students
        vehicleDetails.student = studentId;
        await vehicleDetails.save();
        
        res.status(200).json({ message: "Student assigned to vehicle successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error assigning student to vehicle", error: error.message });
    }
});

// Remove a student from a vehicle (School only)
router.delete("/transportation/:id/students/:studentId", verifySchool, async (req, res) => {
    try {
        const vehicleDetails = await Transportation.findOne({
            _id: req.params.id,
            school: req.user.id
        });
        
        if (!vehicleDetails) {
            return res.status(404).json({ message: "Vehicle not found" });
        }
        
        // Update student's transportation
        await Student.updateOne(
            { _id: req.params.studentId },
            { $unset: { transportation: "" } }
        );
        
        // Remove student from vehicle
        vehicleDetails.student = null;
        await vehicleDetails.save();
        
        res.status(200).json({ message: "Student removed from vehicle successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error removing student from vehicle", error: error.message });
    }
});

module.exports = router; 