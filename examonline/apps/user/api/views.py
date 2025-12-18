"""
User API views.
"""

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
    SubjectSerializer,
    UserProfileSerializer,
    UserProfileUpdateSerializer,
    UserRegistrationSerializer,
)
from user.models import SubjectInfo, UserProfile


@extend_schema(tags=['auth'])
class CustomTokenObtainPairView(TokenObtainPairView):
    """
    JWT Token 발급 endpoint.

    username과 password로 access token과 refresh token을 발급받습니다.
    """
    serializer_class = CustomTokenObtainPairSerializer


@extend_schema(tags=['auth'])
class CustomTokenRefreshView(TokenRefreshView):
    """
    JWT Token 갱신 endpoint.

    refresh token으로 새로운 access token을 발급받습니다.
    """
    pass


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
        조회는 모두 가능, 생성/수정/삭제는 교사만 가능
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsTeacher()]
        return [IsAuthenticated()]
