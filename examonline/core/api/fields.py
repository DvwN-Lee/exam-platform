"""
Custom DRF fields with XSS sanitization.
"""

import re

import bleach
from rest_framework import serializers


# script, style 태그와 내용을 완전히 제거하는 패턴
SCRIPT_STYLE_PATTERN = re.compile(
    r'<(script|style)[^>]*>.*?</\1>',
    re.IGNORECASE | re.DOTALL
)


class XSSSanitizedCharField(serializers.CharField):
    """
    CharField that sanitizes HTML/JavaScript to prevent XSS attacks.

    모든 HTML 태그를 제거하고 순수 텍스트만 허용합니다.
    Stored XSS 공격을 방지하기 위해 사용자 입력 필드에 적용합니다.
    """

    def to_internal_value(self, data):
        """입력값에서 HTML 태그 제거"""
        # None 값 처리 (allow_null=True인 경우)
        if data is None:
            if self.allow_null:
                return None
            # allow_null=False면 super()에서 ValidationError 발생

        data = super().to_internal_value(data)
        if data:
            # 1. script, style 태그와 내용을 완전히 제거
            data = SCRIPT_STYLE_PATTERN.sub('', data)
            # 2. 나머지 HTML 태그 제거 (내용은 유지)
            return bleach.clean(data, tags=[], strip=True)
        return data
