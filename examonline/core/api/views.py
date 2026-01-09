"""
Core API Views.

Health check endpoint for container orchestration.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint for Docker/Kubernetes probes.

    Returns 200 OK with status information.
    """
    return Response({"status": "healthy"})
