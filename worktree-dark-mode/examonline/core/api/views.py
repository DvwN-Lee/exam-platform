"""
Core API Views.

Health check endpoint for container orchestration.
Liveness probe: 앱 생존 여부 확인 (단순 응답)
Readiness probe: 트래픽 수신 준비 여부 확인 (DB 연결 검증 포함)

환경 변수를 통해 특정 서비스 체크를 선택적으로 활성화할 수 있다:
- HEALTH_CHECK_MONGODB_REQUIRED: MongoDB 체크 필수 여부 (default: False)
- HEALTH_CHECK_REDIS_REQUIRED: Redis 체크 필수 여부 (default: False)
"""

import logging
import os
import threading

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

# 환경 변수로 Health Check 필수 여부 설정
HEALTH_CHECK_MONGODB_REQUIRED = os.environ.get(
    "HEALTH_CHECK_MONGODB_REQUIRED", "false"
).lower() in ("true", "1", "yes")
HEALTH_CHECK_REDIS_REQUIRED = os.environ.get("HEALTH_CHECK_REDIS_REQUIRED", "false").lower() in (
    "true",
    "1",
    "yes",
)


class MongoDBHealthChecker:
    """
    MongoDB Health Check를 위한 Singleton 클래스.

    Connection pooling을 통해 매 요청마다 새로운 연결을 생성하지 않도록 한다.
    """

    _instance = None
    _lock = threading.Lock()
    _client = None

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def get_client(self) -> MongoClient | None:
        """MongoDB Client를 반환한다. 설정이 없으면 None을 반환한다."""
        mongo_config = getattr(settings, "MONGODB", None)
        if not mongo_config:
            return None

        host = mongo_config.get("host")
        if not host:
            return None

        if self._client is None:
            with self._lock:
                if self._client is None:
                    self._client = MongoClient(
                        host=host,
                        port=mongo_config.get("port"),
                        username=mongo_config.get("username"),
                        password=mongo_config.get("password"),
                        authSource=mongo_config.get("authSource", "admin"),
                        serverSelectionTimeoutMS=3000,
                        maxPoolSize=5,
                    )
        return self._client

    def check(self) -> tuple[bool, str]:
        """MongoDB 연결 상태를 확인한다."""
        try:
            client = self.get_client()
            if client is None:
                return True, "not configured"

            client.admin.command("ping")
            return True, "connected"
        except ConnectionFailure as e:
            logger.warning(f"MongoDB health check failed: {e}")
            return False, _get_error_message(e)
        except Exception as e:
            logger.warning(f"MongoDB health check error: {e}")
            return False, _get_error_message(e)


# Singleton instance
_mongo_checker = MongoDBHealthChecker()


def _get_error_message(exception: Exception) -> str:
    """
    에러 메시지를 반환한다.

    Production 환경에서는 민감 정보 노출 방지를 위해 generic 메시지를 반환한다.
    """
    if getattr(settings, "DEBUG", False):
        return str(exception)
    return "connection failed"


def check_postgresql() -> tuple[bool, str]:
    """PostgreSQL 연결 상태를 확인한다."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return True, "connected"
    except Exception as e:
        logger.warning(f"PostgreSQL health check failed: {e}")
        return False, _get_error_message(e)


def check_mongodb() -> tuple[bool, str]:
    """MongoDB 연결 상태를 확인한다."""
    return _mongo_checker.check()


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
        return False, _get_error_message(e)


@api_view(["GET"])
@permission_classes([AllowAny])
def liveness_check(request):
    """
    Liveness probe endpoint for Kubernetes.

    앱이 살아있는지 확인하는 단순한 endpoint.
    외부 의존성(DB)을 확인하지 않고 앱 자체의 생존 여부만 반환한다.

    Returns:
        200 OK: 앱이 정상 작동 중인 경우
    """
    return Response({"status": "alive"}, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def readiness_check(request):
    """
    Readiness probe endpoint for Kubernetes.

    트래픽을 수신할 준비가 되었는지 확인하는 endpoint.
    모든 Database 연결 상태를 검증하고 결과를 반환한다.
    - PostgreSQL: Django ORM 연결 확인 (필수)
    - MongoDB: pymongo ping 명령 실행 (HEALTH_CHECK_MONGODB_REQUIRED로 제어)
    - Redis: Django cache read/write 테스트 (HEALTH_CHECK_REDIS_REQUIRED로 제어)

    Returns:
        200 OK: 모든 필수 서비스가 정상인 경우
        503 Service Unavailable: 하나 이상의 필수 서비스에 문제가 있는 경우
    """
    checks = {}
    all_healthy = True

    # PostgreSQL 검증 (필수)
    pg_ok, pg_status = check_postgresql()
    checks["postgresql"] = pg_status
    if not pg_ok:
        all_healthy = False

    # MongoDB 검증 (선택적)
    mongo_ok, mongo_status = check_mongodb()
    checks["mongodb"] = mongo_status
    if not mongo_ok and HEALTH_CHECK_MONGODB_REQUIRED:
        all_healthy = False

    # Redis 검증 (선택적)
    redis_ok, redis_status = check_redis()
    checks["redis"] = redis_status
    if not redis_ok and HEALTH_CHECK_REDIS_REQUIRED:
        all_healthy = False

    response_data = {
        "status": "ready" if all_healthy else "not ready",
        "checks": checks,
    }

    if all_healthy:
        return Response(response_data, status=status.HTTP_200_OK)
    return Response(response_data, status=status.HTTP_503_SERVICE_UNAVAILABLE)


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint for Docker/Kubernetes probes.

    하위 호환성을 위해 유지. readiness_check와 동일한 동작을 수행한다.
    MongoDB와 Redis 체크는 환경 변수로 필수 여부를 제어할 수 있다.

    Returns:
        200 OK: 모든 필수 서비스가 정상인 경우
        503 Service Unavailable: 하나 이상의 필수 서비스에 문제가 있는 경우
    """
    checks = {}
    all_healthy = True

    # PostgreSQL 검증 (필수)
    pg_ok, pg_status = check_postgresql()
    checks["postgresql"] = pg_status
    if not pg_ok:
        all_healthy = False

    # MongoDB 검증 (선택적)
    mongo_ok, mongo_status = check_mongodb()
    checks["mongodb"] = mongo_status
    if not mongo_ok and HEALTH_CHECK_MONGODB_REQUIRED:
        all_healthy = False

    # Redis 검증 (선택적)
    redis_ok, redis_status = check_redis()
    checks["redis"] = redis_status
    if not redis_ok and HEALTH_CHECK_REDIS_REQUIRED:
        all_healthy = False

    response_data = {
        "status": "healthy" if all_healthy else "unhealthy",
        "checks": checks,
    }

    if all_healthy:
        return Response(response_data, status=status.HTTP_200_OK)
    return Response(response_data, status=status.HTTP_503_SERVICE_UNAVAILABLE)
