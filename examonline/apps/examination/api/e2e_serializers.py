"""
E2E 테스트 전용 Serializers.

시간 검증 로직을 제거하여 CI 환경에서의 타이밍 문제를 해결합니다.
이 Serializer는 E2E_TEST_API_ENABLED=true 환경에서만 사용됩니다.
"""

from django.db import transaction
from django.utils import timezone
from examination.models import ExaminationInfo, ExamPaperInfo
from rest_framework import serializers
from testpaper.models import TestPaperInfo
from user.models import SubjectInfo

from core.api.fields import XSSSanitizedCharField


class E2EExamPaperWriteSerializer(serializers.Serializer):
    """시험-시험지 관계 Serializer (쓰기 전용)"""

    paper_id = serializers.PrimaryKeyRelatedField(
        queryset=TestPaperInfo.objects.all(), source="paper", write_only=True
    )


class E2EExaminationCreateSerializer(serializers.ModelSerializer):
    """
    E2E 테스트용 시험 생성 Serializer.

    시간 검증을 제거하여 즉시 시작 가능한 시험을 생성합니다.
    시작 시간을 현재 시간 또는 과거로 설정해도 생성 가능합니다.
    """

    name = XSSSanitizedCharField(max_length=50)
    subject_id = serializers.PrimaryKeyRelatedField(
        queryset=SubjectInfo.objects.all(), source="subject", write_only=True
    )
    papers = E2EExamPaperWriteSerializer(many=True, required=False, write_only=True)
    duration = serializers.IntegerField(write_only=True, help_text="시험 시간 (분 단위)")

    class Meta:
        model = ExaminationInfo
        fields = [
            "id",
            "name",
            "subject_id",
            "start_time",
            "duration",
            "exam_type",
            "papers",
            "student_num",
            "exam_state",
        ]
        read_only_fields = ["id", "student_num", "exam_state"]

    def validate(self, attrs):
        """E2E 테스트용: 시간 검증 제거, 시험 시간 및 시험지 검증만 수행"""
        duration = attrs.get("duration")

        # 시험 시간 검증 (양수 확인만)
        if duration and duration <= 0:
            raise serializers.ValidationError({"duration": "시험 시간은 0보다 커야 합니다."})

        # 시험지 최소 1개 검증
        papers = attrs.get("papers", [])
        if not papers:
            raise serializers.ValidationError({"papers": "최소 1개 이상의 시험지가 필요합니다."})

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        """시험 생성 (시간 검증 없음)"""
        papers_data = validated_data.pop("papers", [])
        duration = validated_data.pop("duration")

        # start_time이 없으면 현재 시간으로 설정
        start_time = validated_data.get("start_time") or timezone.now()
        validated_data["start_time"] = start_time
        validated_data["end_time"] = start_time + timezone.timedelta(minutes=duration)
        validated_data["create_user"] = self.context["request"].user
        validated_data["exam_state"] = "0"
        validated_data["student_num"] = 0
        validated_data["actual_num"] = 0

        exam = ExaminationInfo.objects.create(**validated_data)

        for paper_data in papers_data:
            paper = paper_data["paper"]
            ExamPaperInfo.objects.create(exam=exam, paper=paper)

        return exam
