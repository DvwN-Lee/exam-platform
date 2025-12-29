"""
User API views.
"""

from django.conf import settings
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from core.api.permissions import IsTeacher
from user.api.serializers import (
    CustomTokenObtainPairSerializer,
    PasswordChangeSerializer,
    StudentDashboardSerializer,
    StudentListSerializer,
    SubjectSerializer,
    TeacherDashboardSerializer,
    UserProfileSerializer,
    UserProfileUpdateSerializer,
    UserRegistrationSerializer,
)
from user.models import SubjectInfo, UserProfile, StudentsInfo
from user.services import StudentDashboardService, TeacherDashboardService
from examination.models import ExaminationInfo, ExamPaperInfo, ExamStudentsInfo
from testpaper.models import TestPaperInfo, TestScores
from testquestion.models import TestQuestionInfo, OptionInfo
from django.utils import timezone
from django.db.models import Count, Q, Avg, Prefetch


@extend_schema(tags=['auth'])
class CustomTokenObtainPairView(TokenObtainPairView):
    """
    JWT Token 발급 endpoint.

    username과 password로 access token과 refresh token을 발급받습니다.

    보안 강화:
    - Refresh token은 HttpOnly Cookie로 전송 (XSS 방지)
    - Access token은 응답 body에 포함 (기존 방식 유지)
    """
    serializer_class = CustomTokenObtainPairSerializer

    def finalize_response(self, request, response, *args, **kwargs):
        """
        Refresh token을 HttpOnly Cookie로 설정
        """
        if response.status_code == 200 and 'refresh' in response.data:
            # Refresh token을 HttpOnly Cookie로 설정
            refresh_token = response.data.pop('refresh')
            response.set_cookie(
                key='refresh_token',
                value=refresh_token,
                httponly=True,  # JavaScript 접근 차단 (XSS 방지)
                secure=not settings.DEBUG,  # Production: True, Development: False
                samesite='Lax', # CSRF 방어
                max_age=60 * 60 * 24 * 7,  # 7일
            )
        return super().finalize_response(request, response, *args, **kwargs)


@extend_schema(tags=['auth'])
class CustomTokenRefreshView(TokenRefreshView):
    """
    JWT Token 갱신 endpoint.

    HttpOnly Cookie에서 refresh token을 읽어 새로운 access token을 발급합니다.
    하위 호환성: request body에 refresh token이 있으면 우선 사용
    """

    def post(self, request, *args, **kwargs):
        """
        Cookie 또는 request body에서 refresh token 읽기
        """
        # Cookie에서 refresh token 읽기 (우선순위: body > cookie)
        if 'refresh' not in request.data and 'refresh_token' in request.COOKIES:
            # MutableQueryDict 생성하여 Cookie의 refresh token 추가
            data = request.data.copy()
            data['refresh'] = request.COOKIES['refresh_token']
            request._full_data = data

        response = super().post(request, *args, **kwargs)

        # 새로운 refresh token이 있으면 Cookie 업데이트
        if response.status_code == 200 and 'refresh' in response.data:
            refresh_token = response.data.pop('refresh')
            response.set_cookie(
                key='refresh_token',
                value=refresh_token,
                httponly=True,
                secure=not settings.DEBUG,
                samesite='Lax',
                max_age=60 * 60 * 24 * 7,
            )

        return response


