"""
URL configuration for aims_college project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path
from django.views.generic.base import RedirectView
from core.views import health

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", RedirectView.as_view(url="http://127.0.0.1:3000/", permanent=False)),
    path(
        "login",
        RedirectView.as_view(
            url="http://127.0.0.1:3000/login", permanent=False),
    ),
    path(
        "student/list",
        RedirectView.as_view(
            url="http://127.0.0.1:3000/student/list", permanent=False),
    ),
    path(
        "teacher/list",
        RedirectView.as_view(
            url="http://127.0.0.1:3000/teacher/list", permanent=False),
    ),
    path(
        "manager/list",
        RedirectView.as_view(
            url="http://127.0.0.1:3000/manager/list", permanent=False),
    ),
    path(
        "profile",
        RedirectView.as_view(
            url="http://127.0.0.1:3000/profile", permanent=False),
    ),
    path("api/health/", health, name="health"),
    path("api/", include("core.urls")),
    path("api-auth/", include("rest_framework.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL,
                          document_root=settings.MEDIA_ROOT)
