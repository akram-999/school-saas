const router = require("express").Router();
const Driver = require("../models/Driver");
const Transportation = require("../models/Transportation");
const { verifySchool } = require("../config/jwt");

// Create a new driver (School only)
router.post("/drivers", verifySchool, async (req, res) => {
    try {
        const { 
            firstName, firstName_ar, lastName, lastName_ar,
            email, phoneNumber, address, cin, address_ar,
            licenseNumber, licenseExpiry, dateOfBirth,
            emergencyContact, image, status
        } = req.body;
        
        // Check if driver with same email already exists
        const existingDriver = await Driver.findOne({ email });
        if (existingDriver) {
            return res.status(400).json({ message: "Driver with this email already exists" });
        }

        // Check if driver with same license number already exists
        const existingLicense = await Driver.findOne({ licenseNumber });
        if (existingLicense) {
            return res.status(400).json({ message: "Driver with this license number already exists" });
        }
        
        // Validate emergency contact
        if (!emergencyContact || !emergencyContact.name || !emergencyContact.relationship || !emergencyContact.phoneNumber) {
            return res.status(400).json({ message: "Emergency contact information is required" });
        }
        
        // Create new driver
        const newDriver = new Driver({
            firstName,
            firstName_ar,
            lastName,
            lastName_ar,
            email,
            phoneNumber,
            cin,
            address,
            address_ar,
            school: req.user.id,
            licenseNumber,
            licenseExpiry,
            dateOfBirth,
            emergencyContact,
            image,
            status: status || 'active',
            vehicles: []
        });

        // Save driver
        const createdDriver = await newDriver.save();
        
        res.status(201).json(createdDriver);
    } catch (error) {
        res.status(500).json({ message: 'Error creating driver', error: error.message });
    }
});

// Get all drivers for a school
router.get("/drivers", verifySchool, async (req, res) => {
    try {
        const drivers = await Driver.find({ school: req.user.id })
            .populate("vehicles", "name busNumber type");
            
        res.status(200).json(drivers);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving drivers", error: error.message });
    }
});

// Get a specific driver
router.get("/drivers/:id", verifySchool, async (req, res) => {
    try {
        const driverDetails = await Driver.findOne({
            _id: req.params.id,
            school: req.user.id
        })
        .populate("vehicles", "name busNumber type capacity status");
            
        if (!driverDetails) {
            return res.status(404).json({ message: "Driver not found" });
        }
        
        res.status(200).json(driverDetails);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving driver", error: error.message });
    }
});

// Update a driver (School only)
router.put("/drivers/:id", verifySchool, async (req, res) => {
    try {
        const { 
            firstName, firstName_ar, lastName, lastName_ar,
            email, cin, phoneNumber, address, address_ar,
            licenseNumber, licenseExpiry, dateOfBirth,
            emergencyContact, image, status
        } = req.body;
        
        const driverDetails = await Driver.findOne({
            _id: req.params.id,
            school: req.user.id
        });
        
        if (!driverDetails) {
            return res.status(404).json({ message: "Driver not found" });
        }
        
        // If email is being changed, check it's not already used
        if (email && email !== driverDetails.email) {
            const existingDriver = await Driver.findOne({ email });
            if (existingDriver) {
                return res.status(400).json({ message: "Another driver with this email already exists" });
            }
        }

        // If license number is being changed, check it's not already used
        if (licenseNumber && licenseNumber !== driverDetails.licenseNumber) {
            const existingLicense = await Driver.findOne({ licenseNumber });
            if (existingLicense) {
                return res.status(400).json({ message: "Another driver with this license number already exists" });
            }
        }
        
        // Validate emergency contact if being updated
        if (emergencyContact) {
            if (!emergencyContact.name || !emergencyContact.relationship || !emergencyContact.phoneNumber) {
                return res.status(400).json({ message: "Complete emergency contact information is required" });
            }
        }
        
        // Prepare update object
        const updateObj = {};
        if (firstName) updateObj.firstName = firstName;
        if (firstName_ar) updateObj.firstName_ar = firstName_ar;
        if (lastName) updateObj.lastName = lastName;
        if (lastName_ar) updateObj.lastName_ar = lastName_ar;
        if (email) updateObj.email = email;
        if (phoneNumber) updateObj.phoneNumber = phoneNumber;
        if (address) updateObj.address = address;
        if (cin) updateObj.cin = cin;
        if (address_ar) updateObj.address_ar = address_ar;
        if (licenseNumber) updateObj.licenseNumber = licenseNumber;
        if (licenseExpiry) updateObj.licenseExpiry = licenseExpiry;
        if (dateOfBirth) updateObj.dateOfBirth = dateOfBirth;
        if (emergencyContact) updateObj.emergencyContact = emergencyContact;
        if (image) updateObj.image = image;
        if (status) {
            if (!['active', 'on leave', 'terminated'].includes(status)) {
                return res.status(400).json({ message: "Invalid status" });
            }
            updateObj.status = status;
        }
        
        // Update driver
        const updatedDriver = await Driver.findByIdAndUpdate(
            req.params.id,
            { $set: updateObj },
            { new: true }
        ).populate("vehicles", "name busNumber type");
        
        res.status(200).json(updatedDriver);
    } catch (error) {
        res.status(500).json({ message: "Error updating driver", error: error.message });
    }
});

