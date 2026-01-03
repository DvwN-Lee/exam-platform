"""
XSS Sanitization Field Tests.
"""

import pytest
from rest_framework import serializers

from core.api.fields import XSSSanitizedCharField


class TestXSSSanitizedCharField:
    """XSSSanitizedCharField 테스트"""

    def test_script_tag_removed(self):
        """<script> 태그가 제거되는지 확인"""
        field = XSSSanitizedCharField()
        result = field.to_internal_value('<script>alert("XSS")</script>Test')
        assert result == 'Test'
        assert '<script>' not in result
        assert 'alert' not in result

    def test_img_onerror_removed(self):
        """<img onerror> 공격이 제거되는지 확인"""
        field = XSSSanitizedCharField()
        result = field.to_internal_value('<img src=x onerror="alert(1)">Test')
        assert result == 'Test'
        assert '<img' not in result
        assert 'onerror' not in result

    def test_plain_text_preserved(self):
        """일반 텍스트는 그대로 유지되는지 확인"""
        field = XSSSanitizedCharField()
        text = "시험 문제입니다. This is a test."
        result = field.to_internal_value(text)
        assert result == text

    def test_html_entities_handled(self):
        """HTML entity가 적절히 처리되는지 확인"""
        field = XSSSanitizedCharField()
        result = field.to_internal_value('&lt;script&gt;')
        # bleach.clean with strip=True converts entities to text
        assert 'script' in result or '<' in result

    def test_nested_script_tags(self):
        """중첩된 script 태그도 제거되는지 확인"""
        field = XSSSanitizedCharField()
        result = field.to_internal_value('<<script>script>alert(1)<</script>/script>')
        assert 'script' not in result.lower()
        assert 'alert' not in result

    def test_event_handlers_removed(self):
        """이벤트 핸들러가 제거되는지 확인"""
        field = XSSSanitizedCharField()
        result = field.to_internal_value('<div onclick="alert(1)">Click me</div>')
        assert result == 'Click me'
        assert 'onclick' not in result

    def test_empty_string(self):
        """빈 문자열 처리"""
        field = XSSSanitizedCharField(allow_blank=True)
        result = field.to_internal_value('')
        assert result == ''

    def test_none_value(self):
        """None 값 처리"""
        field = XSSSanitizedCharField(allow_null=True)
        result = field.to_internal_value(None)
        assert result is None or result == ''

    def test_special_characters_preserved(self):
        """특수문자는 유지되는지 확인"""
        field = XSSSanitizedCharField()
        text = "2 + 2 = 4, 5 > 3, A < B"
        result = field.to_internal_value(text)
        # + = > < 문자가 유지되어야 함 (HTML이 아닌 경우)
        assert '=' in result
        assert '+' in result

    def test_korean_text_preserved(self):
        """한국어 텍스트가 유지되는지 확인"""
        field = XSSSanitizedCharField()
        text = "다음 중 올바른 답을 고르시오."
        result = field.to_internal_value(text)
        assert result == text

    def test_max_length_validation(self):
        """max_length 검증이 동작하는지 확인"""
        field = XSSSanitizedCharField(max_length=10)
        with pytest.raises(serializers.ValidationError):
            field.to_internal_value('a' * 20)


class TestSerializerIntegration:
    """Serializer 통합 테스트"""

    def test_xss_in_serializer(self):
        """Serializer에서 XSS 필터링이 동작하는지 확인"""

        class TestSerializer(serializers.Serializer):
            name = XSSSanitizedCharField(max_length=100)

        serializer = TestSerializer(data={'name': '<script>alert(1)</script>Test Name'})
        assert serializer.is_valid()
        assert serializer.validated_data['name'] == 'Test Name'
        assert '<script>' not in serializer.validated_data['name']
