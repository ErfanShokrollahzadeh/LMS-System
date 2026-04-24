from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from .models import Enrollment, Task, User


class JWTAuthenticationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.teacher = User.objects.create_user(
            username="teacher_auth",
            password="TestPass123!",
            role=User.IS_TEACHER,
        )

    def test_jwt_login(self):
        """Test JWT token generation on login."""
        response = self.client.post(
            "/api/auth/login/",
            {
                "username": "teacher_auth",
                "password": "TestPass123!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_jwt_invalid_credentials(self):
        """Test JWT login with invalid credentials."""
        response = self.client.post(
            "/api/auth/login/",
            {
                "username": "teacher_auth",
                "password": "WrongPassword!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_protected_endpoint_without_token(self):
        """Test accessing protected endpoint without JWT token."""
        response = self.client.get("/api/users/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_protected_endpoint_with_valid_token(self):
        """Test accessing protected endpoint with valid JWT token."""
        login_response = self.client.post(
            "/api/auth/login/",
            {
                "username": "teacher_auth",
                "password": "TestPass123!",
            },
            format="json",
        )
        token = login_response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response = self.client.get("/api/users/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "teacher_auth")


class UserViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username="admin_user",
            password="AdminPass123!",
            email="admin@example.com",
        )
        self.admin.role = User.IS_ADMIN
        self.admin.save()
        self.admin_token = self._get_token("admin_user", "AdminPass123!")
        self.teacher = User.objects.create_user(
            username="teacher_user",
            password="TeacherPass123!",
            role=User.IS_TEACHER,
        )
        self.teacher_token = self._get_token("teacher_user", "TeacherPass123!")

    def _get_token(self, username, password):
        response = self.client.post(
            "/api/auth/login/",
            {"username": username, "password": password},
            format="json",
        )
        return response.data["access"]

    def _auth_header(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_student_self_registration(self):
        """Test public student self-registration."""
        response = self.client.post(
            "/api/users/register_student/",
            {
                "username": "new_student",
                "password": "StudentPass123!",
                "email": "student@example.com",
                "first_name": "John",
                "last_name": "Doe",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["role"], User.IS_STUDENT)

    def test_admin_enroll_teacher(self):
        """Test admin enrollment of new teacher."""
        self._auth_header(self.admin_token)
        response = self.client.post(
            "/api/users/enroll_teacher/",
            {
                "username": "new_teacher",
                "password": "TeacherPass123!",
                "email": "teacher@example.com",
                "first_name": "Jane",
                "last_name": "Smith",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["role"], User.IS_TEACHER)
        created_teacher = User.objects.get(username="new_teacher")
        self.assertEqual(created_teacher.created_by, self.admin)

    def test_non_admin_cannot_enroll_teacher(self):
        """Test that non-admin users cannot enroll teachers."""
        self._auth_header(self.teacher_token)
        response = self.client.post(
            "/api/users/enroll_teacher/",
            {
                "username": "another_teacher",
                "password": "Pass123!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_enroll_student(self):
        """Test teacher enrollment of new student."""
        self._auth_header(self.teacher_token)
        response = self.client.post(
            "/api/users/enroll_student_by_teacher/",
            {
                "username": "new_student",
                "password": "StudentPass123!",
                "email": "student@example.com",
                "first_name": "Alice",
                "last_name": "Johnson",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("student", response.data)
        self.assertIn("enrollment_id", response.data)


class EnrollmentViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.teacher = User.objects.create_user(
            username="teacher_enroll",
            password="Pass123!",
            role=User.IS_TEACHER,
        )
        self.student = User.objects.create_user(
            username="student_enroll",
            password="Pass123!",
            role=User.IS_STUDENT,
        )
        self.teacher_token = self._get_token("teacher_enroll", "Pass123!")

    def _get_token(self, username, password):
        response = self.client.post(
            "/api/auth/login/",
            {"username": username, "password": password},
            format="json",
        )
        return response.data["access"]

    def _auth_header(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_teacher_view_enrolled_students(self):
        """Test teacher viewing their enrolled students."""
        Enrollment.objects.create(teacher=self.teacher, student=self.student)
        self._auth_header(self.teacher_token)
        response = self.client.get("/api/enrollments/my_students/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["student_username"], "student_enroll")

    def test_teacher_enroll_existing_student(self):
        """Test teacher enrolling an existing student."""
        self._auth_header(self.teacher_token)
        response = self.client.post(
            "/api/enrollments/enroll_existing_student/",
            {"student_id": self.student.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Enrollment.objects.filter(
                teacher=self.teacher, student=self.student
            ).exists()
        )


class TaskViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.teacher = User.objects.create_user(
            username="teacher_task",
            password="Pass123!",
            role=User.IS_TEACHER,
        )
        self.student = User.objects.create_user(
            username="student_task",
            password="Pass123!",
            role=User.IS_STUDENT,
        )
        Enrollment.objects.create(teacher=self.teacher, student=self.student)
        self.teacher_token = self._get_token("teacher_task", "Pass123!")
        self.student_token = self._get_token("student_task", "Pass123!")

    def _get_token(self, username, password):
        response = self.client.post(
            "/api/auth/login/",
            {"username": username, "password": password},
            format="json",
        )
        return response.data["access"]

    def _auth_header(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_teacher_create_task(self):
        """Test teacher creating and assigning a task."""
        self._auth_header(self.teacher_token)
        due_date = (timezone.now() + timezone.timedelta(days=3)).isoformat()
        response = self.client.post(
            "/api/tasks/",
            {
                "student_id": self.student.id,
                "title": "Math Assignment",
                "description": "Complete problems 1-10",
                "due_date": due_date,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "Math Assignment")
        self.assertTrue(Task.objects.filter(title="Math Assignment").exists())

    def test_student_view_tasks(self):
        """Test student viewing assigned tasks."""
        task = Task.objects.create(
            teacher=self.teacher,
            student=self.student,
            title="English Essay",
            description="Write 500 words",
            due_date=timezone.now() + timezone.timedelta(days=2),
        )
        self._auth_header(self.student_token)
        response = self.client.get("/api/tasks/my_tasks/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "English Essay")

    def test_student_submit_task(self):
        """Test student marking task as completed."""
        task = Task.objects.create(
            teacher=self.teacher,
            student=self.student,
            title="Science Project",
            description="Research and report",
            due_date=timezone.now() + timezone.timedelta(days=5),
        )
        self._auth_header(self.student_token)
        response = self.client.patch(
            f"/api/tasks/{task.id}/submit_task/",
            {"is_completed": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["is_completed"], True)

    def test_teacher_update_task(self):
        """Test teacher updating task details."""
        task = Task.objects.create(
            teacher=self.teacher,
            student=self.student,
            title="Original Title",
            description="Original description",
            due_date=timezone.now() + timezone.timedelta(days=1),
        )
        self._auth_header(self.teacher_token)
        new_due_date = (timezone.now() +
                        timezone.timedelta(days=7)).isoformat()
        response = self.client.patch(
            f"/api/tasks/{task.id}/update_task/",
            {
                "title": "Updated Title",
                "description": "Updated description",
                "due_date": new_due_date,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Updated Title")

    def test_teacher_delete_task(self):
        """Test teacher deleting a task."""
        task = Task.objects.create(
            teacher=self.teacher,
            student=self.student,
            title="Task to Delete",
            description="Will be deleted",
            due_date=timezone.now() + timezone.timedelta(days=1),
        )
        self._auth_header(self.teacher_token)
        response = self.client.delete(f"/api/tasks/{task.id}/delete_task/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Task.objects.filter(id=task.id).exists())

    def test_teacher_view_own_tasks(self):
        """Test teacher viewing tasks they created."""
        Task.objects.create(
            teacher=self.teacher,
            student=self.student,
            title="Teacher Task 1",
            description="Description 1",
            due_date=timezone.now() + timezone.timedelta(days=1),
        )
        Task.objects.create(
            teacher=self.teacher,
            student=self.student,
            title="Teacher Task 2",
            description="Description 2",
            due_date=timezone.now() + timezone.timedelta(days=2),
        )
        self._auth_header(self.teacher_token)
        response = self.client.get("/api/tasks/teacher_tasks/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_student_filter_tasks_by_completion(self):
        """Test student filtering tasks by completion status."""
        completed_task = Task.objects.create(
            teacher=self.teacher,
            student=self.student,
            title="Completed",
            description="Done",
            due_date=timezone.now() + timezone.timedelta(days=1),
            is_completed=True,
        )
        pending_task = Task.objects.create(
            teacher=self.teacher,
            student=self.student,
            title="Pending",
            description="Not done",
            due_date=timezone.now() + timezone.timedelta(days=1),
            is_completed=False,
        )
        self._auth_header(self.student_token)

        # Filter completed tasks
        response = self.client.get("/api/tasks/my_tasks/?completed=true")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Completed")

        # Filter pending tasks
        response = self.client.get("/api/tasks/my_tasks/?completed=false")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Pending")
