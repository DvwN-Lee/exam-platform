"""
Django REST Framework 및 관련 패키지 설정
"""

from datetime import timedelta

# Django REST Framework 설정
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'core.api.pagination.StandardResultsSetPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'EXCEPTION_HANDLER': 'core.api.exceptions.custom_exception_handler',
    'DEFAULT_VERSIONING_CLASS': 'rest_framework.versioning.URLPathVersioning',
    'DEFAULT_VERSION': 'v1',
    'ALLOWED_VERSIONS': ['v1'],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],
}

# SimpleJWT 설정
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'TOKEN_OBTAIN_SERIALIZER': 'user.api.serializers.CustomTokenObtainPairSerializer',
}

# drf-spectacular 설정 (OpenAPI Schema 생성)
SPECTACULAR_SETTINGS = {
    'TITLE': 'OnlineExam API',
    'DESCRIPTION': '온라인 시험 관리 시스템 REST API',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'SCHEMA_PATH_PREFIX': r'/api/v[0-9]',
    'SERVERS': [
        {'url': 'http://localhost:8000', 'description': 'Local Development Server'},
        {'url': 'https://api.examonline.com', 'description': 'Production Server'},
    ],
    'TAGS': [
        {'name': 'auth', 'description': '인증 관련 API'},
        {'name': 'users', 'description': '사용자 관리 API'},
        {'name': 'subjects', 'description': '과목 관리 API'},
        {'name': 'questions', 'description': '문제 관리 API'},
        {'name': 'papers', 'description': '시험지 관리 API'},
        {'name': 'exams', 'description': '시험 관리 API'},
        {'name': 'scores', 'description': '성적 관리 API'},
        {'name': 'operations', 'description': '운영 기능 API'},
    ],
}

# CORS 설정 (Frontend 개발 환경용)
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:5177",
    "http://localhost:5178",
    "http://localhost:5179",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:5176",
    "http://127.0.0.1:5177",
    "http://127.0.0.1:5178",
    "http://127.0.0.1:5179",
]

CORS_ALLOW_CREDENTIALS = True  # HttpOnly Cookie 사용을 위해 필수

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Session Cookie 설정 (HttpOnly Cookie 보안 강화)
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = False  # Development: False, Production: True
SESSION_COOKIE_SAMESITE = 'Lax'
