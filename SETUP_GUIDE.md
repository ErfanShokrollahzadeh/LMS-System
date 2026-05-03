# AIMS LMS Backend - Zero to Hero Setup Guide

## Phase 1: Initial Setup (Already Complete ✅)

### What was installed:

- Django 5.2.4
- Django REST Framework (DRF)
- djangorestframework-simplejwt (JWT authentication)

### Files created/updated:

1. **Models** (`core/models.py`):
   - Custom `User` model with role-based access (admin, teacher, student)
   - `Enrollment` model (tracks teacher-student relationships)
   - `Task` model (assignments with completion tracking)

2. **API Layer** (`core/viewsets.py`):
   - JWT authentication endpoints
   - User management (registration, enrollment)
   - Enrollment management
   - Task CRUD with role-based actions

3. **Serializers** (`core/serializers.py`):
   - Data validation and JSON conversion

4. **Configuration** (`aims_college/settings.py`):
   - DRF + JWT settings
   - Token expiration (1h access, 7d refresh)

5. **Tests** (`core/tests.py`):
   - 17 comprehensive tests covering all workflows
   - All passing ✅

---

## Phase 2: Running the Backend (START HERE)

### Step 1: Activate Virtual Environment

```bash
cd /Users/delart/Desktop/LMS\ System
source venv/bin/activate
```

### Step 2: Run Development Server

```bash
python manage.py runserver
```

Server will be available at:

```
http://127.0.0.1:8000/
```

### Step 3: Create Admin User (First Time Only)

```bash
python manage.py createsuperuser
# Follow prompts to create admin account
```

### Step 4: Set Admin Role

1. Go to `http://127.0.0.1:8000/admin/`
2. Login with superuser credentials
3. Click on "Users" → find your superuser
4. Edit and set **Role** to `Admin`
5. Save

---

## Phase 3: Test the API

### Health Check (No Auth Required)

```bash
curl http://127.0.0.1:8000/api/health/
```

Expected response:

```json
{
  "success": true,
  "message": "AIMS LMS backend is running.",
  "api_version": "2.0"
}
```

### Login as Admin

```bash
curl -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_admin_username",
    "password": "your_admin_password"
  }'
```

Save the `access` token from the response. You'll use it in requests as:

```bash
-H "Authorization: Bearer {access_token}"
```

---

## Phase 4: Complete Workflow

### A) Admin Flow

**1. Login**

```bash
ACCESS_TOKEN=$(curl -s -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"AdminPass123!"}' | jq -r '.access')
```

**2. Enroll Teacher**

```bash
curl -X POST http://127.0.0.1:8000/api/users/enroll_teacher/ \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "teacher_john",
    "password": "TeacherPass123!",
    "email": "john@school.com",
    "first_name": "John",
    "last_name": "Smith"
  }'
```

Response will include `id` of created teacher. Save this for later.

---

### B) Teacher Flow

**1. Login**

```bash
TEACHER_TOKEN=$(curl -s -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"teacher_john","password":"TeacherPass123!"}' | jq -r '.access')
```

**2. Enroll Student**

```bash
curl -X POST http://127.0.0.1:8000/api/users/enroll_student_by_teacher/ \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "student_alice",
    "password": "StudentPass123!",
    "email": "alice@school.com",
    "first_name": "Alice",
    "last_name": "Johnson"
  }'
```

Response includes `student.id`. Save this.

**3. View Enrolled Students**

```bash
curl http://127.0.0.1:8000/api/enrollments/my_students/ \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

**4. Assign Task to Student**

```bash
curl -X POST http://127.0.0.1:8000/api/tasks/ \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 3,
    "title": "Math Homework - Chapter 5",
    "description": "Complete problems 1-20 on pages 45-47",
    "due_date": "2026-05-10T18:00:00Z"
  }'
```

**5. Update Task**

```bash
curl -X PATCH http://127.0.0.1:8000/api/tasks/1/update_task/ \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Math Homework - Chapter 6",
    "due_date": "2026-05-15T18:00:00Z"
  }'
```

**6. View Created Tasks**

```bash
curl http://127.0.0.1:8000/api/tasks/teacher_tasks/ \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

**7. Delete Task**

```bash
curl -X DELETE http://127.0.0.1:8000/api/tasks/1/delete_task/ \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

---

### C) Student Flow

**1. Self-Register (No Auth Required)**

```bash
curl -X POST http://127.0.0.1:8000/api/users/register_student/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "student_bob",
    "password": "StudentPass123!",
    "email": "bob@school.com",
    "first_name": "Bob",
    "last_name": "Brown"
  }'
```

**2. Login**

```bash
STUDENT_TOKEN=$(curl -s -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"student_alice","password":"StudentPass123!"}' | jq -r '.access')
```

**3. View All Assigned Tasks**

```bash
curl http://127.0.0.1:8000/api/tasks/my_tasks/ \
  -H "Authorization: Bearer $STUDENT_TOKEN"
```

**4. Filter Pending Tasks**

```bash
curl http://127.0.0.1:8000/api/tasks/my_tasks/?completed=false \
  -H "Authorization: Bearer $STUDENT_TOKEN"
