"""
Custom exception handler for consistent error responses.
"""

from django.conf import settings
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    """
    Custom exception handler.

    - 4xx 에러: 기존 DRF 응답 구조 유지 (Frontend 호환성)
    - 5xx 에러: Production에서 민감 정보 은닉
    """
    response = exception_handler(exc, context)

    if response is not None:
        # 500번대 서버 에러인 경우에만 메시지 은닉
        if not settings.DEBUG and response.status_code >= 500:
            response.data = {'detail': '서버 내부 오류가 발생했습니다.'}
        # 4xx 에러는 기존 구조 유지 (유효성 검사 에러 등)

    return response
