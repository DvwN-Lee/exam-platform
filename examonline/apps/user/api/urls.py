"""
User API URL configuration.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from user.api.views import (
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    PasswordChangeView,
    StudentDashboardView,
    SubjectViewSet,
    TeacherDashboardView,
    UserProfileView,
    UserRegistrationView,
)

router = DefaultRouter()
router.register(r'subjects', SubjectViewSet, basename='subject')

urlpatterns = [
    # Authentication endpoints
    path('auth/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('auth/register/', UserRegistrationView.as_view(), name='register'),

    # User profile endpoints
    path('users/me/', UserProfileView.as_view(), name='user-profile'),
    path('users/me/change-password/', PasswordChangeView.as_view(), name='change-password'),

    # Dashboard endpoints
    path('dashboard/student/', StudentDashboardView.as_view(), name='student-dashboard'),
    path('dashboard/teacher/', TeacherDashboardView.as_view(), name='teacher-dashboard'),

    # Subject endpoints
    path('', include(router.urls)),
]
