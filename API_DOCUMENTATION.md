# AIMS LMS Backend - Complete API Documentation

## Overview

AIMS College LMS backend is a Django REST Framework API with JWT authentication supporting 3 user roles: Admin, Teacher, and Student.

**Current Status:** ✅ All 17 tests passing  
**API Version:** 2.0  
**Authentication:** JWT (Bearer Token)

---

## Quick Start

### 1. Start the Server

```bash
cd /Users/delart/Desktop/LMS\ System
source venv/bin/activate
python manage.py runserver
```

Server runs at: `http://127.0.0.1:8000`

### 2. Health Check (No Auth Required)

```bash
curl http://127.0.0.1:8000/api/health/
```

---

## Authentication

### JWT Login

**Endpoint:** `POST /api/auth/login/`

Request:

```json
{
  "username": "teacher_one",
  "password": "StrongPass123!"
}
```

Response:

```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

Use the `access` token in all subsequent requests:

```bash
curl -H "Authorization: Bearer {access_token}" http://127.0.0.1:8000/api/users/me/
```

### Refresh Token

**Endpoint:** `POST /api/auth/refresh/`

Request:

```json
{
  "refresh": "{refresh_token}"
}
```

Returns new `access` token.

---

## User Management

### Get Current User Profile

**Endpoint:** `GET /api/users/me/`  
**Auth Required:** Yes  
**Role:** Any authenticated user

Response:

```json
{
  "id": 1,
  "username": "teacher_one",
  "email": "teacher@example.com",
  "first_name": "Teacher",
  "last_name": "Name",
  "role": "teacher"
}
```

### Public: Student Self-Registration

**Endpoint:** `POST /api/users/register_student/`  
**Auth Required:** No

Request:

```json
{
  "username": "new_student",
  "password": "SecurePass123!",
  "email": "student@example.com",
  "first_name": "John",
  "last_name": "Doe"
}
```

Response:

```json
{
  "id": 5,
  "username": "new_student",
  "email": "student@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role": "student"
}
```

### Admin: Enroll New Teacher

**Endpoint:** `POST /api/users/enroll_teacher/`  
**Auth Required:** Yes  
**Role:** Admin only

Request:

```json
{
  "username": "new_teacher",
  "password": "TeacherPass123!",
  "email": "teacher@example.com",
  "first_name": "Jane",
  "last_name": "Smith"
}
```

Response: (201 Created)

```json
{
  "id": 3,
  "username": "new_teacher",
  "email": "teacher@example.com",
  "first_name": "Jane",
  "last_name": "Smith",
  "role": "teacher"
}
```

### Teacher: Enroll New Student

**Endpoint:** `POST /api/users/enroll_student_by_teacher/`  
**Auth Required:** Yes  
**Role:** Teacher only

Request:

```json
{
  "username": "student_new",
  "password": "StudentPass123!",
  "email": "student@example.com",
  "first_name": "Alice",
  "last_name": "Johnson"
}
```

Response: (201 Created)

```json
{
  "student": {
    "id": 6,
    "username": "student_new",
    "email": "student@example.com",
    "first_name": "Alice",
    "last_name": "Johnson",
    "role": "student"
  },
  "enrollment_id": 1
}
```

---

## Enrollment Management

### Teacher: View Enrolled Students

**Endpoint:** `GET /api/enrollments/my_students/`  
**Auth Required:** Yes  
**Role:** Teacher only

Response:

```json
[
  {
    "id": 1,
    "teacher": {...},
    "teacher_username": "teacher_one",
    "student": {...},
    "student_username": "student_one",
    "enrolled_at": "2026-04-24T10:30:00Z"
  }
]
```

### Teacher: Enroll Existing Student

**Endpoint:** `POST /api/enrollments/enroll_existing_student/`  
**Auth Required:** Yes  
**Role:** Teacher only

Request:

```json
{
  "student_id": 5
}
```

Response: (201 Created)

```json
{
  "id": 2,
  "teacher": {...},
  "student": {...},
  "enrolled_at": "2026-04-24T11:00:00Z"
}
```

---

## Task Management

### Teacher: Create & Assign Task

**Endpoint:** `POST /api/tasks/`  
**Auth Required:** Yes  
**Role:** Teacher only

Request:

```json
{
  "student_id": 5,
  "title": "Math Homework",
  "description": "Complete chapter 5, problems 1-20",
  "due_date": "2026-05-01T10:00:00Z"
}
```

Response: (201 Created)

```json
{
  "id": 1,
  "title": "Math Homework",
  "description": "Complete chapter 5, problems 1-20",
  "teacher": {...},
  "teacher_username": "teacher_one",
  "student": {...},
  "student_username": "student_one",
  "due_date": "2026-05-01T10:00:00Z",
  "is_completed": false,
  "created_at": "2026-04-24T10:00:00Z"
}
```

### Teacher: Update Task

**Endpoint:** `PATCH /api/tasks/{id}/update_task/`  
**Auth Required:** Yes  
**Role:** Teacher only (only their own tasks)

Request:

```json
{
  "title": "Updated Title",
  "due_date": "2026-05-05T14:00:00Z"
}
```

Response: (200 OK)

```json
{
  "id": 1,
  "title": "Updated Title",
  "description": "Complete chapter 5, problems 1-20",
  "teacher_username": "teacher_one",
  "student_username": "student_one",
  "due_date": "2026-05-05T14:00:00Z",
  "is_completed": false,
  "created_at": "2026-04-24T10:00:00Z"
}
```

### Teacher: Delete Task

**Endpoint:** `DELETE /api/tasks/{id}/delete_task/`  
**Auth Required:** Yes  
**Role:** Teacher only (only their own tasks)

Response: (204 No Content)

### Teacher: View All Created Tasks

**Endpoint:** `GET /api/tasks/teacher_tasks/`  
**Auth Required:** Yes  
**Role:** Teacher only

Query Parameters:

- `?student_id={id}` - Filter by specific student
- `?completed=true/false` - Filter by completion status

Response:

```json
[
  {
    "id": 1,
    "title": "Math Homework",
    "description": "Complete chapter 5",
    "teacher_username": "teacher_one",
    "student_username": "student_one",
    "due_date": "2026-05-01T10:00:00Z",
    "is_completed": false,
    "created_at": "2026-04-24T10:00:00Z"
  }
]
```

### Student: View Assigned Tasks

**Endpoint:** `GET /api/tasks/my_tasks/`  
**Auth Required:** Yes  
**Role:** Student only

Query Parameters:

- `?completed=true/false` - Filter by completion status
- `?due_before=2026-05-01T00:00:00Z` - Filter by due date

Response:

```json
[
  {
    "id": 1,
    "title": "Math Homework",
    "description": "Complete chapter 5",
    "teacher_username": "teacher_one",
    "due_date": "2026-05-01T10:00:00Z",
    "is_completed": false,
    "created_at": "2026-04-24T10:00:00Z"
  }
]
```

### Student: Mark Task as Completed

**Endpoint:** `PATCH /api/tasks/{id}/submit_task/`  
**Auth Required:** Yes  
**Role:** Student only (only their own tasks)

Request:

```json
{
  "is_completed": true
}
```

Response: (200 OK)

```json
{
  "id": 1,
  "title": "Math Homework",
  "description": "Complete chapter 5",
  "teacher_username": "teacher_one",
  "due_date": "2026-05-01T10:00:00Z",
  "is_completed": true,
  "created_at": "2026-04-24T10:00:00Z"
}
```

---

## Django Admin Panel

### Access Admin

1. Go to: `http://127.0.0.1:8000/admin/`
2. Login with superuser credentials

