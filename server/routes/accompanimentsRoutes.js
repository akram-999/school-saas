const router = require("express").Router();
const Accompaniment = require("../models/Accompaniment");
const Guard = require("../models/Guard");
const Transportation = require("../models/Transportation");
const { verifySchool, verifyGuard, verifyGuardOrSchool } = require("../config/jwt");

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

// Create a new accompaniment (School or Guard)
router.post("/accompaniments", verifyGuardOrSchool, async (req, res) => {
    try {
        const { 
            firstName, firstName_ar, lastName, lastName_ar,
            email, phoneNumber, address, cin, address_ar
        } = req.body;
        
        // Get the school ID based on user role
        const schoolId = await getSchoolId(req);
        if (!schoolId) {
            return res.status(404).json({ message: "School not found" });
        }
        
        // Check if accompaniment already exists
        const existingAccompaniment = await Accompaniment.findOne({ email });
        if (existingAccompaniment) {
            return res.status(400).json({ message: "Accompaniment with this email already exists" });
        }
        
        // Create new accompaniment
        const newAccompaniment = new Accompaniment({
            firstName,
            firstName_ar,
            lastName,
            lastName_ar,
            email,
            phoneNumber,
            address,
            cin,
            address_ar,
            school: schoolId
        });
        
        const accompaniment = await newAccompaniment.save();
        res.status(201).json(accompaniment);
    } catch (error) {
        res.status(500).json({ message: "Error creating accompaniment", error: error.message });
    }
});

// Get all accompaniments (School or Guard)
router.get("/accompaniments", verifyGuardOrSchool, async (req, res) => {
    try {
        // Get the school ID based on user role
        const schoolId = await getSchoolId(req);
        if (!schoolId) {
            return res.status(404).json({ message: "School not found" });
        }
        
        const accompaniments = await Accompaniment.find({ school: schoolId });
        res.status(200).json(accompaniments);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving accompaniments", error: error.message });
    }
});

// Get a specific accompaniment (School or Guard)
router.get("/accompaniments/:id", verifyGuardOrSchool, async (req, res) => {
    try {
        // Get the school ID based on user role
        const schoolId = await getSchoolId(req);
        if (!schoolId) {
            return res.status(404).json({ message: "School not found" });
        }
        
        const accompaniment = await Accompaniment.findOne({
            _id: req.params.id,
            school: schoolId
        });
        
        if (!accompaniment) {
            return res.status(404).json({ message: "Accompaniment not found" });
        }
        
        res.status(200).json(accompaniment);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving accompaniment", error: error.message });
    }
});

