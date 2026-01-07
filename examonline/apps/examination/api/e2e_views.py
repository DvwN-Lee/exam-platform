"""
E2E 테스트 전용 API Views.

CI 환경에서의 타이밍 문제를 해결하기 위한 테스트 전용 Endpoint입니다.
이 API는 E2E_TEST_API_ENABLED=true 환경에서만 활성화됩니다.
"""

from django.db import transaction
from django.utils import timezone
from examination.models import ExaminationInfo, ExamPaperInfo, ExamStudentsInfo
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from testpaper.models import TestScores
from user.models import StudentsInfo

from core.api.permissions import IsTeacher

from .e2e_serializers import E2EExaminationCreateSerializer
from .serializers import (
    EnrollStudentsSerializer,
    ExaminationDetailSerializer,
    StartExamResponseSerializer,
)


class E2EExaminationViewSet(viewsets.ViewSet):
    """
    E2E 테스트용 시험 관리 ViewSet.

    시간 검증 없이 시험 생성 및 시작이 가능합니다.
    Production 환경에서는 E2E_TEST_API_ENABLED=false로 설정하여 비활성화해야 합니다.
    """

    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        """Action별 권한 설정"""
        if self.action == "create":
            return [IsAuthenticated(), IsTeacher()]
        return [IsAuthenticated()]

    def create(self, request):
        """
        E2E 테스트용 시험 생성 (시간 검증 없음).

        POST /api/v1/e2e/examinations/

        시작 시간을 현재 시간 또는 과거로 설정해도 생성 가능합니다.
        """
        serializer = E2EExaminationCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        exam = serializer.save()

        # Response는 기존 DetailSerializer 재사용
        response_serializer = ExaminationDetailSerializer(exam)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="enroll-students")
    def enroll_students(self, request, pk=None):
        """
        학생 일괄 등록.

        POST /api/v1/e2e/examinations/{id}/enroll-students/
        """
        try:
            exam = ExaminationInfo.objects.get(id=pk)
        except ExaminationInfo.DoesNotExist:
            return Response(
                {"detail": "시험을 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND
            )

        # 권한 확인: 시험 작성자만 가능
        if exam.create_user != request.user:
            return Response(
                {"detail": "시험 작성자만 학생을 등록할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = EnrollStudentsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        student_ids = serializer.validated_data["student_ids"]

        # 이미 등록된 학생 확인
        existing = ExamStudentsInfo.objects.filter(
            exam=exam, student_id__in=student_ids
        ).values_list("student_id", flat=True)

        if existing:
            return Response(
                {"student_ids": f"이미 등록된 학생이 있습니다: {list(existing)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 학생 등록
        with transaction.atomic():
            students = StudentsInfo.objects.filter(id__in=student_ids)
            enrollments = [
                ExamStudentsInfo(exam=exam, student=student) for student in students
            ]
            ExamStudentsInfo.objects.bulk_create(enrollments)
            exam.student_num = ExamStudentsInfo.objects.filter(exam=exam).count()
            exam.save()

        return Response(
            {"detail": f"{len(student_ids)}명의 학생이 등록되었습니다."},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="force-start")
    def force_start(self, request, pk=None):
        """
        E2E 테스트용 시험 강제 시작 (시간 검증 없음).

        POST /api/v1/e2e/examinations/{id}/force-start/

        시험 시작 시간과 관계없이 즉시 시험을 시작합니다.
        """
        # 학생 정보 확인
        try:
            student_info = request.user.studentsinfo
        except StudentsInfo.DoesNotExist:
            return Response(
                {"detail": "학생 정보를 찾을 수 없습니다."}, status=status.HTTP_403_FORBIDDEN
            )

        try:
            exam = ExaminationInfo.objects.get(id=pk)
        except ExaminationInfo.DoesNotExist:
            return Response(
                {"detail": "시험을 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND
            )

        # 응시 자격 확인
        if not ExamStudentsInfo.objects.filter(exam=exam, student=student_info).exists():
            return Response(
                {"detail": "이 시험에 등록되지 않았습니다."}, status=status.HTTP_403_FORBIDDEN
            )

        # 이미 시작한 경우 확인
        existing_score = TestScores.objects.filter(exam=exam, user=student_info).first()
        if existing_score and existing_score.start_time:
            if existing_score.is_submitted:
                return Response(
                    {"detail": "이미 제출한 시험입니다."}, status=status.HTTP_400_BAD_REQUEST
                )
            return Response(
                {
                    "submission_id": existing_score.id,
                    "detail": "이미 시작한 시험입니다.",
                    "started_at": existing_score.start_time,
                },
                status=status.HTTP_200_OK,
            )

        # 시험지 조회
        exam_paper = ExamPaperInfo.objects.filter(exam=exam).first()
        if not exam_paper:
            return Response(
                {"detail": "시험지가 없습니다."}, status=status.HTTP_400_BAD_REQUEST
            )

        # 시험 시작 기록 (시간 검증 없음)
        now = timezone.now()
        with transaction.atomic():
            if existing_score:
                existing_score.start_time = now
                existing_score.save()
                test_score = existing_score
            else:
                test_score = TestScores.objects.create(
                    exam=exam,
                    user=student_info,
                    test_paper=exam_paper.paper,
                    start_time=now,
                    test_score=0,
                    detail_records={},
                )

        response_data = {
            "submission_id": test_score.id,
            "exam": exam,
            "started_at": test_score.start_time,
        }
        serializer = StartExamResponseSerializer(response_data)
        return Response(serializer.data, status=status.HTTP_200_OK)
