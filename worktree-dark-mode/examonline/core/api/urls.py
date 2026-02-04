"""
Core API URL Configuration.

Health check 및 E2E 테스트 전용 API Endpoint 포함.
"""

from django.conf import settings
from django.urls import path

from core.api.views import health_check, liveness_check, readiness_check

urlpatterns = [
    path("health/", health_check, name="health-check"),
    path("health/live/", liveness_check, name="liveness-check"),
    path("health/ready/", readiness_check, name="readiness-check"),
]

# E2E Mock Time API는 E2E_MOCK_TIME_ENABLED가 True일 때만 등록
if getattr(settings, "E2E_MOCK_TIME_ENABLED", False):
    from core.api.e2e_views import advance_time, get_current_time, reset_time, set_time

    urlpatterns += [
        path("e2e/time/", get_current_time, name="e2e-time-get"),
        path("e2e/time/set/", set_time, name="e2e-time-set"),
        path("e2e/time/advance/", advance_time, name="e2e-time-advance"),
        path("e2e/time/reset/", reset_time, name="e2e-time-reset"),
    ]
