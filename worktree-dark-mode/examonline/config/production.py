"""
Django production settings.
"""

import os

from dotenv import load_dotenv

from .base import *

# Load environment variables
load_dotenv()

# SECURITY
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable must be set in production")

DEBUG = False

ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "").split(",")
if not ALLOWED_HOSTS or ALLOWED_HOSTS == [""]:
    raise ValueError("ALLOWED_HOSTS environment variable must be set in production")

# Security settings (환경 변수로 제어 가능)
SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "True").lower() == "true"
SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "True").lower() == "true"
CSRF_COOKIE_SECURE = os.getenv("CSRF_COOKIE_SECURE", "True").lower() == "true"
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Database
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB"),
        "USER": os.getenv("POSTGRES_USER"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD"),
        "HOST": os.getenv("POSTGRES_HOST"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
        "CONN_MAX_AGE": 600,
        "OPTIONS": {
            "connect_timeout": 10,
        },
    }
}

# PostgreSQL SSL 설정 (Docker 환경에서는 disable, Cloud 환경에서는 require)
POSTGRES_SSLMODE = os.getenv("POSTGRES_SSLMODE")
if POSTGRES_SSLMODE:
    DATABASES["default"]["OPTIONS"]["sslmode"] = POSTGRES_SSLMODE

# MongoDB configuration
MONGODB_SSL_ENABLED = os.getenv("MONGODB_SSL", "False").lower() == "true"
MONGODB = {
    "host": os.getenv("MONGODB_HOST"),
    "port": int(os.getenv("MONGODB_PORT", 27017)),
    "database": os.getenv("MONGODB_DATABASE"),
    "username": os.getenv("MONGODB_USER"),
    "password": os.getenv("MONGODB_PASSWORD"),
    "authSource": os.getenv("MONGODB_AUTH_SOURCE", "admin"),
}

# MongoDB SSL 설정 (Docker 환경에서는 False, Cloud 환경에서는 True)
if MONGODB_SSL_ENABLED:
    MONGODB["ssl"] = True
    MONGODB["ssl_cert_reqs"] = os.getenv("MONGODB_SSL_CERT_REQS", "CERT_REQUIRED")

# Cache (Redis)
REDIS_SSL_ENABLED = os.getenv("REDIS_SSL", "False").lower() == "true"
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": os.getenv("REDIS_URL"),
        "OPTIONS": {},
    }
}

# Redis SSL 설정 (Docker 환경에서는 False, Cloud 환경에서는 True)
if REDIS_SSL_ENABLED:
    CACHES["default"]["OPTIONS"]["ssl_cert_reqs"] = os.getenv(
        "REDIS_SSL_CERT_REQS", "CERT_REQUIRED"
    )

# Logging
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "format": "{levelname} {asctime} {module} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
        },
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": BASE_DIR / "logs" / "django.log",
            "maxBytes": 10485760,  # 10MB
            "backupCount": 10,
            "formatter": "json",
        },
    },
    "root": {
        "handlers": ["console", "file"],
        "level": "WARNING",
    },
    "loggers": {
        "django": {
            "handlers": ["console", "file"],
            "level": "WARNING",
            "propagate": False,
        },
        "django.security": {
            "handlers": ["console", "file"],
            "level": "ERROR",
            "propagate": False,
        },
    },
}

# Static and Media files
# S3 Storage 설정 (환경 변수로 활성화)
USE_S3_STORAGE = os.getenv("USE_S3_STORAGE", "False").lower() == "true"

if USE_S3_STORAGE:
    # AWS S3 필수 환경 변수 검증
    AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
    AWS_STORAGE_BUCKET_NAME = os.getenv("AWS_STORAGE_BUCKET_NAME")

    _missing_vars = []
    if not AWS_ACCESS_KEY_ID:
        _missing_vars.append("AWS_ACCESS_KEY_ID")
    if not AWS_SECRET_ACCESS_KEY:
        _missing_vars.append("AWS_SECRET_ACCESS_KEY")
    if not AWS_STORAGE_BUCKET_NAME:
        _missing_vars.append("AWS_STORAGE_BUCKET_NAME")

    if _missing_vars:
        raise ValueError(
            f"USE_S3_STORAGE=True requires the following environment variables: "
            f"{', '.join(_missing_vars)}"
        )

    # AWS S3 설정
    AWS_S3_REGION_NAME = os.getenv("AWS_S3_REGION_NAME", "ap-northeast-2")
    AWS_S3_CUSTOM_DOMAIN = os.getenv("AWS_S3_CUSTOM_DOMAIN")
    AWS_DEFAULT_ACL = None
    AWS_S3_OBJECT_PARAMETERS = {
        "CacheControl": "max-age=86400",
    }
    AWS_QUERYSTRING_AUTH = False

    # Storages 설정
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
            "OPTIONS": {
                "location": "media",
            },
        },
        "staticfiles": {
            "BACKEND": "storages.backends.s3boto3.S3StaticStorage",
            "OPTIONS": {
                "location": "static",
            },
        },
    }

    # S3 URL 설정
    if AWS_S3_CUSTOM_DOMAIN:
        STATIC_URL = f"https://{AWS_S3_CUSTOM_DOMAIN}/static/"
        MEDIA_URL = f"https://{AWS_S3_CUSTOM_DOMAIN}/media/"
    else:
        STATIC_URL = (
            f"https://{AWS_STORAGE_BUCKET_NAME}.s3.{AWS_S3_REGION_NAME}.amazonaws.com/static/"
        )
        MEDIA_URL = (
            f"https://{AWS_STORAGE_BUCKET_NAME}.s3.{AWS_S3_REGION_NAME}.amazonaws.com/media/"
        )
else:
    # Local filesystem 기반 static files 서빙 (Nginx volume 공유)
    STATIC_URL = "/static/"
    STATIC_ROOT = BASE_DIR / "staticfiles"
    MEDIA_URL = "/media/"
    MEDIA_ROOT = BASE_DIR / "media"
