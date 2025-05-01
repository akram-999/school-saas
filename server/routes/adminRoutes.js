const router = require("express").Router();
const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");

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

module.exports = router;
