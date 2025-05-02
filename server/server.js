const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const adminRoutes = require("./routes/adminRoutes");
const schoolRoutes = require("./routes/schoolRoutes");
const activityRoutes = require("./routes/activityRoutes");
const studentRoutes = require("./routes/studentRoutes");

// Load env variables
dotenv.config();

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Route middleware
app.use("/api", adminRoutes);
app.use("/api", schoolRoutes);
app.use("/api", activityRoutes);
app.use("/api", studentRoutes);

// Default route
app.get("/", (req, res) => {
    res.send("School SaaS API is running");
});

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    }
};

// Start server
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
    console.log(`Error: ${err.message}`);
    // Close server & exit process
    process.exit(1);
}); 