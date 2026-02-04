"""
examonline URL Configuration
"""

import os

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

# Admin URL 환경 변수화 (기본값: admin/, 운영환경에서는 비밀 경로 사용 권장)
ADMIN_URL = os.getenv("DJANGO_ADMIN_URL", "admin/")
if not ADMIN_URL.endswith("/"):
    ADMIN_URL += "/"

# E2E 테스트 API 활성화 여부 (Production에서는 반드시 false)
E2E_TEST_API_ENABLED = os.getenv("E2E_TEST_API_ENABLED", "false").lower() == "true"

urlpatterns = [
    # Django Admin (경로 환경 변수화)
    path(ADMIN_URL, admin.site.urls),
    # Auth endpoints (legacy support for frontend calling /auth/ directly)
    path("auth/", include("user.api.urls")),
    # API v1 endpoints
    path("api/v1/", include("user.api.urls")),
    path("api/v1/", include("testquestion.api.urls")),
    path("api/v1/", include("testpaper.api.urls")),
    path("api/v1/", include("examination.api.urls")),
    path("api/v1/", include("core.api.urls")),
    # path('api/v1/', include('operation.api.urls')),
]

# E2E 테스트 전용 API (E2E_TEST_API_ENABLED=true일 때만 활성화)
if E2E_TEST_API_ENABLED:
    urlpatterns += [
        path("api/v1/e2e/", include("examination.api.e2e_urls")),
    ]

# API 문서 및 정적 파일은 DEBUG 모드에서만 활성화
if settings.DEBUG:
    from drf_spectacular.views import (
        SpectacularAPIView,
        SpectacularRedocView,
        SpectacularSwaggerView,
    )

    urlpatterns += [
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
        path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    ]
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
