const router = require("express").Router();
const School = require("../models/School");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { verifySchool, verifyAdmin, verifySchoolOrAdmin, generateSchoolToken } = require("../config/jwt");

// School Registration (Admin only can register schools)
router.post("/school/register", verifyAdmin, async (req, res) => {
    try {
        const { name, address, phone, email, password, website, image } = req.body;
        
        // Check if school exists
        const exists = await School.findOne({ email });
        if (exists) {
            return res.status(400).json({ message: 'School already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(password, salt);

        // Create new school
        const newSchool = new School({
            name,
            address,
            phone,
            email,
            password: hashedPass,
            website: website || "",
            image: image || "",
        });

        // Save school
        const school = await newSchool.save();
        
        // Send response without sensitive data
        const { password: _, ...schoolWithoutPassword } = school.toObject();
        res.status(201).json(schoolWithoutPassword);
    } catch (error) {
        res.status(500).json({ message: 'Error creating school', error: error.message });
    }
});

// School Login
router.post("/school/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find school
        const school = await School.findOne({ email });
        if (!school) {
            return res.status(404).json({ message: "School not found" });
        }

        // Validate password
        const isMatch = await bcrypt.compare(password, school.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Generate token
        const token = generateSchoolToken(school);

        // Return school data without password
        const { password: _, ...schoolWithoutPassword } = school.toObject();
        res.status(200).json({ ...schoolWithoutPassword, token });
    } catch (error) {
        res.status(500).json({ message: "Login failed", error: error.message });
    }
});

// Get School Profile (Protected route)
router.get("/school/profile", verifySchool, async (req, res) => {
    try {
        const school = await School.findById(req.user.id).select("-password");
        if (!school) {
            return res.status(404).json({ message: "School not found" });
        }
        res.status(200).json(school);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving profile", error: error.message });
    }
});

// Update School Profile (Protected route)
router.put("/school/profile", verifySchool, async (req, res) => {
    try {
        const { name, address, phone, email, password, website, image } = req.body;
        
        // Prepare update object
        const updateObj = {};
        if (name) updateObj.name = name;
        if (address) updateObj.address = address;
        if (phone) updateObj.phone = phone;
        if (email) updateObj.email = email;
        if (website) updateObj.website = website;
        if (image) updateObj.image = image;
        
        // Handle password update if provided
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateObj.password = await bcrypt.hash(password, salt);
        }
        
        // Update school
        const updatedSchool = await School.findByIdAndUpdate(
            req.user.id,
            { $set: updateObj },
            { new: true }
        ).select("-password");
        
        res.status(200).json(updatedSchool);
    } catch (error) {
        res.status(500).json({ message: "Error updating profile", error: error.message });
    }
});

// Get All Schools (Admin or School can view)
router.get("/schools", verifySchoolOrAdmin, async (req, res) => {
    try {
        const schools = await School.find().select("-password");
        res.status(200).json(schools);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving schools", error: error.message });
    }
});

// Get School by ID (Admin or School can view)
router.get("/school/:id", verifySchoolOrAdmin, async (req, res) => {
    try {
        const school = await School.findById(req.params.id).select("-password");
        if (!school) {
            return res.status(404).json({ message: "School not found" });
        }
        res.status(200).json(school);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving school", error: error.message });
    }
});

// Delete School (Admin only)
router.delete("/school/:id", verifyAdmin, async (req, res) => {
    try {
        const school = await School.findByIdAndDelete(req.params.id);
        if (!school) {
            return res.status(404).json({ message: "School not found" });
        }
        
        res.status(200).json({ message: "School successfully deleted" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting school", error: error.message });
    }
});

module.exports = router; 