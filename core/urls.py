from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("me/", views.me, name="me"),
    path("admin/enroll-teacher/", views.enroll_teacher, name="enroll_teacher"),
    path("teacher/enroll-student/", views.enroll_student, name="enroll_student"),
    path("teacher/students/", views.list_my_students, name="list_my_students"),
    path("teacher/assign-task/", views.assign_task, name="assign_task"),
    path("student/tasks/", views.my_tasks, name="my_tasks"),
]
