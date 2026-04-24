import json

from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils.dateparse import parse_datetime
from django.views.decorators.http import require_GET, require_POST

from .models import Enrollment, Task

User = get_user_model()


def _json_error(message, status=400):
    return JsonResponse({"success": False, "message": message}, status=status)


def _get_json_body(request):
    try:
        return json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return None


def _role_required(*allowed_roles):
    def decorator(view_func):
        def wrapped(request, *args, **kwargs):
            if request.user.role not in allowed_roles and not request.user.is_superuser:
                return _json_error("You are not allowed to perform this action.", status=403)
            return view_func(request, *args, **kwargs)

        return wrapped

    return decorator


@require_GET
def health(request):
    return JsonResponse({"success": True, "message": "AIMS LMS backend is running."})


@require_GET
@login_required
def me(request):
    return JsonResponse(
        {
            "success": True,
            "user": {
                "id": request.user.id,
                "username": request.user.username,
                "role": request.user.role,
            },
        }
    )


@require_POST
@login_required
@_role_required(User.IS_ADMIN)
def enroll_teacher(request):
    payload = _get_json_body(request)
    if payload is None:
        return _json_error("Invalid JSON payload.")

    username = payload.get("username")
    password = payload.get("password")
    first_name = payload.get("first_name", "")
    last_name = payload.get("last_name", "")
    email = payload.get("email", "")

    if not username or not password:
        return _json_error("Both username and password are required.")

    if User.objects.filter(username=username).exists():
        return _json_error("A user with this username already exists.")

    teacher = User.objects.create_user(
        username=username,
        password=password,
        role=User.IS_TEACHER,
        first_name=first_name,
        last_name=last_name,
        email=email,
        created_by=request.user,
    )
    return JsonResponse(
        {
            "success": True,
            "message": "Teacher enrolled successfully.",
            "teacher": {
                "id": teacher.id,
                "username": teacher.username,
            },
        },
        status=201,
    )


@require_POST
@login_required
@_role_required(User.IS_TEACHER)
def enroll_student(request):
    payload = _get_json_body(request)
    if payload is None:
        return _json_error("Invalid JSON payload.")

    username = payload.get("username")
    password = payload.get("password")
    first_name = payload.get("first_name", "")
    last_name = payload.get("last_name", "")
    email = payload.get("email", "")

    if not username or not password:
        return _json_error("Both username and password are required.")

    if User.objects.filter(username=username).exists():
        return _json_error("A user with this username already exists.")

    student = User.objects.create_user(
        username=username,
        password=password,
        role=User.IS_STUDENT,
        first_name=first_name,
        last_name=last_name,
        email=email,
        created_by=request.user,
    )
    enrollment = Enrollment.objects.create(
        teacher=request.user, student=student)

    return JsonResponse(
        {
            "success": True,
            "message": "Student enrolled successfully.",
            "student": {
                "id": student.id,
                "username": student.username,
            },
            "enrollment_id": enrollment.id,
        },
        status=201,
    )


@require_GET
@login_required
@_role_required(User.IS_TEACHER)
def list_my_students(request):
    enrollments = (
        Enrollment.objects.filter(teacher=request.user)
        .select_related("student")
        .order_by("student__username")
    )
    students = [
        {
            "id": enrollment.student.id,
            "username": enrollment.student.username,
            "first_name": enrollment.student.first_name,
            "last_name": enrollment.student.last_name,
            "email": enrollment.student.email,
        }
        for enrollment in enrollments
    ]
    return JsonResponse({"success": True, "students": students})


@require_POST
@login_required
@_role_required(User.IS_TEACHER)
def assign_task(request):
    payload = _get_json_body(request)
    if payload is None:
        return _json_error("Invalid JSON payload.")

    student_id = payload.get("student_id")
    title = payload.get("title")
    description = payload.get("description", "")
    due_date_raw = payload.get("due_date")

    if not student_id or not title or not due_date_raw:
        return _json_error("student_id, title and due_date are required.")

    try:
        student = User.objects.get(id=student_id, role=User.IS_STUDENT)
    except User.DoesNotExist:
        return _json_error("Student not found.", status=404)

    if not Enrollment.objects.filter(teacher=request.user, student=student).exists():
        return _json_error("You can assign tasks only to your enrolled students.", status=403)

    due_date = parse_datetime(due_date_raw)
    if due_date is None:
        return _json_error("due_date must be in ISO datetime format.")

    task = Task.objects.create(
        teacher=request.user,
        student=student,
        title=title,
        description=description,
        due_date=due_date,
    )
    return JsonResponse(
        {
            "success": True,
            "message": "Task assigned successfully.",
            "task": {
                "id": task.id,
                "title": task.title,
                "student": task.student.username,
                "due_date": task.due_date.isoformat(),
            },
        },
        status=201,
    )


@require_GET
@login_required
@_role_required(User.IS_STUDENT)
def my_tasks(request):
    tasks = Task.objects.filter(student=request.user).select_related("teacher")
    payload = [
        {
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "teacher": task.teacher.username,
            "due_date": task.due_date.isoformat(),
            "is_completed": task.is_completed,
        }
        for task in tasks
    ]
    return JsonResponse({"success": True, "tasks": payload})