// Update an accompaniment (School or Guard)
router.put("/accompaniments/:id", verifyGuardOrSchool, async (req, res) => {
    try {
        const { 
            firstName, firstName_ar, lastName, lastName_ar,
            email, phoneNumber, address, cin, address_ar
        } = req.body;
        
        // Get the school ID based on user role
        const schoolId = await getSchoolId(req);
        if (!schoolId) {
            return res.status(404).json({ message: "School not found" });
        }
        
        const accompaniment = await Accompaniment.findOne({
            _id: req.params.id,
            school: schoolId
        });
        
        if (!accompaniment) {
            return res.status(404).json({ message: "Accompaniment not found" });
        }
        
        // If email is being changed, check if it's already in use
        if (email && email !== accompaniment.email) {
            const existingAccompaniment = await Accompaniment.findOne({ email });
            if (existingAccompaniment) {
                return res.status(400).json({ message: "Accompaniment with this email already exists" });
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
        
        // Update accompaniment
        const updatedAccompaniment = await Accompaniment.findByIdAndUpdate(
            req.params.id,
            { $set: updateObj },
            { new: true }
        );
        
        res.status(200).json(updatedAccompaniment);
    } catch (error) {
        res.status(500).json({ message: "Error updating accompaniment", error: error.message });
    }
});

// Delete an accompaniment (School or Guard)
router.delete("/accompaniments/:id", verifyGuardOrSchool, async (req, res) => {
    try {
        // Get the school ID based on user role
        const schoolId = await getSchoolId(req);
        if (!schoolId) {
            return res.status(404).json({ message: "School not found" });
        }
        
        const accompaniment = await Accompaniment.findOne({
            _id: req.params.id,
            school: schoolId
        });
        
        if (!accompaniment) {
            return res.status(404).json({ message: "Accompaniment not found" });
        }
        
        // Check if accompaniment is assigned to any transportation
        const transportationAssignments = await Transportation.find({
            accompaniments: req.params.id
        });
        
        if (transportationAssignments && transportationAssignments.length > 0) {
            // Remove accompaniment from all transportation assignments
            await Transportation.updateMany(
                { accompaniments: req.params.id },
                { $pull: { accompaniments: req.params.id } }
            );
        }
        
        // Delete accompaniment
        await Accompaniment.findByIdAndDelete(req.params.id);
        
        res.status(200).json({ message: "Accompaniment successfully deleted" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting accompaniment", error: error.message });
    }
});

// Assign an accompaniment to a transportation route (School or Guard)
router.post("/transportations/:id/accompaniments", verifyGuardOrSchool, async (req, res) => {
    try {
        const { accompanimentId } = req.body;
        
        if (!accompanimentId) {
            return res.status(400).json({ message: "Accompaniment ID is required" });
        }
        
        // Get the school ID based on user role
        const schoolId = await getSchoolId(req);
        if (!schoolId) {
            return res.status(404).json({ message: "School not found" });
        }
        
        // Verify transportation exists and belongs to this school
        const transportation = await Transportation.findOne({
            _id: req.params.id,
            school: schoolId
        });
        
        if (!transportation) {
            return res.status(404).json({ message: "Transportation not found" });
        }
        
        // Verify accompaniment exists and belongs to this school
        const accompaniment = await Accompaniment.findOne({
            _id: accompanimentId,
            school: schoolId
        });
        
        if (!accompaniment) {
            return res.status(404).json({ message: "Accompaniment not found" });
        }
        
        // Check if accompaniment is already assigned to this transportation
        if (transportation.accompaniments.includes(accompanimentId)) {
            return res.status(400).json({ message: "Accompaniment already assigned to this transportation" });
        }
        
        // Add accompaniment to transportation
        transportation.accompaniments.push(accompanimentId);
        await transportation.save();
        
        res.status(200).json({ message: "Accompaniment assigned successfully", transportation });
    } catch (error) {
        res.status(500).json({ message: "Error assigning accompaniment", error: error.message });
    }
});

// Remove an accompaniment from a transportation route (School or Guard)
router.delete("/transportations/:id/accompaniments/:accompanimentId", verifyGuardOrSchool, async (req, res) => {
    try {
        // Get the school ID based on user role
        const schoolId = await getSchoolId(req);
        if (!schoolId) {
            return res.status(404).json({ message: "School not found" });
        }
        
        // Verify transportation exists and belongs to this school
        const transportation = await Transportation.findOne({
            _id: req.params.id,
            school: schoolId
        });
        
        if (!transportation) {
            return res.status(404).json({ message: "Transportation not found" });
        }
        
        // Check if accompaniment is assigned to this transportation
        if (!transportation.accompaniments.includes(req.params.accompanimentId)) {
            return res.status(400).json({ message: "Accompaniment not assigned to this transportation" });
        }
        
        // Remove accompaniment from transportation
        transportation.accompaniments = transportation.accompaniments.filter(
            id => id.toString() !== req.params.accompanimentId
        );
        
        await transportation.save();
        
        res.status(200).json({ message: "Accompaniment removed successfully", transportation });
    } catch (error) {
        res.status(500).json({ message: "Error removing accompaniment", error: error.message });
    }
});

// Get all transportations for an accompaniment (School or Guard)
router.get("/accompaniments/:id/transportations", verifyGuardOrSchool, async (req, res) => {
    try {
        // Get the school ID based on user role
        const schoolId = await getSchoolId(req);
        if (!schoolId) {
            return res.status(404).json({ message: "School not found" });
        }
        
        // Verify accompaniment exists and belongs to this school
        const accompaniment = await Accompaniment.findOne({
            _id: req.params.id,
            school: schoolId
        });
        
        if (!accompaniment) {
            return res.status(404).json({ message: "Accompaniment not found" });
        }
        
        // Find all transportations that have this accompaniment assigned
        const transportations = await Transportation.find({
            accompaniments: req.params.id,
            school: schoolId
        })
        .populate("driver", "firstName lastName")
        .populate("students", "firstName lastName");
        
        res.status(200).json(transportations);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving transportations", error: error.message });
    }
});

// Search accompaniments (School or Guard)
router.get("/accompaniments/search", verifyGuardOrSchool, async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query) {
            return res.status(400).json({ message: "Search query is required" });
        }
        
        // Get the school ID based on user role
        const schoolId = await getSchoolId(req);
        if (!schoolId) {
            return res.status(404).json({ message: "School not found" });
        }
        
        // Search accompaniments by name, email, or CIN
        const accompaniments = await Accompaniment.find({
            school: schoolId,
            $or: [
                { firstName: { $regex: query, $options: 'i' } },
                { lastName: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } },
                { cin: { $regex: query, $options: 'i' } }
            ]
        });
        
        res.status(200).json(accompaniments);
    } catch (error) {
        res.status(500).json({ message: "Error searching accompaniments", error: error.message });
    }
});

module.exports = router; 