// Delete a driver (School only)
router.delete("/drivers/:id", verifySchool, async (req, res) => {
    try {
        const driverDetails = await Driver.findOne({
            _id: req.params.id,
            school: req.user.id
        });
        
        if (!driverDetails) {
            return res.status(404).json({ message: "Driver not found" });
        }
        
        // Update vehicles to remove this driver
        if (driverDetails.vehicles && driverDetails.vehicles.length > 0) {
            await Transportation.updateMany(
                { _id: { $in: driverDetails.vehicles } },
                { $unset: { driver: "" } }
            );
        }
        
        await Driver.findByIdAndDelete(req.params.id);
        
        res.status(200).json({ message: "Driver successfully deleted" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting driver", error: error.message });
    }
});

// Assign a vehicle to a driver (School only)
router.post("/drivers/:id/vehicles", verifySchool, async (req, res) => {
    try {
        const { vehicleId } = req.body;
        
        if (!vehicleId) {
            return res.status(400).json({ message: "Vehicle ID is required" });
        }
        
        const driverDetails = await Driver.findOne({
            _id: req.params.id,
            school: req.user.id
        });
        
        if (!driverDetails) {
            return res.status(404).json({ message: "Driver not found" });
        }
        
        const vehicle = await Transportation.findOne({
            _id: vehicleId,
            school: req.user.id
        });
        
        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }
        
        // Add vehicle to driver if not already there
        if (!driverDetails.vehicles.includes(vehicleId)) {
            driverDetails.vehicles.push(vehicleId);
            await driverDetails.save();
            
            // Update vehicle's driver
            vehicle.driver = driverDetails._id;
            await vehicle.save();
        }
        
        res.status(200).json({ message: "Vehicle assigned to driver successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error assigning vehicle to driver", error: error.message });
    }
});

// Remove a vehicle from a driver (School only)
router.delete("/drivers/:id/vehicles/:vehicleId", verifySchool, async (req, res) => {
    try {
        const driverDetails = await Driver.findOne({
            _id: req.params.id,
            school: req.user.id
        });
        
        if (!driverDetails) {
            return res.status(404).json({ message: "Driver not found" });
        }
        
        // Remove vehicle from driver
        driverDetails.vehicles = driverDetails.vehicles.filter(
            vehicle => vehicle.toString() !== req.params.vehicleId
        );
        await driverDetails.save();
        
        // Remove driver from vehicle
        await Transportation.updateOne(
            { _id: req.params.vehicleId },
            { $unset: { driver: "" } }
        );
        
        res.status(200).json({ message: "Vehicle removed from driver successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error removing vehicle from driver", error: error.message });
    }
});

module.exports = router; 