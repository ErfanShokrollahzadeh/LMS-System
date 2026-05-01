from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models


class User(AbstractUser):
    IS_ADMIN = "admin"
    IS_TEACHER = "teacher"
    IS_STUDENT = "student"

    ROLE_CHOICES = [
        (IS_ADMIN, "Admin"),
        (IS_TEACHER, "Teacher"),
        (IS_STUDENT, "Student"),
    ]

    role = models.CharField(
        max_length=10,
        choices=ROLE_CHOICES,
        default=IS_STUDENT,
    )
    date_of_birth = models.DateField(
        null=True,
        blank=True,
        verbose_name="Birth of Date",
    )
    GENDER_MALE = "male"
    GENDER_FEMALE = "female"
    GENDER_OTHER = "other"
    GENDER_CHOICES = [
        (GENDER_MALE, "Male"),
        (GENDER_FEMALE, "Female"),
        (GENDER_OTHER, "Other"),
    ]
    gender = models.CharField(
        max_length=10,
        choices=GENDER_CHOICES,
        blank=True,
        verbose_name="Gender",
    )
    current_academic = models.CharField(
        max_length=150,
        blank=True,
        verbose_name="Current Academic",
    )
    enrolled_status = models.BooleanField(
        default=True,
        verbose_name="Enrolled Status",
    )
    profile_photo = models.ImageField(
        upload_to="profile_photos/",
        null=True,
        blank=True,
        verbose_name="Profile Photo",
    )
    created_by = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_users",
    )

    @property
    def is_aims_admin(self):
        return self.role == self.IS_ADMIN or self.is_superuser

    @property
    def is_aims_teacher(self):
        return self.role == self.IS_TEACHER

    @property
    def is_aims_student(self):
        return self.role == self.IS_STUDENT

    def __str__(self):
        return f"{self.username} ({self.role})"


class Enrollment(models.Model):
    teacher = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="enrolled_students",
        limit_choices_to={"role": User.IS_TEACHER},
    )
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="assigned_teachers",
        limit_choices_to={"role": User.IS_STUDENT},
    )
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("teacher", "student")
        ordering = ["-enrolled_at"]

    def clean(self):
        if self.teacher.role != User.IS_TEACHER:
            raise ValidationError("Only teachers can enroll students.")
        if self.student.role != User.IS_STUDENT:
            raise ValidationError("Only students can be enrolled.")

    def __str__(self):
        return f"{self.teacher.username} -> {self.student.username}"


class Task(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    teacher = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="assigned_tasks",
        limit_choices_to={"role": User.IS_TEACHER},
    )
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="my_tasks",
        limit_choices_to={"role": User.IS_STUDENT},
    )
    due_date = models.DateTimeField()
    deadline = models.DateTimeField()
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["deadline", "due_date"]

    def clean(self):
        if self.teacher.role != User.IS_TEACHER:
            raise ValidationError("Only teachers can assign tasks.")
        if self.student.role != User.IS_STUDENT:
            raise ValidationError("Tasks can only be assigned to students.")
        if not Enrollment.objects.filter(
            teacher=self.teacher,
            student=self.student,
        ).exists():
            raise ValidationError(
                "Teacher can assign tasks only to enrolled students.")

    def save(self, *args, **kwargs):
        if not self.deadline:
            self.deadline = self.due_date
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} - {self.student.username}"
