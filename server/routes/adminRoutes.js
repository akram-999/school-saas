const router = require("express").Router();
const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { verifyAdmin, verifyToken, generateAdminToken } = require("../config/jwt");

// Admin Registration
router.post("/admin/register", async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;
        
        // Check if admin exists
        const exists = await Admin.findOne({ email });
        if (exists) {
            return res.status(400).json({ message: 'Admin already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(password, salt);

        // Create new admin
        const newAdmin = new Admin({
            firstName,
            lastName,
            email,
            password: hashedPass,
        });

        // Save admin
        const admin = await newAdmin.save();
        
        // Send response without sensitive data
        const { password: _, ...adminWithoutPassword } = admin.toObject();
        res.status(201).json(adminWithoutPassword);
    } catch (error) {
        res.status(500).json({ message: 'Error creating admin', error: error.message });
    }
});

// Admin Login
router.post("/admin/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find admin
        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        // Validate password
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Generate token
        const token = generateAdminToken(admin);

        // Return admin data without password
        const { password: _, ...adminWithoutPassword } = admin.toObject();
        res.status(200).json({ ...adminWithoutPassword, token });
    } catch (error) {
        res.status(500).json({ message: "Login failed", error: error.message });
    }
});

// Get Admin Profile (Protected route)
router.get("/admin/profile", verifyAdmin, async (req, res) => {
    try {
        const admin = await Admin.findById(req.user.id).select("-password");
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }
        res.status(200).json(admin);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving profile", error: error.message });
    }
});

// Update Admin Profile (Protected route)
router.put("/admin/profile", verifyAdmin, async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;
        
        // Prepare update object
        const updateObj = {};
        if (firstName) updateObj.firstName = firstName;
        if (lastName) updateObj.lastName = lastName;
        if (email) updateObj.email = email;
        
        // Handle password update if provided
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateObj.password = await bcrypt.hash(password, salt);
        }
        
        // Update admin
        const updatedAdmin = await Admin.findByIdAndUpdate(
            req.user.id,
            { $set: updateObj },
            { new: true }
        ).select("-password");
        
        res.status(200).json(updatedAdmin);
    } catch (error) {
        res.status(500).json({ message: "Error updating profile", error: error.message });
    }
});

// Get All Admins (Admin only)
router.get("/admins", verifyAdmin, async (req, res) => {
    try {
        const admins = await Admin.find().select("-password");
        res.status(200).json(admins);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving admins", error: error.message });
    }
});

// Delete Admin (Admin only)
router.delete("/admin/:id", verifyAdmin, async (req, res) => {
    try {
        // Check if admin is trying to delete themselves
        if (req.user.id === req.params.id) {
            return res.status(400).json({ message: "You cannot delete your own account" });
        }
        
        const admin = await Admin.findByIdAndDelete(req.params.id);
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }
        
        res.status(200).json({ message: "Admin successfully deleted" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting admin", error: error.message });
    }
});

module.exports = router;
