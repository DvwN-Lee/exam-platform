"""
Mock 가능한 시간 유틸리티.

E2E 테스트 환경에서 시간을 제어할 수 있는 기능 제공.
Production 환경에서는 실제 시간만 사용.
"""

from datetime import timedelta

from django.conf import settings
from django.utils import timezone

# Mock 시간 저장소 (Module-level 전역 변수)
_mock_time = None


def get_now():
    """
    현재 시간 반환.

    E2E_MOCK_TIME_ENABLED가 True이고 mock 시간이 설정된 경우 mock 시간 반환,
    그렇지 않으면 실제 시간 반환.
    """
    if getattr(settings, "E2E_MOCK_TIME_ENABLED", False) and _mock_time is not None:
        return _mock_time

    return timezone.now()


def set_mock_time(dt):
    """
    Mock 시간 설정.

    Args:
        dt: timezone-aware datetime 객체

    Raises:
        ValueError: E2E_MOCK_TIME_ENABLED가 False인 경우
    """
    global _mock_time

    if not getattr(settings, "E2E_MOCK_TIME_ENABLED", False):
        raise ValueError("Mock time is only available when E2E_MOCK_TIME_ENABLED=True")

    _mock_time = dt


def clear_mock_time():
    """Mock 시간 초기화 (실제 시간 사용으로 복귀)."""
    global _mock_time
    _mock_time = None


def advance_mock_time(seconds=0, minutes=0, hours=0, days=0):
    """
    Mock 시간 전진.

    현재 mock 시간이 없으면 실제 시간 기준으로 설정 후 전진.

    Args:
        seconds: 초 단위
        minutes: 분 단위
        hours: 시간 단위
        days: 일 단위

    Returns:
        새로운 mock 시간

    Raises:
        ValueError: E2E_MOCK_TIME_ENABLED가 False인 경우
    """
    global _mock_time

    if not getattr(settings, "E2E_MOCK_TIME_ENABLED", False):
        raise ValueError("Mock time is only available when E2E_MOCK_TIME_ENABLED=True")

    base_time = _mock_time if _mock_time is not None else timezone.now()
    _mock_time = base_time + timedelta(seconds=seconds, minutes=minutes, hours=hours, days=days)

    return _mock_time


def is_mock_time_active():
    """Mock 시간이 활성화되어 있는지 확인."""
    return getattr(settings, "E2E_MOCK_TIME_ENABLED", False) and _mock_time is not None


def get_mock_time_status():
    """
    Mock 시간 상태 조회.

    Returns:
        dict: {
            'enabled': E2E_MOCK_TIME_ENABLED 설정 값,
            'is_mocked': mock 시간 사용 중 여부,
            'current_time': 현재 시간 (mock 또는 실제)
        }
    """
    return {
        "enabled": getattr(settings, "E2E_MOCK_TIME_ENABLED", False),
        "is_mocked": is_mock_time_active(),
        "current_time": get_now(),
    }
