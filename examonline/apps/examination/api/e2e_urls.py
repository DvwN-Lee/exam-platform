"""
E2E 테스트 전용 URL Configuration.

이 URL들은 E2E_TEST_API_ENABLED=true 환경에서만 활성화됩니다.
"""

from django.urls import path

from .e2e_views import E2EExaminationViewSet

# ViewSet을 명시적으로 URL에 매핑
e2e_examination_list = E2EExaminationViewSet.as_view(
    {
        "post": "create",
    }
)
e2e_examination_enroll = E2EExaminationViewSet.as_view(
    {
        "post": "enroll_students",
    }
)
e2e_examination_force_start = E2EExaminationViewSet.as_view(
    {
        "post": "force_start",
    }
)

urlpatterns = [
    path("examinations/", e2e_examination_list, name="e2e-examination-create"),
    path(
        "examinations/<int:pk>/enroll-students/",
        e2e_examination_enroll,
        name="e2e-examination-enroll",
    ),
    path(
        "examinations/<int:pk>/force-start/",
        e2e_examination_force_start,
        name="e2e-examination-force-start",
    ),
]
