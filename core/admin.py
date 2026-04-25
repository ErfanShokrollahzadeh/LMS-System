# superuser username and pass : erfan8080 and admin1234

from django.contrib import admin

from .models import Enrollment, Task, User

User._meta.verbose_name = "Student"
User._meta.verbose_name_plural = "Students"


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = (
        "username",
        "email",
        "role",
        "gender",
        "current_academic",
        "enrolled_status",
        "created_by",
        "is_active",
    )
    list_filter = ("role", "gender", "enrolled_status",
                   "is_active", "is_staff")
    search_fields = ("username", "email", "first_name", "last_name")
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "username",
                    "password",
                    "email",
                    "first_name",
                    "last_name",
                    "role",
                    "created_by",
                )
            },
        ),
        (
            "Student Profile",
            {
                "fields": (
                    "date_of_birth",
                    "gender",
                    "current_academic",
                    "enrolled_status",
                    "profile_photo",
                )
            },
        ),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )


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
