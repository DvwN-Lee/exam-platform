"""
Custom exception handler for consistent error responses.
"""

from django.conf import settings
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    """
    Custom exception handler that returns consistent error format.

    Production 환경에서는 민감한 정보 노출을 방지하기 위해
    일반적인 에러 메시지만 반환합니다.
    """
    response = exception_handler(exc, context)

    if response is not None:
        # Production에서는 일반적인 메시지만 반환
        if settings.DEBUG:
            message = str(exc)
        else:
            message = '요청을 처리할 수 없습니다.'

        custom_response_data = {
            'error': {
                'code': exc.__class__.__name__.upper(),
                'message': message,
                'details': response.data if isinstance(response.data, dict) else {'detail': response.data}
            }
        }
        response.data = custom_response_data

    return response