@extend_schema(tags=['auth'])
class UserRegistrationView(generics.CreateAPIView):
    """
    회원가입 endpoint.

    user_type에 따라 학생 또는 교사로 회원가입합니다.
    """
    queryset = UserProfile.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]

    @extend_schema(
        summary='회원가입',
        description='학생 또는 교사로 회원가입합니다. user_type에 따라 추가 정보를 입력해야 합니다.',
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


@extend_schema_view(
    retrieve=extend_schema(tags=['users'], summary='내 정보 조회'),
    update=extend_schema(tags=['users'], summary='내 정보 수정'),
    partial_update=extend_schema(tags=['users'], summary='내 정보 부분 수정'),
)
class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    사용자 프로필 조회/수정 endpoint.

    현재 로그인한 사용자의 정보를 조회하거나 수정합니다.
    """
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserProfileUpdateSerializer
        return UserProfileSerializer

    def get_object(self):
        return self.request.user


@extend_schema(tags=['users'])
class PasswordChangeView(generics.UpdateAPIView):
    """
    비밀번호 변경 endpoint.
    """
    serializer_class = PasswordChangeSerializer
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='비밀번호 변경',
        description='현재 비밀번호를 확인하고 새 비밀번호로 변경합니다.',
    )
    def put(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            'detail': '비밀번호가 성공적으로 변경되었습니다.'
        }, status=status.HTTP_200_OK)


@extend_schema_view(
    list=extend_schema(tags=['subjects'], summary='과목 목록 조회'),
    create=extend_schema(tags=['subjects'], summary='과목 생성'),
    retrieve=extend_schema(tags=['subjects'], summary='과목 상세 조회'),
    update=extend_schema(tags=['subjects'], summary='과목 수정'),
    partial_update=extend_schema(tags=['subjects'], summary='과목 부분 수정'),
    destroy=extend_schema(tags=['subjects'], summary='과목 삭제'),
)
class SubjectViewSet(viewsets.ModelViewSet):
    """
    과목 관리 API.

    교사만 과목을 생성/수정/삭제할 수 있습니다.
    """
    queryset = SubjectInfo.objects.all().order_by('-create_time')
    serializer_class = SubjectSerializer

    def get_permissions(self):
        """
        목록 조회는 누구나 가능(회원가입 시 필요), 상세 조회는 인증 필요, 생성/수정/삭제는 교사만 가능
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsTeacher()]
        elif self.action == 'list':
            return [AllowAny()]
        return [IsAuthenticated()]


@extend_schema(tags=['dashboard'])
class StudentDashboardView(generics.RetrieveAPIView):
    """
    학생 대시보드 데이터 조회 endpoint.

    학생의 통계, 성적 추이, 예정된 시험, 학습 진행률을 조회합니다.
    """
    serializer_class = StudentDashboardSerializer
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='학생 대시보드 조회',
        description='현재 로그인한 학생의 대시보드 데이터를 조회합니다.',
    )
    def get(self, request, *args, **kwargs):
        # 학생 프로필 조회
        try:
            student_info = StudentsInfo.objects.get(user=request.user)
        except StudentsInfo.DoesNotExist:
            return Response(
                {'error': 'Student profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Service를 통해 대시보드 데이터 조회
        service = StudentDashboardService(student_info)
        data = service.get_dashboard_data()

        # Serializer로 검증 후 응답
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)


@extend_schema(tags=['dashboard'])
class TeacherDashboardView(generics.RetrieveAPIView):
    """
    교사 대시보드 데이터 조회 endpoint.

    교사의 통계, 최근 시험, 문제 분포, 점수 분포를 조회합니다.
    """
    serializer_class = TeacherDashboardSerializer
    permission_classes = [IsAuthenticated, IsTeacher]

    @extend_schema(
        summary='교사 대시보드 조회',
        description='현재 로그인한 교사의 대시보드 데이터를 조회합니다.',
    )
    def get(self, request, *args, **kwargs):
        # Service를 통해 대시보드 데이터 조회
        service = TeacherDashboardService(request.user)
        data = service.get_dashboard_data()

        # Serializer로 검증 후 응답
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)


@extend_schema_view(
    list=extend_schema(tags=['students'], summary='학생 목록 조회'),
    retrieve=extend_schema(tags=['students'], summary='학생 상세 조회'),
)
class StudentListViewSet(viewsets.ReadOnlyModelViewSet):
    """
    학생 목록 조회 API (교사 전용).

    교사가 학생 목록을 조회하고 검색/필터링할 수 있습니다.
    """
    serializer_class = StudentListSerializer
    permission_classes = [IsAuthenticated, IsTeacher]

    def get_queryset(self):
        """
        학생 목록 조회 (검색/필터 지원).
        """
        queryset = UserProfile.objects.filter(
            user_type='student'
        ).select_related('studentsinfo').order_by('-date_joined')

        # 검색 (이름, 학번, 이메일)
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(studentsinfo__student_name__icontains=search) |
                Q(studentsinfo__student_id__icontains=search) |
                Q(email__icontains=search) |
                Q(username__icontains=search)
            )

        # 학교 필터
        school = self.request.query_params.get('school', None)
        if school:
            queryset = queryset.filter(studentsinfo__student_school__icontains=school)

        # 반 필터
        class_name = self.request.query_params.get('class', None)
        if class_name:
            queryset = queryset.filter(studentsinfo__student_class__icontains=class_name)

        return queryset
