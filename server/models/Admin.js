const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
    firstName: {type: String, required:true},
    lastName: {type: String, required:true},
    email: {
        type: String, 
        unique: true,
        required: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    rol: {type: String, default: 'admin' },
    password: {type: String, required:true}
},{ timestamps: true });

const Admin = mongoose.model("Admin", adminSchema);

module.exports = Admin;

