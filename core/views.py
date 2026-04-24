from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    """Health check endpoint - no authentication required."""
    return Response({
        "success": True,
        "message": "AIMS LMS backend is running.",
        "api_version": "2.0"
    })
