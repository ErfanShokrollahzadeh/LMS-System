import logging

from django.db import IntegrityError
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth import get_user_model
from django.utils import timezone

from .models import Enrollment, Task
from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    EnrollmentSerializer,
    TaskSerializer,
    TaskCreateUpdateSerializer,
    StudentTaskSubmissionSerializer,
)

User = get_user_model()
logger = logging.getLogger(__name__)


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    JWT Login endpoint.
    Request:
        POST /api/auth/login/
        {
            "username": "teacher_one",
            "password": "StrongPass123!"
        }
    Response:
        {
            "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
            "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
        }
    """

    pass


class StudentViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("-id")
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        return UserSerializer

    def _is_admin(self, user):
        return user.role == User.IS_ADMIN or user.is_superuser

    def _ensure_admin(self, request):
        if not self._is_admin(request.user):
            return Response(
                {"detail": "Only managers can create, edit, or delete users."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return None

    def create(self, request, *args, **kwargs):
        denied = self._ensure_admin(request)
        if denied:
            return denied

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = serializer.save(created_by=request.user)
        except IntegrityError:
            return Response(
                {"detail": "Unable to save user due to duplicate or invalid database values."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            logger.exception("Unexpected error while creating user")
            return Response(
                {"detail": "Unexpected error while creating user."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        denied = self._ensure_admin(request)
        if denied:
            return denied
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        denied = self._ensure_admin(request)
        if denied:
            return denied
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        denied = self._ensure_admin(request)
        if denied:
            return denied
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=["get"])
    def me(self, request):
        """Get current authenticated student profile."""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def register_student(self, request):
        """
        Public endpoint for student self-registration.
        Request:
            {
                "username": "student_new",
                "password": "SecurePass123!",
                "email": "student@example.com",
                "first_name": "John",
                "last_name": "Doe"
            }
        """
        data = request.data.copy()
        data["role"] = User.IS_STUDENT
        serializer = UserCreateSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def enroll_teacher(self, request):
        """
        Admin only: Enroll a new teacher.
        Request:
            {
                "username": "teacher_new",
                "password": "SecurePass123!",
                "email": "teacher@example.com",
                "first_name": "Jane",
                "last_name": "Smith"
            }
        """
        if request.user.role != User.IS_ADMIN and not request.user.is_superuser:
            return Response(
                {"detail": "Only admins can enroll teachers."},
                status=status.HTTP_403_FORBIDDEN,
            )

        data = request.data.copy()
        data["role"] = User.IS_TEACHER
        serializer = UserCreateSerializer(data=data)
        if serializer.is_valid():
            try:
                user = serializer.save(created_by=request.user)
            except IntegrityError:
                return Response(
                    {"detail": "Unable to save teacher due to duplicate or invalid database values."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            except Exception:
                logger.exception("Unexpected error while enrolling teacher")
                return Response(
                    {"detail": "Unexpected error while enrolling teacher."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
            return Response(
                UserSerializer(user).data, status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def enroll_student_by_teacher(self, request):
        """
        Teacher only: Enroll a new student and automatically add to teacher's roster.
        Request:
            {
                "username": "student_new",
                "password": "SecurePass123!",
                "email": "student@example.com",
                "first_name": "Alice",
                "last_name": "Johnson"
            }
        """
        if request.user.role != User.IS_TEACHER:
            return Response(
                {"detail": "Only teachers can enroll students."},
                status=status.HTTP_403_FORBIDDEN,
            )

        data = request.data.copy()
        data["role"] = User.IS_STUDENT
        serializer = UserCreateSerializer(data=data)
        if serializer.is_valid():
            try:
                student = serializer.save(created_by=request.user)
            except IntegrityError:
                return Response(
                    {"detail": "Unable to save student due to duplicate or invalid database values."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            except Exception:
                logger.exception("Unexpected error while enrolling student")
                return Response(
                    {"detail": "Unexpected error while enrolling student."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
            enrollment = Enrollment.objects.create(
                teacher=request.user, student=student
            )
            return Response(
                {
                    "student": UserSerializer(student).data,
                    "enrollment_id": enrollment.id,
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Backward-compatible alias for old imports.
UserViewSet = StudentViewSet


class EnrollmentViewSet(viewsets.ModelViewSet):
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Filter enrollments based on user role.
        Teachers see their enrolled students.
        """
        user = self.request.user
        if user.role == User.IS_ADMIN or user.is_superuser:
            queryset = Enrollment.objects.all()
        elif user.role == User.IS_TEACHER:
            queryset = Enrollment.objects.filter(teacher=user)
        else:
            return Enrollment.objects.none()

        teacher_id = self.request.query_params.get("teacher_id")
        if teacher_id:
            if user.role == User.IS_TEACHER and str(user.id) != str(teacher_id):
                return Enrollment.objects.none()
            queryset = queryset.filter(teacher_id=teacher_id)

        return queryset

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def enroll_existing_student(self, request):
        """
        Teacher only: Enroll an existing student.
        Request:
            {
                "student_id": 5
            }
        """
        if request.user.role != User.IS_TEACHER:
            return Response(
                {"detail": "Only teachers can manage enrollments."},
                status=status.HTTP_403_FORBIDDEN,
            )

        student_id = request.data.get("student_id")
        if not student_id:
            return Response(
                {"detail": "student_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            student = User.objects.get(id=student_id, role=User.IS_STUDENT)
        except User.DoesNotExist:
            return Response(
                {"detail": "Student not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        enrollment, created = Enrollment.objects.get_or_create(
            teacher=request.user, student=student
        )
        if created:
            return Response(
                EnrollmentSerializer(enrollment).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"detail": "Student already enrolled."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def my_students(self, request):
        """Teacher: Get list of enrolled students."""
        if request.user.role != User.IS_TEACHER:
            return Response(
                {"detail": "Only teachers can view students."},
                status=status.HTTP_403_FORBIDDEN,
            )

        enrollments = Enrollment.objects.filter(teacher=request.user)
        serializer = self.get_serializer(enrollments, many=True)
        return Response(serializer.data)


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Filter tasks based on user role.
        Teachers see tasks they created.
        Students see tasks assigned to them.
        """
        user = self.request.user
        if user.role == User.IS_TEACHER:
            queryset = Task.objects.filter(teacher=user)
        elif user.role == User.IS_STUDENT:
            queryset = Task.objects.filter(student=user)
        elif user.role == User.IS_ADMIN or user.is_superuser:
            queryset = Task.objects.all()
        else:
            return Task.objects.none()

        student_id = self.request.query_params.get("student_id")
        if student_id:
            if user.role == User.IS_STUDENT and str(user.id) != str(student_id):
                return Task.objects.none()
            queryset = queryset.filter(student_id=student_id)

        return queryset.order_by("deadline", "due_date")

    def create(self, request, *args, **kwargs):
        """
        Teacher only: Create and assign a task to a student.
        Request:
            {
                "student_id": 5,
                "title": "Math Homework",
                "description": "Chapter 5 problems",
                "due_date": "2026-05-01T10:00:00Z",
                "deadline": "2026-05-02T10:00:00Z"
            }
        """
        if request.user.role != User.IS_TEACHER:
            return Response(
                {"detail": "Only teachers can assign tasks."},
                status=status.HTTP_403_FORBIDDEN,
            )

        student_id = request.data.get("student_id")
        if not student_id:
            return Response(
                {"detail": "student_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            student = User.objects.get(id=student_id, role=User.IS_STUDENT)
        except User.DoesNotExist:
            return Response(
                {"detail": "Student not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if student is enrolled with this teacher
        if not Enrollment.objects.filter(teacher=request.user, student=student).exists():
            return Response(
                {"detail": "You can only assign tasks to your enrolled students."},
                status=status.HTTP_403_FORBIDDEN,
            )

        data = request.data.copy()
        data["teacher"] = request.user.id
        data["student"] = student.id

        serializer = TaskCreateUpdateSerializer(data=data)
        if serializer.is_valid():
            task = serializer.save(teacher=request.user, student=student)
            return Response(
                TaskSerializer(task).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["patch"], permission_classes=[IsAuthenticated])
    def update_task(self, request, pk=None):
        """
        Teacher only: Update task details (title, description, due_date).
        Request:
            PATCH /api/tasks/{id}/update_task/
            {
                "title": "Updated Title",
                "description": "Updated description",
                "due_date": "2026-05-05T10:00:00Z"
            }
        """
        task = self.get_object()

        if task.teacher != request.user:
            return Response(
                {"detail": "You can only edit your own tasks."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = TaskCreateUpdateSerializer(
            task, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(TaskSerializer(task).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["delete"], permission_classes=[IsAuthenticated])
    def delete_task(self, request, pk=None):
        """
        Teacher only: Delete a task.
        Request:
            DELETE /api/tasks/{id}/delete_task/
        """
        task = self.get_object()

        if task.teacher != request.user:
            return Response(
                {"detail": "You can only delete your own tasks."},
                status=status.HTTP_403_FORBIDDEN,
            )

        task.delete()
        return Response(
            {"detail": "Task deleted successfully."},
            status=status.HTTP_204_NO_CONTENT,
        )

    @action(detail=True, methods=["patch"], permission_classes=[IsAuthenticated])
    def submit_task(self, request, pk=None):
        """
        Student only: Submit task answer with optional file upload.
        Request:
            PATCH /api/tasks/{id}/submit_task/
            {
                "answer_text": "...",
                "answer_file": <file>
            }
        """
        task = self.get_object()

        if task.student != request.user:
            return Response(
                {"detail": "You can only submit your own tasks."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = StudentTaskSubmissionSerializer(
            task, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save(
                is_completed=True,
                submitted_at=timezone.now(),
            )
            return Response(TaskSerializer(task).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    submit_task.parser_classes = [MultiPartParser, FormParser]

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def my_tasks(self, request):
        """
        Student: Get all tasks assigned to current student.
        Optional query params:
            ?completed=true/false (filter by completion status)
            ?due_before=2026-05-01T00:00:00Z
        """
        if request.user.role != User.IS_STUDENT:
            return Response(
                {"detail": "Only students can view their tasks."},
                status=status.HTTP_403_FORBIDDEN,
            )

        tasks = Task.objects.filter(student=request.user)

        # Filter by completion status if provided
        completed = request.query_params.get("completed")
        if completed is not None:
            is_completed = completed.lower() == "true"
            tasks = tasks.filter(is_completed=is_completed)

        # Filter by due date if provided
        due_before = request.query_params.get("due_before")
        if due_before:
            try:
                due_date = timezone.datetime.fromisoformat(due_before)
                tasks = tasks.filter(due_date__lte=due_date)
            except (ValueError, AttributeError):
                pass

        serializer = self.get_serializer(tasks, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def teacher_tasks(self, request):
        """
        Teacher: Get all tasks created by current teacher.
        Optional query params:
            ?student_id={id} (filter by student)
            ?completed=true/false
        """
        if request.user.role != User.IS_TEACHER:
            return Response(
                {"detail": "Only teachers can view their created tasks."},
                status=status.HTTP_403_FORBIDDEN,
            )

        tasks = Task.objects.filter(teacher=request.user)

        # Filter by student if provided
        student_id = request.query_params.get("student_id")
        if student_id:
            tasks = tasks.filter(student_id=student_id)

        # Filter by completion status if provided
        completed = request.query_params.get("completed")
        if completed is not None:
            is_completed = completed.lower() == "true"
            tasks = tasks.filter(is_completed=is_completed)

        serializer = self.get_serializer(tasks, many=True)
        return Response(serializer.data)
