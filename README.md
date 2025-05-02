# School SaaS Platform

A comprehensive SaaS platform for schools to manage activities, students, and administration.

## Features

- **Authentication & Authorization**: JWT-based authentication for Admins, Schools, and Students
- **Activities Management**: Create, update, delete, and list activities
- **Student Registration**: Students can register/deregister for activities
- **School Management**: Admin can manage schools
- **Role-Based Access Control**: Different permissions for Admins, Schools, and Students

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

### Activity Routes
- `POST /api/activities` - Create a new activity (School only)
- `GET /api/activities` - Get all activities (Public)
- `GET /api/school/activities` - Get activities by school (School only)
- `GET /api/activities/:id` - Get activity by ID (Public)
- `PUT /api/activities/:id` - Update an activity (School owner only)
- `DELETE /api/activities/:id` - Delete an activity (School owner or Admin)
- `POST /api/activities/:id/register` - Register a student for an activity
- `POST /api/activities/:id/deregister` - Deregister a student from an activity

### Student Routes
- `POST /api/student/register` - Register a new student
- `POST /api/student/login` - Student login
- `GET /api/student/profile` - Get student profile
- `PUT /api/student/profile` - Update student profile
- `POST /api/student/activities/:activityId/register` - Register for an activity
- `POST /api/student/activities/:activityId/deregister` - Deregister from an activity
- `GET /api/students` - Get all students (School or Admin only)
- `DELETE /api/student/:id` - Delete a student (Admin only)

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

## License

MIT 