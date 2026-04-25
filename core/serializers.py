from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Enrollment, Task

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "date_of_birth",
            "gender",
            "current_academic",
            "enrolled_status",
            "profile_photo",
        )
        read_only_fields = ("id",)


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = (
            "username",
            "email",
            "password",
            "first_name",
            "last_name",
            "role",
            "date_of_birth",
            "gender",
            "current_academic",
            "enrolled_status",
            "profile_photo",
        )

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user


class EnrollmentSerializer(serializers.ModelSerializer):
    teacher_username = serializers.CharField(
        source="teacher.username", read_only=True
    )
    student_username = serializers.CharField(
        source="student.username", read_only=True
    )
    teacher = UserSerializer(read_only=True)
    student = UserSerializer(read_only=True)

    class Meta:
        model = Enrollment
        fields = (
            "id",
            "teacher",
            "teacher_username",
            "student",
            "student_username",
            "enrolled_at",
        )
        read_only_fields = ("id", "enrolled_at")


class TaskSerializer(serializers.ModelSerializer):
    teacher_username = serializers.CharField(
        source="teacher.username", read_only=True
    )
    student_username = serializers.CharField(
        source="student.username", read_only=True
    )
    teacher = UserSerializer(read_only=True)
    student = UserSerializer(read_only=True)

    class Meta:
        model = Task
        fields = (
            "id",
            "title",
            "description",
            "teacher",
            "teacher_username",
            "student",
            "student_username",
            "due_date",
            "is_completed",
            "created_at",
        )
        read_only_fields = ("id", "created_at", "teacher", "student")


class TaskCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ("title", "description", "due_date", "is_completed")


class StudentTaskSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ("is_completed",)
