# School Management System

A comprehensive SaaS platform for schools to manage students, teachers, classes, transportation, attendance, activities, and more.

## Features

- **Multi-Role Authentication**: JWT-based authentication for Admins, Schools, Guards, Teachers, Students, Parents, and Drivers
- **Student Management**: Registration, profiles, attendance tracking, and activity participation
- **Teacher Management**: Staff profiles, attendance tracking, class assignments, and subject management
- **Class Management**: Create and manage classes, assign teachers and students
- **Subject Management**: Create and manage subjects, assign to classes and teachers
- **Attendance System**: Track student and staff attendance
- **Transportation Management**: Manage transportation routes, drivers, and accompaniments
- **Activity Management**: Create, update, and manage extracurricular activities
- **Examination System**: Schedule and manage exams and results
- **Guard Management**: Security personnel management with appropriate permissions
- **Parent Portal**: Allow parents to monitor their children's progress
- **Data Isolation**: School-specific data isolation for privacy and security
- **Role-Based Access Control**: Granular permissions based on user roles

## Tech Stack

- **Backend**: Node.js, Express.js, MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **Database**: MongoDB with Mongoose ODM

## API Routes

### Admin Routes
- `POST /api/admin/register` - Register a new admin
- `POST /api/admin/login` - Admin login
- `GET /api/admin/profile` - Get admin profile
- `PUT /api/admin/profile` - Update admin profile
- `GET /api/admins` - Get all admins (Admin only)
- `DELETE /api/admin/:id` - Delete an admin (Admin only)

### School Routes
- `POST /api/school/register` - Register a new school (Admin only)
- `POST /api/school/login` - School login
- `GET /api/school/profile` - Get school profile
- `PUT /api/school/profile` - Update school profile
- `GET /api/schools` - Get all schools
- `GET /api/school/:id` - Get school by ID
- `DELETE /api/school/:id` - Delete a school (Admin only)

### Student Routes
- `POST /api/student/register` - Register a new student (School only)
- `POST /api/student/login` - Student login
- `GET /api/student/profile` - Get student profile
- `PUT /api/student/profile` - Update student profile
- `GET /api/students` - Get all students (Admin, School, Guard, or Teacher with appropriate permissions)
- `GET /api/student/:id` - Get student by ID
- `PUT /api/student/:id` - Update student (School, Guard, or Student)
- `DELETE /api/student/:id` - Delete a student (Admin or School)

### Teacher Routes
- `POST /api/teachers` - Register a new teacher (School only)
- `GET /api/teachers` - Get all teachers (School or Guard)
- `GET /api/teachers/:id` - Get teacher by ID
- `PUT /api/teachers/:id` - Update teacher information
- `DELETE /api/teachers/:id` - Delete a teacher

### Class Routes
- `POST /api/classes` - Create a new class (School or Guard)
- `GET /api/classes` - Get all classes (School or Guard)
- `GET /api/classes/:id` - Get class by ID
- `PUT /api/classes/:id` - Update class information
- `DELETE /api/classes/:id` - Delete a class
- `POST /api/classes/:id/students` - Add students to a class
- `DELETE /api/classes/:id/students/:studentId` - Remove a student from a class

### Subject Routes
- `POST /api/subjects` - Create a new subject (School or Guard)
- `GET /api/subjects` - Get all subjects
- `GET /api/subjects/:id` - Get subject by ID
- `PUT /api/subjects/:id` - Update subject information
- `DELETE /api/subjects/:id` - Delete a subject

### Attendance Routes
- `POST /api/attendance` - Record student attendance (School or Guard)
- `GET /api/attendance` - Get attendance records
- `GET /api/attendance/:id` - Get specific attendance record
- `PUT /api/attendance/:id` - Update attendance record
- `GET /api/attendance/student/:studentId` - Get attendance for a specific student

### Staff Attendance Routes
- `POST /api/staff-attendance` - Record staff attendance (School or Guard)
- `GET /api/staff-attendance` - Get staff attendance records
- `GET /api/staff-attendance/:id` - Get specific staff attendance record
- `PUT /api/staff-attendance/:id` - Update staff attendance record

### Activity Routes
- `POST /api/activities` - Create a new activity (School or Guard)
- `GET /api/activities` - Get all activities
- `GET /api/activities/:id` - Get activity by ID
- `PUT /api/activities/:id` - Update an activity
- `DELETE /api/activities/:id` - Delete an activity
- `POST /api/activities/:id/register` - Register a student for an activity
- `POST /api/activities/:id/deregister` - Deregister a student from an activity

### Cycle Routes
- `POST /api/cycles` - Create a new cycle (School or Guard)
- `GET /api/cycles` - Get all cycles
- `GET /api/cycles/:id` - Get cycle by ID
- `PUT /api/cycles/:id` - Update cycle information
- `DELETE /api/cycles/:id` - Delete a cycle

### Guard Routes
- `POST /api/guards` - Register a new guard (School only)
- `GET /api/guards` - Get all guards (School only)
- `GET /api/guards/:id` - Get guard by ID
- `PUT /api/guards/:id` - Update guard information
- `DELETE /api/guards/:id` - Delete a guard

### Parent Routes
- `POST /api/parents` - Register a new parent (School or Guard)
- `GET /api/parents` - Get all parents
- `GET /api/parents/:id` - Get parent by ID
- `PUT /api/parents/:id` - Update parent information
- `DELETE /api/parents/:id` - Delete a parent
- `POST /api/parents/:id/students` - Link students to a parent
- `DELETE /api/parents/:id/students/:studentId` - Unlink a student from a parent

### Driver Routes
- `POST /api/drivers` - Register a new driver (School or Guard)
- `GET /api/drivers` - Get all drivers
- `GET /api/drivers/:id` - Get driver by ID
- `PUT /api/drivers/:id` - Update driver information
- `DELETE /api/drivers/:id` - Delete a driver

### Transportation Routes
- `POST /api/transportations` - Create a new transportation route (School or Guard)
- `GET /api/transportations` - Get all transportation routes
- `GET /api/transportations/:id` - Get transportation route by ID
- `PUT /api/transportations/:id` - Update transportation route
- `DELETE /api/transportations/:id` - Delete a transportation route
- `POST /api/transportations/:id/students` - Add students to a transportation route
- `DELETE /api/transportations/:id/students/:studentId` - Remove a student from a transportation route

### Accompaniment Routes
- `POST /api/accompaniments` - Create a new accompaniment (School or Guard)
- `GET /api/accompaniments` - Get all accompaniments
- `GET /api/accompaniments/:id` - Get accompaniment by ID
- `PUT /api/accompaniments/:id` - Update accompaniment information
- `DELETE /api/accompaniments/:id` - Delete an accompaniment
- `POST /api/transportations/:id/accompaniments` - Assign accompaniment to transportation
- `DELETE /api/transportations/:id/accompaniments/:accompanimentId` - Remove accompaniment from transportation

## Setup Instructions

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with the following variables:
   ```
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/school-saas
   JWT_SEC=your_jwt_secret_key_here
   NODE_ENV=development
   ```
4. Start the server: `npm start`

## Environment Variables

- `PORT`: The port the server will run on (default: 5000)
- `MONGO_URI`: MongoDB connection string
- `JWT_SEC`: Secret key for JWT token generation
- `NODE_ENV`: Environment (development/production)

## Data Isolation

The system implements strict data isolation where:
- Admins can see all data across schools
- Schools can only see their own data
- Guards can only see data from their assigned school
- Teachers can only see data related to their classes and students
- Students can only see their own data
- Parents can only see data related to their children

## License

MIT 