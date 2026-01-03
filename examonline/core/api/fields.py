"""
Custom DRF fields with XSS sanitization.
"""

import bleach
from rest_framework import serializers


class XSSSanitizedCharField(serializers.CharField):
    """
    CharField that sanitizes HTML/JavaScript to prevent XSS attacks.

    모든 HTML 태그를 제거하고 순수 텍스트만 허용합니다.
    Stored XSS 공격을 방지하기 위해 사용자 입력 필드에 적용합니다.
    """

    def to_internal_value(self, data):
        """입력값에서 HTML 태그 제거"""
        data = super().to_internal_value(data)
        if data:
            # 모든 HTML 태그 제거, HTML entity는 텍스트로 변환
            return bleach.clean(data, tags=[], strip=True)
        return data
