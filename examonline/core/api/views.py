"""
Core API Views.

Health check endpoint for container orchestration.
"""

import logging

from django.conf import settings
from django.core.cache import cache
from django.db import connection
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

logger = logging.getLogger(__name__)


def check_postgresql() -> tuple[bool, str]:
    """PostgreSQL 연결 상태를 확인한다."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return True, "connected"
    except Exception as e:
        logger.warning(f"PostgreSQL health check failed: {e}")
        return False, str(e)


def check_mongodb() -> tuple[bool, str]:
    """MongoDB 연결 상태를 확인한다."""
    try:
        mongo_config = getattr(settings, "MONGODB", None)
        if not mongo_config:
            return True, "not configured"

        client = MongoClient(
            host=mongo_config.get("host"),
            port=mongo_config.get("port"),
            username=mongo_config.get("username"),
            password=mongo_config.get("password"),
            authSource=mongo_config.get("authSource", "admin"),
            serverSelectionTimeoutMS=3000,
        )
        client.admin.command("ping")
        client.close()
        return True, "connected"
    except ConnectionFailure as e:
        logger.warning(f"MongoDB health check failed: {e}")
        return False, str(e)
    except Exception as e:
        logger.warning(f"MongoDB health check error: {e}")
        return False, str(e)


def check_redis() -> tuple[bool, str]:
    """Redis 연결 상태를 확인한다."""
    try:
        cache.set("health_check", "ok", timeout=10)
        result = cache.get("health_check")
        if result == "ok":
            return True, "connected"
        return False, "cache read/write failed"
    except Exception as e:
        logger.warning(f"Redis health check failed: {e}")
        return False, str(e)


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint for Docker/Kubernetes probes.

    모든 Database 연결 상태를 검증하고 결과를 반환한다.
    - PostgreSQL: Django ORM 연결 확인
    - MongoDB: pymongo ping 명령 실행
    - Redis: Django cache read/write 테스트

    Returns:
        200 OK: 모든 서비스가 정상인 경우
        503 Service Unavailable: 하나 이상의 서비스에 문제가 있는 경우
    """
    checks = {}
    all_healthy = True

    # PostgreSQL 검증
    pg_ok, pg_status = check_postgresql()
    checks["postgresql"] = pg_status
    if not pg_ok:
        all_healthy = False

    # MongoDB 검증
    mongo_ok, mongo_status = check_mongodb()
    checks["mongodb"] = mongo_status
    if not mongo_ok:
        all_healthy = False

    # Redis 검증
    redis_ok, redis_status = check_redis()
    checks["redis"] = redis_status
    if not redis_ok:
        all_healthy = False

    response_data = {
        "status": "healthy" if all_healthy else "unhealthy",
        "checks": checks,
    }

    if all_healthy:
        return Response(response_data, status=status.HTTP_200_OK)
    return Response(response_data, status=status.HTTP_503_SERVICE_UNAVAILABLE)
