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

// Generate token for student
const generateStudentToken = (student) => {
    return jwt.sign(
        { id: student._id, rol: 'student' },
        process.env.JWT_SEC,
        { expiresIn: "3d" }
    );
};

// Generate token for teacher
const generateTeacherToken = (teacher) => {
    return jwt.sign(
        { id: teacher._id, rol: 'teacher' },
        process.env.JWT_SEC,
        { expiresIn: "3d" }
    );
};

// Generate token for parent
const generateParentToken = (parent) => {
    return jwt.sign(
        { id: parent._id, rol: 'parent' },
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

const verifyStudent = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.rol === 'student') {
            next();
        } else {
            return res.status(403).json({ message: "You are not authorized as a student!" });
        }
    });
};

const verifyTeacher = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.rol === 'teacher') {
            next();
        } else {
            return res.status(403).json({ message: "You are not authorized as a teacher!" });
        }
    });
};

const verifyParent = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.rol === 'parent') {
            next();
        } else {
            return res.status(403).json({ message: "You are not authorized as a parent!" });
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

const verifySchoolOrTeacher = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.rol === 'school' || req.user.rol === 'teacher') {
            next();
        } else {
            return res.status(403).json({ message: "You are not authorized!" });
        }
    });
};

const verifySchoolOrStudent = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.rol === 'school' || req.user.rol === 'student') {
            next();
        } else {
            return res.status(403).json({ message: "You are not authorized!" });
        }
    });
};

const verifyParentOrSchool = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.rol === 'parent' || req.user.rol === 'school') {
            next();
        } else {
            return res.status(403).json({ message: "You are not authorized!" });
        }
    });
};

const verifyTeacherOrSchoolOrAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.rol === 'teacher' || req.user.rol === 'school' || req.user.rol === 'admin') {
            next();
        } else {
            return res.status(403).json({ message: "You are not authorized!" });
        }
    });
};

const verifyAny = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.rol === 'admin' || req.user.rol === 'school' || req.user.rol === 'student' || 
            req.user.rol === 'teacher' || req.user.rol === 'parent') {
            next();
        } else {
            return res.status(403).json({ message: "You are not authorized!" });
        }
    });
};

module.exports = {
    generateAdminToken,
    generateSchoolToken,
    generateStudentToken,
    generateTeacherToken,
    generateParentToken,
    verifyToken,
    verifyAdmin,
    verifySchool,
    verifyStudent,
    verifyTeacher,
    verifyParent,
    verifySchoolOrAdmin,
    verifySchoolOrTeacher,
    verifySchoolOrStudent,
    verifyParentOrSchool,
    verifyTeacherOrSchoolOrAdmin,
    verifyAny
};
