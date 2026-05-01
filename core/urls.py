from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .viewsets import (
    StudentViewSet,
    EnrollmentViewSet,
    TaskViewSet,
    CustomTokenObtainPairView,
)

router = DefaultRouter(trailing_slash="/?")
router.register(r"students", StudentViewSet, basename="student")
router.register(r"enrollments", EnrollmentViewSet, basename="enrollment")
router.register(r"tasks", TaskViewSet, basename="task")

urlpatterns = [
    # JWT Authentication
    path("auth/login", CustomTokenObtainPairView.as_view(),
         name="token_obtain_pair_no_slash"),
    path("auth/login/", CustomTokenObtainPairView.as_view(),
         name="token_obtain_pair"),
    path("auth/refresh", TokenRefreshView.as_view(),
         name="token_refresh_no_slash"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # Profile endpoint without trailing slash (avoids redirect dropping auth in some clients)
    path(
        "students/me",
        StudentViewSet.as_view({"get": "me"}),
        name="student_me_no_slash",
    ),
    path(
        "students/me/",
        StudentViewSet.as_view({"get": "me"}),
        name="student_me",
    ),
    # Accept detail routes without trailing slash to avoid DELETE redirect/runtime issues.
    path(
        "students/<int:pk>",
        StudentViewSet.as_view(
            {
                "get": "retrieve",
                "patch": "partial_update",
                "put": "update",
                "delete": "destroy",
            }
        ),
        name="student_detail_no_slash",
    ),
    path(
        "students/<int:pk>/",
        StudentViewSet.as_view(
            {
                "get": "retrieve",
                "patch": "partial_update",
                "put": "update",
                "delete": "destroy",
            }
        ),
        name="student_detail",
    ),
    # Accept task list without trailing slash for POST safety with APPEND_SLASH.
    path(
        "tasks",
        TaskViewSet.as_view({"get": "list", "post": "create"}),
        name="task_list_no_slash",
    ),
    # API endpoints
    path("", include(router.urls)),
]
