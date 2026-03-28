"""
Django local development settings.
"""

import os
import warnings

from django.core.management.utils import get_random_secret_key
from dotenv import load_dotenv

from .base import *

# E2E Mock Time 활성화 (환경 변수로 제어)
# E2E 테스트에서 시간 동기화 문제 해결을 위해 사용
E2E_MOCK_TIME_ENABLED = os.getenv("E2E_MOCK_TIME_ENABLED", "false").lower() == "true"

# Load environment variables from .env file
load_dotenv(BASE_DIR / ".env")

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv("SECRET_KEY")

# .env에 SECRET_KEY가 없으면 랜덤 키 생성 및 경고
if not SECRET_KEY:
    SECRET_KEY = get_random_secret_key()
    warnings.warn(
        "SECRET_KEY not found in .env file. Using randomly generated key for this session. "
        "For consistent behavior, add SECRET_KEY to your .env file.",
        RuntimeWarning,
        stacklevel=2,
    )

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "[::1]"]

# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", "examonline"),
        "USER": os.getenv("POSTGRES_USER", "examuser"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", "exampass"),
        "HOST": os.getenv("POSTGRES_HOST", "localhost"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
        "OPTIONS": {
            "connect_timeout": 10,
        },
    }
}

# Cache (Redis)
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    }
}

# Development-only apps
INSTALLED_APPS += [
    "django.contrib.admindocs",
]

# Development logging
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}
