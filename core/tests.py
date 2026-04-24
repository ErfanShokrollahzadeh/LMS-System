from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from .models import Enrollment, Task, User


class LMSWorkflowTests(TestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username="aims_admin",
            password="StrongPass123!",
            role=User.IS_ADMIN,
        )
        self.teacher_user = User.objects.create_user(
            username="teacher_one",
            password="StrongPass123!",
            role=User.IS_TEACHER,
        )
        self.student_user = User.objects.create_user(
            username="student_one",
            password="StrongPass123!",
            role=User.IS_STUDENT,
        )

    def test_admin_can_enroll_teacher(self):
        self.client.force_login(self.admin_user)
        response = self.client.post(
            reverse("enroll_teacher"),
            data={
                "username": "teacher_two",
                "password": "StrongPass123!",
                "first_name": "Teacher",
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        created_teacher = User.objects.get(username="teacher_two")
        self.assertEqual(created_teacher.role, User.IS_TEACHER)
        self.assertEqual(created_teacher.created_by, self.admin_user)

    def test_teacher_can_enroll_student(self):
        self.client.force_login(self.teacher_user)
        response = self.client.post(
            reverse("enroll_student"),
            data={
                "username": "student_two",
                "password": "StrongPass123!",
                "first_name": "Student",
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        enrolled_student = User.objects.get(username="student_two")
        self.assertEqual(enrolled_student.role, User.IS_STUDENT)
        self.assertTrue(
            Enrollment.objects.filter(
                teacher=self.teacher_user,
                student=enrolled_student,
            ).exists()
        )

    def test_teacher_can_assign_task_to_enrolled_student(self):
        Enrollment.objects.create(
            teacher=self.teacher_user, student=self.student_user)
        self.client.force_login(self.teacher_user)
        due_date = (timezone.now() + timezone.timedelta(days=2)).isoformat()
        response = self.client.post(
            reverse("assign_task"),
            data={
                "student_id": self.student_user.id,
                "title": "Math Worksheet",
                "description": "Complete chapter 1 questions",
                "due_date": due_date,
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(
            Task.objects.filter(
                teacher=self.teacher_user,
                student=self.student_user,
                title="Math Worksheet",
            ).exists()
        )

    def test_teacher_cannot_assign_task_to_not_enrolled_student(self):
        self.client.force_login(self.teacher_user)
        due_date = (timezone.now() + timezone.timedelta(days=2)).isoformat()
        response = self.client.post(
            reverse("assign_task"),
            data={
                "student_id": self.student_user.id,
                "title": "Science Quiz",
                "due_date": due_date,
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)

    def test_student_can_see_only_their_tasks(self):
        Enrollment.objects.create(
            teacher=self.teacher_user, student=self.student_user)
        Task.objects.create(
            teacher=self.teacher_user,
            student=self.student_user,
            title="History Essay",
            description="Write two pages",
            due_date=timezone.now() + timezone.timedelta(days=1),
        )
        self.client.force_login(self.student_user)
        response = self.client.get(reverse("my_tasks"))
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(len(body["tasks"]), 1)
        self.assertEqual(body["tasks"][0]["title"], "History Essay")