### Manage Users, Enrollments, Tasks

- View all users with role filtering
- Manage enrollments
- Create, update, delete tasks
- Track completion status

---

## Complete Workflow Example

### Step 1: Admin Creates Superuser

```bash
python manage.py createsuperuser
```

- Username: `admin`
- Password: Choose strong password
- Then edit admin user in Django admin and set role to `admin`

### Step 2: Admin Login

```bash
curl -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"AdminPassword123!"}'
```

### Step 3: Admin Enrolls Teacher

```bash
curl -X POST http://127.0.0.1:8000/api/users/enroll_teacher/ \
  -H "Authorization: Bearer {admin_access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "username":"teacher_alice",
    "password":"TeacherPass123!",
    "email":"alice@example.com",
    "first_name":"Alice",
    "last_name":"Smith"
  }'
```

### Step 4: Teacher Login

```bash
curl -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"teacher_alice","password":"TeacherPass123!"}'
```

### Step 5: Teacher Enrolls Student

```bash
curl -X POST http://127.0.0.1:8000/api/users/enroll_student_by_teacher/ \
  -H "Authorization: Bearer {teacher_access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "username":"student_bob",
    "password":"StudentPass123!",
    "email":"bob@example.com",
    "first_name":"Bob",
    "last_name":"Johnson"
  }'
```

### Step 6: Teacher Assigns Task

