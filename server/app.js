// Require routes
const schoolRoutes = require("./routes/schoolRoutes");
const studentRoutes = require("./routes/studentRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const classRoutes = require("./routes/classRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const parentRoutes = require("./routes/parentRoutes");
const transportationRoutes = require("./routes/transportationRoutes");
const driverRoutes = require("./routes/driverRoutes");
const guardRoutes = require("./routes/guardRoutes");
const accompanimentsRoutes = require("./routes/accompanimentsRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const staffAttendanceRoutes = require("./routes/staffAttendanceRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");

// Use routes
app.use("/api", schoolRoutes);
app.use("/api", studentRoutes);
app.use("/api", teacherRoutes);
app.use("/api", classRoutes);
app.use("/api", subjectRoutes);
app.use("/api", parentRoutes);
app.use("/api", transportationRoutes);
app.use("/api", driverRoutes);
app.use("/api", guardRoutes);
app.use("/api", accompanimentsRoutes);
app.use("/api", attendanceRoutes);
app.use("/api", staffAttendanceRoutes);
app.use("/api", scheduleRoutes); 