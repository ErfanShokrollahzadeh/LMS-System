from django.contrib import admin

from .models import Enrollment, Task, User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("username", "email", "role", "created_by", "is_active")
    list_filter = ("role", "is_active", "is_staff")
    search_fields = ("username", "email", "first_name", "last_name")


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ("teacher", "student", "enrolled_at")
    list_filter = ("teacher", "enrolled_at")
    search_fields = ("teacher__username", "student__username")


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "teacher", "student", "due_date", "is_completed")
    list_filter = ("is_completed", "due_date", "teacher")
    search_fields = ("title", "teacher__username", "student__username")