```bash
curl -X POST http://127.0.0.1:8000/api/tasks/ \
  -H "Authorization: Bearer {teacher_access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id":3,
    "title":"Science Project",
    "description":"Research renewable energy",
    "due_date":"2026-05-10T18:00:00Z"
  }'
```

### Step 7: Student Login

```bash
curl -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"student_bob","password":"StudentPass123!"}'
```

### Step 8: Student Views Tasks

```bash
curl http://127.0.0.1:8000/api/tasks/my_tasks/ \
  -H "Authorization: Bearer {student_access_token}"
```

### Step 9: Student Completes Task

```bash
curl -X PATCH http://127.0.0.1:8000/api/tasks/1/submit_task/ \
  -H "Authorization: Bearer {student_access_token}" \
  -H "Content-Type: application/json" \
  -d '{"is_completed":true}'
```

---

## Error Responses

### 401 Unauthorized (No Token)

```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden (Insufficient Permissions)

```json
{
  "detail": "You are not allowed to perform this action."
}
```

### 404 Not Found

```json
{
  "detail": "Student not found."
}
```

### 400 Bad Request

```json
{
  "detail": "student_id, title and due_date are required."
}
```

---

## Testing

Run all tests:

```bash
python manage.py test
```

Run specific test class:

```bash
python manage.py test core.tests.JWTAuthenticationTests
```

Run with verbose output:

```bash
python manage.py test --verbosity=2
```

**Current Test Coverage:**

- ✅ JWT Authentication (4 tests)
- ✅ User Management (4 tests)
- ✅ Enrollment Management (2 tests)
- ✅ Task Management (7 tests)
- **Total: 17 tests - All passing ✅**

---

## Database Schema

### User Model

- `id` (Primary Key)
- `username` (Unique)
- `email` (Unique)
- `role` (admin, teacher, student)
- `first_name`, `last_name`
- `created_by` (Foreign Key to User - tracks who created this user)
- `is_active`, `is_staff`, `is_superuser`

### Enrollment Model

- `id` (Primary Key)
- `teacher` (Foreign Key → User with role=teacher)
- `student` (Foreign Key → User with role=student)
- `enrolled_at` (Timestamp)
- **Constraint:** Unique(teacher, student) - prevents duplicate enrollments

### Task Model

- `id` (Primary Key)
- `title`, `description`
- `teacher` (Foreign Key → User with role=teacher)
- `student` (Foreign Key → User with role=student)
- `due_date` (DateTime)
- `is_completed` (Boolean, default=False)
- `created_at` (Timestamp)

---

## Security Notes

1. **JWT Token Lifetime:**
   - Access token: 1 hour
   - Refresh token: 7 days
   - Tokens rotate on refresh

2. **Password Requirements:**
   - Minimum 8 characters
   - No common patterns
   - Case and number diversity

3. **Role-Based Access Control:**
   - Admin: Can enroll teachers
   - Teacher: Can enroll students, assign tasks, update/delete own tasks
   - Student: Can view own tasks, mark as completed
   - Superuser: Full access

---

## File Structure

```
/Users/delart/Desktop/LMS System/
├── manage.py
├── requirements.txt
├── db.sqlite3
├── aims_college/
│   ├── settings.py (JWT & DRF config)
│   ├── urls.py (main routing)
│   ├── asgi.py
│   └── wsgi.py
├── core/
│   ├── models.py (User, Enrollment, Task)
│   ├── serializers.py (DRF serializers)
│   ├── views.py (health check)
│   ├── viewsets.py (DRF ViewSets with JWT auth)
│   ├── urls.py (API routing)
│   ├── admin.py (Django admin config)
│   ├── tests.py (17 comprehensive tests)
│   ├── migrations/
│   │   └── 0001_initial.py
│   └── apps.py
└── venv/ (virtual environment)
```

---

## Next Steps

1. **Deployment:**
   - Add environment variables (.env file)
   - Set DEBUG=False for production
   - Configure ALLOWED_HOSTS
   - Use PostgreSQL instead of SQLite
   - Add SSL/HTTPS

2. **Features to Add:**
   - Assignment submissions with file uploads
   - Grade/marks tracking
   - Email notifications
   - Course management
   - Pagination for large datasets

3. **Frontend Integration:**
   - React, Vue, or Flutter app
   - Use `/api/auth/login/` for authentication
   - Store JWT tokens in secure storage
   - Refresh tokens on expiration

---

**API Documentation Last Updated:** April 24, 2026  
**Backend Version:** 2.0 with Django REST Framework & JWT
