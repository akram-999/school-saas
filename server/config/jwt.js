const jwt = require("jsonwebtoken");

// Generate token for admin
const generateAdminToken = (admin) => {
    return jwt.sign(
        { id: admin._id, rol: 'admin' },
        process.env.JWT_SEC,
        { expiresIn: "3d" }
    );
};

// Generate token for school
const generateSchoolToken = (school) => {
    return jwt.sign(
        { id: school._id, rol: 'school' },
        process.env.JWT_SEC,
        { expiresIn: "3d" }
    );
};

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: "You are not authenticated!" });
    }

    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.JWT_SEC, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Token is not valid!" });
        }
        req.user = decoded;
        next();
    });
};

const verifyAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.rol === 'admin') {
            next();
        } else {
            return res.status(403).json({ message: "You are not authorized as an admin!" });
        }
    });
};

const verifySchool = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.rol === 'school') {
            next();
        } else {
            return res.status(403).json({ message: "You are not authorized as a school!" });
        }
    });
};

const verifySchoolOrAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.rol === 'school' || req.user.rol === 'admin') {
            next();
        } else {
            return res.status(403).json({ message: "You are not authorized!" });
        }
    });
};

module.exports = {
    generateAdminToken,
    generateSchoolToken,
    verifyToken,
    verifyAdmin,
    verifySchool,
    verifySchoolOrAdmin
};
