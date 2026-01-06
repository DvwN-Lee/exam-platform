"""
E2E 테스트 전용 API Endpoint.

E2E_MOCK_TIME_ENABLED 환경에서만 활성화.
Production 환경에서는 절대 사용되어서는 안 됨.
"""

from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.time import advance_mock_time, clear_mock_time, get_now, set_mock_time


def _check_e2e_enabled():
    """E2E Mock Time 기능 활성화 여부 확인."""
    if not getattr(settings, "E2E_MOCK_TIME_ENABLED", False):
        return Response(
            {"detail": "E2E Mock Time API is not available in this environment"},
            status=status.HTTP_403_FORBIDDEN,
        )
    return None


@api_view(["GET"])
@permission_classes([AllowAny])
def get_current_time(request):
    """
    현재 서버 시간 조회 (Mock 또는 실제).

    GET /api/v1/e2e/time/

    Returns:
        {
            "current_time": "2024-01-01T12:00:00+09:00",
            "is_mocked": false
        }
    """
    error_response = _check_e2e_enabled()
    if error_response:
        return error_response

    from core.time import is_mock_time_active

    return Response(
        {
            "current_time": get_now().isoformat(),
            "is_mocked": is_mock_time_active(),
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def set_time(request):
    """
    Mock 시간 설정.

    POST /api/v1/e2e/time/set/

    Body:
        {
            "datetime": "2024-01-01T12:00:00+09:00"  // ISO 8601 형식
        }

    Returns:
        {
            "detail": "Mock time set successfully",
            "current_time": "2024-01-01T12:00:00+09:00"
        }
    """
    error_response = _check_e2e_enabled()
    if error_response:
        return error_response

    datetime_str = request.data.get("datetime")
    if not datetime_str:
        return Response(
            {"detail": "datetime field is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        # ISO 8601 형식 파싱
        dt = timezone.datetime.fromisoformat(datetime_str.replace("Z", "+00:00"))

        # Naive datetime인 경우 timezone-aware로 변환
        if timezone.is_naive(dt):
            dt = timezone.make_aware(dt)

        set_mock_time(dt)

        return Response(
            {
                "detail": "Mock time set successfully",
                "current_time": get_now().isoformat(),
            }
        )
    except ValueError as e:
        return Response(
            {"detail": f"Invalid datetime format: {e}"},
            status=status.HTTP_400_BAD_REQUEST,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def advance_time(request):
    """
    Mock 시간 전진.

    POST /api/v1/e2e/time/advance/

    Body:
        {
            "seconds": 0,
            "minutes": 0,
            "hours": 0,
            "days": 0
        }

    Returns:
        {
            "detail": "Mock time advanced",
            "current_time": "2024-01-01T12:30:00+09:00"
        }
    """
    error_response = _check_e2e_enabled()
    if error_response:
        return error_response

    seconds = request.data.get("seconds", 0)
    minutes = request.data.get("minutes", 0)
    hours = request.data.get("hours", 0)
    days = request.data.get("days", 0)

    new_time = advance_mock_time(seconds=seconds, minutes=minutes, hours=hours, days=days)

    return Response(
        {
            "detail": "Mock time advanced",
            "current_time": new_time.isoformat(),
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def reset_time(request):
    """
    Mock 시간 초기화 (실제 시간 사용으로 복귀).

    POST /api/v1/e2e/time/reset/

    Returns:
        {
            "detail": "Mock time reset to real time",
            "current_time": "2024-01-01T12:00:00+09:00"
        }
    """
    error_response = _check_e2e_enabled()
    if error_response:
        return error_response

    clear_mock_time()

    return Response(
        {
            "detail": "Mock time reset to real time",
            "current_time": get_now().isoformat(),
        }
    )