```

**5. Mark Task as Completed**

```bash
curl -X PATCH http://127.0.0.1:8000/api/tasks/1/submit_task/ \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_completed": true}'
```

---

## Phase 5: Testing

### Run All Tests

```bash
python manage.py test
```

Expected output:

```
Ran 17 tests in ~45s
OK
```

### Run Specific Test Class

```bash
python manage.py test core.tests.JWTAuthenticationTests
python manage.py test core.tests.TaskViewSetTests
```

### Test with Verbose Output

```bash
python manage.py test --verbosity=2
```

---

## Phase 6: Useful Commands

### Check Project Status

```bash
python manage.py check
```

### Create Migrations

```bash
python manage.py makemigrations
```

### Apply Migrations

```bash
python manage.py migrate
```

### Access Django Shell

```bash
python manage.py shell
```

From shell, you can:

```python
from core.models import User, Task
from django.utils import timezone

# Create users programmatically
admin = User.objects.create_superuser('admin', 'admin@test.com', 'password')
admin.role = User.IS_ADMIN
admin.save()

# Query tasks
tasks = Task.objects.filter(is_completed=False)
```

### Clear Database (Development Only)

```bash
python manage.py flush
```

---

## Phase 7: Admin Panel Features

Access: `http://127.0.0.1:8000/admin/`

### Users Management

- Create/edit/delete users
- Filter by role (admin, teacher, student)
- View who created each user
- Manage permissions

### Enrollments

- View all teacher-student relationships
- Create manual enrollments
- View enrollment timestamps

### Tasks

- Create tasks manually
- Assign to students
- Mark as completed
- Filter by teacher, student, due date
- Search by title

---

## Phase 8: Common Troubleshooting

### Issue: "No module named 'rest_framework'"

**Fix:**

```bash
python3 -m pip install -r requirements.txt
```

### Issue: "No module named 'corsheaders'"

**Fix:**

Install dependencies with the same Python executable used to run Django:

```bash
python3 -m pip install -r requirements.txt
python3 manage.py runserver
```

### Issue: "connect ECONNREFUSED 127.0.0.1:8000"

**Fix:**

Make sure backend is running before starting frontend, or point frontend to the correct backend URL:

```bash
python3 manage.py runserver
# in frontend shell (if backend uses a different port):
DJANGO_BACKEND_URL=http://127.0.0.1:8001 npm run dev
```

### Issue: "CORS not working"

**Add to settings.py:**

```python
INSTALLED_APPS = [
    ...
    "corsheaders",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    ...
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # React app
    "http://localhost:8000",  # Django admin
]
```

### Issue: JWT token expired

**Solution:** Use refresh token to get new access token

```bash
curl -X POST http://127.0.0.1:8000/api/auth/refresh/ \
  -H "Content-Type: application/json" \
  -d '{"refresh": "{refresh_token}"}'
```

### Issue: Tests fail after schema changes

**Fix:**

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py test
```

---

## Phase 9: Deployment Checklist

Before production:

- [ ] Set `DEBUG = False` in settings.py
- [ ] Create `.env` file with secure `SECRET_KEY`
- [ ] Set up PostgreSQL database
- [ ] Configure `ALLOWED_HOSTS`
- [ ] Enable HTTPS/SSL
- [ ] Set up CORS properly for frontend domain
- [ ] Configure static files with WhiteNoise
- [ ] Set up email backend for notifications
- [ ] Create backup strategy for database
- [ ] Set up monitoring and logging
- [ ] Run security checks: `python manage.py check --deploy`

---

## Files Reference

| File                       | Purpose                                  |
| -------------------------- | ---------------------------------------- |
| `core/models.py`           | Database schema (User, Enrollment, Task) |
| `core/serializers.py`      | JSON request/response validation         |
| `core/viewsets.py`         | REST API endpoints with JWT auth         |
| `core/urls.py`             | API routing (DRF routers)                |
| `core/views.py`            | Health check endpoint                    |
| `core/admin.py`            | Django admin configuration               |
| `core/tests.py`            | 17 comprehensive test cases              |
| `aims_college/settings.py` | Django config + DRF + JWT settings       |
| `aims_college/urls.py`     | Main URL routing                         |
| `requirements.txt`         | Project dependencies                     |
| `API_DOCUMENTATION.md`     | Full API reference                       |

---

## Key Features Summary

✅ **JWT Authentication**

- Secure token-based API
- 1-hour access token, 7-day refresh token
- Automatic token rotation

✅ **Role-Based Access Control**

- Admin: Manage teachers
- Teacher: Manage students, assign tasks
- Student: View tasks, mark completed

✅ **Complete Task Management**

- Create, read, update, delete tasks
- Automatic enrollment validation
- Task completion tracking

✅ **Comprehensive Testing**

- 17 tests covering all workflows
- JWT auth tests
- Permission/authorization tests
- CRUD operation tests

✅ **Production-Ready**

- Error handling
- Input validation
- Database constraints
- Django best practices

---

## Next: Connect a Frontend

Your API is ready for:

- **React/Vue/Angular** web app
- **Flutter/React Native** mobile app
- **Postman** testing

All communicate via REST API at `http://127.0.0.1:8000/api/`

See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for complete endpoint reference.
