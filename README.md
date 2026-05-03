# AIMS College LMS Backend

A production-oriented backend for a simple Learning Management System (LMS) built for AIMS College. It is designed to manage users by role, student enrollment, and assignment workflows through a secure REST API.

## Project Purpose

This project solves the core operational flow of a school LMS:

- Admin creates and manages teachers.
- Teachers enroll students.
- Teachers assign tasks to enrolled students.
- Students view and submit task completion.

It provides clear role boundaries, API-level security, and test coverage so the system can be used as a base for real institutional software.

## What This System Is Good For

This backend is a strong fit for:

- Schools and training institutes that need a lightweight LMS core.
- Academic teams that want task and enrollment workflows without building from scratch.
- EdTech MVPs that need a secure and extensible backend quickly.
- Developers building web/mobile frontends on top of a role-based API.

## Who Benefits Most

### Education Operations

- School administrators who need controlled onboarding of teachers.
- Teachers who need student roster ownership and assignment control.
- Students who need a simple assignment tracking interface.

### Technical Teams

- Backend developers learning Django REST + JWT with real-world patterns.
- Frontend developers who need stable endpoints for React/Flutter/Vue apps.
- QA engineers testing role-based and permission-sensitive systems.
- Junior developers using this as a portfolio-ready backend project.

## Core Features

- Custom user model with 3 roles: admin, teacher, student.
- JWT authentication (access + refresh tokens).
- Admin-only teacher enrollment endpoint.
- Teacher-only student enrollment endpoints.
- Enrollment constraints between teacher and student.
- Teacher task lifecycle support:
  - create task
  - update task
  - delete task
- Student task workflow:
  - list assigned tasks
  - mark task as completed
- Validation and permission checks at API and model layers.
- Automated test suite covering authentication, permissions, enrollments, and tasks.

## Architecture Summary

- Framework: Django 5 + Django REST Framework
- Auth: djangorestframework-simplejwt
- API Style: ViewSets + serializers + router-based URLs
- Database: SQLite (default, easy to swap to PostgreSQL)
- Testing: Django test suite with workflow-based tests

## Role Responsibilities

### Admin

- Enrolls teachers.
- Can access administrative management interfaces.

### Teacher

- Enrolls students.
- Views own enrolled students.
- Creates, updates, and deletes tasks for own students.

### Student

- Views only own tasks.
- Submits/marks own tasks as completed.

## How It Works (Workflow)

1. Admin authenticates via JWT.
2. Admin enrolls teacher accounts.
3. Teacher authenticates via JWT.
4. Teacher enrolls students (new or existing).
5. Teacher creates tasks assigned to enrolled students.
6. Student authenticates and views assigned tasks.
7. Student submits completion updates.

## Quick Start

### 1. Clone and enter project

```bash
git clone <repository-url>
cd LMS\ System
```

### 2. Create and activate virtual environment

```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Apply migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### 5. Create superuser

```bash
python manage.py createsuperuser
```

### 6. Run server

```bash
python manage.py runserver
```

API base URL:

- http://127.0.0.1:8000/api/

Admin panel:

- http://127.0.0.1:8000/admin/
- http://127.0.0.1:8000/admin (redirects to /admin/)

Health endpoint:

- http://127.0.0.1:8000/api/health/

## Frontend (Next.js)

The frontend lives in the `frontend/` folder and runs on port 3000 by default.

### Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:

- http://127.0.0.1:3000/

Notes:

- The backend root path `/` redirects to the frontend home on port 3000.
- Only `/admin` and `/admin/` stay on port 8000 for Django admin.

## API Surface (High-Level)

Authentication:

- POST /api/auth/login/
- POST /api/auth/refresh/

Students:

- GET /api/students/me/
- POST /api/students/register_student/
- POST /api/students/enroll_teacher/
- POST /api/students/enroll_student_by_teacher/

Enrollments:

- GET /api/enrollments/my_students/
- POST /api/enrollments/enroll_existing_student/

Tasks:

- POST /api/tasks/
- PATCH /api/tasks/{id}/update_task/
- DELETE /api/tasks/{id}/delete_task/
- GET /api/tasks/my_tasks/
- PATCH /api/tasks/{id}/submit_task/
- GET /api/tasks/teacher_tasks/

## Testing

Run all tests:

```bash
python manage.py test
```

Current project status:

- 17 tests passing
- role and permission checks validated
- core workflows verified

## Security Notes

- JWT tokens protect private endpoints.
- Role checks prevent cross-role misuse.
- Task assignment is constrained to enrolled teacher-student pairs.
- Use environment variables and DEBUG=False in production.

## Recommended Real-World Use Cases

- Internal school assignment tracking platform.
- Backend service for a mobile student app.
- Starter architecture for a larger LMS with grading and attendance.
- Candidate portfolio project demonstrating backend API design and RBAC.

## Growth Path

Possible next upgrades:

- Course and subject models.
- File uploads for assignment submissions.
- Grading and feedback modules.
- Attendance tracking.
- Notifications (email/in-app).
- PostgreSQL + Docker + CI/CD deployment pipeline.

## Additional Documentation

- API reference: API_DOCUMENTATION.md
- Step-by-step setup and workflows: SETUP_GUIDE.md

## License

Set a project license before production use (for example, MIT).
