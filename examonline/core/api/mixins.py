"""
Serializer Mixin classes for common field patterns.

These mixins eliminate code duplication across serializers by providing
reusable implementations of commonly repeated serializer methods.
"""


class CreatUserSerializerMixin:
    """
    Mixin to serialize create_user field as object with id and nick_name.

    Usage:
        class MySerializer(CreatUserSerializerMixin, serializers.ModelSerializer):
            creat_user = serializers.SerializerMethodField()
            ...

    Requirements:
        - Model must have create_user ForeignKey field
        - create_user must reference UserProfile model with nick_name field
    """

    def get_creat_user(self, obj):
        """Return create_user as object with id and nick_name."""
        if obj.create_user:
            return {
                'id': obj.create_user.id,
                'nick_name': obj.create_user.nick_name,
            }
        return None


class PassedScoreSerializerMixin:
    """
    Mixin to calculate pass/fail status for test scores.

    Usage:
        class MySerializer(PassedScoreSerializerMixin, serializers.ModelSerializer):
            passed = serializers.SerializerMethodField()
            ...

    Requirements:
        - Model must have test_paper and test_score fields
        - test_paper must have passing_score field
    """

    def get_passed(self, obj):
        """Return pass/fail status based on test score vs passing score."""
        if obj.test_paper:
            # Check is_submitted field if exists
            if hasattr(obj, 'is_submitted') and not obj.is_submitted:
                return None
            return obj.test_score >= obj.test_paper.passing_score
        return None
