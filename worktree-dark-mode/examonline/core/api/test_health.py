"""
Health Check Endpoint 테스트.

DB 연결 검증 기능을 포함한 health check endpoint 테스트.
Liveness/Readiness probe 분리 테스트 포함.
"""

from unittest.mock import MagicMock, patch

import pytest
from django.test import RequestFactory
from rest_framework import status

from core.api.views import (
    MongoDBHealthChecker,
    _get_error_message,
    check_mongodb,
    check_postgresql,
    check_redis,
    health_check,
    liveness_check,
    readiness_check,
)


@pytest.fixture
def request_factory():
    """Request factory fixture."""
    return RequestFactory()


class TestGetErrorMessage:
    """에러 메시지 반환 함수 테스트."""

    def test_debug_mode_returns_full_message(self):
        """DEBUG=True일 때 전체 에러 메시지를 반환한다."""
        with patch("core.api.views.settings") as mock_settings:
            mock_settings.DEBUG = True
            exception = Exception("Connection refused to host 192.168.1.1")

            result = _get_error_message(exception)

            assert result == "Connection refused to host 192.168.1.1"

    def test_production_mode_returns_generic_message(self):
        """DEBUG=False일 때 generic 메시지를 반환한다."""
        with patch("core.api.views.settings") as mock_settings:
            mock_settings.DEBUG = False
            exception = Exception("Connection refused to host 192.168.1.1")

            result = _get_error_message(exception)

            assert result == "connection failed"


class TestMongoDBHealthChecker:
    """MongoDB Health Checker Singleton 테스트."""

    def test_singleton_pattern(self):
        """동일한 인스턴스를 반환한다."""
        checker1 = MongoDBHealthChecker()
        checker2 = MongoDBHealthChecker()

        assert checker1 is checker2

    def test_get_client_returns_none_when_not_configured(self):
        """MongoDB가 설정되지 않은 경우 None을 반환한다."""
        checker = MongoDBHealthChecker()
        checker._client = None  # Reset for test

        with patch("core.api.views.settings") as mock_settings:
            mock_settings.MONGODB = None

            client = checker.get_client()

            assert client is None


class TestCheckPostgreSQL:
    """PostgreSQL 연결 검증 테스트."""

    def test_postgresql_connected(self):
        """PostgreSQL 연결 성공 시 True와 'connected'를 반환한다."""
        with patch("core.api.views.connection") as mock_conn:
            mock_cursor = MagicMock()
            mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

            result, message = check_postgresql()

            assert result is True
            assert message == "connected"
            mock_cursor.execute.assert_called_once_with("SELECT 1")

    def test_postgresql_connection_failed_debug_mode(self):
        """PostgreSQL 연결 실패 시 (DEBUG=True) 상세 에러를 반환한다."""
        with (
            patch("core.api.views.connection") as mock_conn,
            patch("core.api.views.settings") as mock_settings,
        ):
            mock_settings.DEBUG = True
            mock_conn.cursor.side_effect = Exception("Connection refused")

            result, message = check_postgresql()

            assert result is False
            assert "Connection refused" in message

    def test_postgresql_connection_failed_production_mode(self):
        """PostgreSQL 연결 실패 시 (DEBUG=False) generic 에러를 반환한다."""
        with (
            patch("core.api.views.connection") as mock_conn,
            patch("core.api.views.settings") as mock_settings,
        ):
            mock_settings.DEBUG = False
            mock_conn.cursor.side_effect = Exception("Connection refused")

            result, message = check_postgresql()

            assert result is False
            assert message == "connection failed"


class TestCheckMongoDB:
    """MongoDB 연결 검증 테스트."""

    def test_mongodb_not_configured(self):
        """MongoDB가 설정되지 않은 경우 True와 'not configured'를 반환한다."""
        with patch.object(MongoDBHealthChecker, "get_client", return_value=None):
            result, message = check_mongodb()

            assert result is True
            assert message == "not configured"

    def test_mongodb_connected(self):
        """MongoDB 연결 성공 시 True와 'connected'를 반환한다."""
        mock_client = MagicMock()

        with patch.object(MongoDBHealthChecker, "get_client", return_value=mock_client):
            result, message = check_mongodb()

            assert result is True
            assert message == "connected"
            mock_client.admin.command.assert_called_once_with("ping")

    def test_mongodb_connection_failed(self):
        """MongoDB 연결 실패 시 False와 error message를 반환한다."""
        from pymongo.errors import ConnectionFailure

        mock_client = MagicMock()
        mock_client.admin.command.side_effect = ConnectionFailure("Connection failed")

        with (
            patch.object(MongoDBHealthChecker, "get_client", return_value=mock_client),
            patch("core.api.views.settings") as mock_settings,
        ):
            mock_settings.DEBUG = False

            result, message = check_mongodb()

            assert result is False
            assert message == "connection failed"


class TestCheckRedis:
    """Redis 연결 검증 테스트."""

    def test_redis_connected(self):
        """Redis 연결 성공 시 True와 'connected'를 반환한다."""
        with patch("core.api.views.cache") as mock_cache:
            mock_cache.get.return_value = "ok"

            result, message = check_redis()

            assert result is True
            assert message == "connected"
            mock_cache.set.assert_called_once_with("health_check", "ok", timeout=10)
            mock_cache.get.assert_called_once_with("health_check")

    def test_redis_read_write_failed(self):
        """Redis read/write 실패 시 False와 error message를 반환한다."""
        with patch("core.api.views.cache") as mock_cache:
            mock_cache.get.return_value = None

            result, message = check_redis()

            assert result is False
            assert "cache read/write failed" in message

    def test_redis_connection_failed_production_mode(self):
        """Redis 연결 실패 시 (DEBUG=False) generic 에러를 반환한다."""
        with (
            patch("core.api.views.cache") as mock_cache,
            patch("core.api.views.settings") as mock_settings,
        ):
            mock_settings.DEBUG = False
            mock_cache.set.side_effect = Exception("Connection refused")

            result, message = check_redis()

            assert result is False
            assert message == "connection failed"


class TestLivenessCheckEndpoint:
    """Liveness check endpoint 테스트."""

    def test_liveness_always_returns_alive(self, request_factory):
        """Liveness check는 항상 200 OK와 'alive'를 반환한다."""
        request = request_factory.get("/api/v1/health/live/")
        response = liveness_check(request)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "alive"

    def test_liveness_does_not_check_db(self, request_factory):
        """Liveness check는 DB 연결을 확인하지 않는다."""
        with (
            patch("core.api.views.check_postgresql") as mock_pg,
            patch("core.api.views.check_mongodb") as mock_mongo,
            patch("core.api.views.check_redis") as mock_redis,
        ):
            request = request_factory.get("/api/v1/health/live/")
            liveness_check(request)

            mock_pg.assert_not_called()
            mock_mongo.assert_not_called()
            mock_redis.assert_not_called()


class TestReadinessCheckEndpoint:
    """Readiness check endpoint 테스트."""

    def test_all_services_ready(self, request_factory):
        """모든 서비스가 정상일 때 200 OK와 'ready'를 반환한다."""
        with (
            patch("core.api.views.check_postgresql", return_value=(True, "connected")),
            patch("core.api.views.check_mongodb", return_value=(True, "connected")),
            patch("core.api.views.check_redis", return_value=(True, "connected")),
        ):
            request = request_factory.get("/api/v1/health/ready/")
            response = readiness_check(request)

            assert response.status_code == status.HTTP_200_OK
            assert response.data["status"] == "ready"
            assert response.data["checks"]["postgresql"] == "connected"
            assert response.data["checks"]["mongodb"] == "connected"
            assert response.data["checks"]["redis"] == "connected"

    def test_postgresql_not_ready(self, request_factory):
        """PostgreSQL이 비정상일 때 503과 'not ready'를 반환한다."""
        with (
            patch("core.api.views.check_postgresql", return_value=(False, "connection failed")),
            patch("core.api.views.check_mongodb", return_value=(True, "connected")),
            patch("core.api.views.check_redis", return_value=(True, "connected")),
        ):
            request = request_factory.get("/api/v1/health/ready/")
            response = readiness_check(request)

            assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
            assert response.data["status"] == "not ready"


class TestHealthCheckEndpoint:
    """Health check endpoint 통합 테스트 (하위 호환성)."""

    def test_all_services_healthy(self, request_factory):
        """모든 서비스가 정상일 때 200 OK를 반환한다."""
        with (
            patch("core.api.views.check_postgresql", return_value=(True, "connected")),
            patch("core.api.views.check_mongodb", return_value=(True, "connected")),
            patch("core.api.views.check_redis", return_value=(True, "connected")),
        ):
            request = request_factory.get("/api/v1/health/")
            response = health_check(request)

            assert response.status_code == status.HTTP_200_OK
            assert response.data["status"] == "healthy"
            assert response.data["checks"]["postgresql"] == "connected"
            assert response.data["checks"]["mongodb"] == "connected"
            assert response.data["checks"]["redis"] == "connected"

    def test_postgresql_unhealthy(self, request_factory):
        """PostgreSQL이 비정상일 때 503을 반환한다."""
        with (
            patch("core.api.views.check_postgresql", return_value=(False, "connection failed")),
            patch("core.api.views.check_mongodb", return_value=(True, "connected")),
            patch("core.api.views.check_redis", return_value=(True, "connected")),
        ):
            request = request_factory.get("/api/v1/health/")
            response = health_check(request)

            assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
            assert response.data["status"] == "unhealthy"
            assert response.data["checks"]["postgresql"] == "connection failed"

    def test_multiple_services_unhealthy(self, request_factory):
        """여러 서비스가 비정상일 때 503을 반환한다."""
        with (
            patch("core.api.views.check_postgresql", return_value=(False, "connection failed")),
            patch("core.api.views.check_mongodb", return_value=(False, "connection failed")),
            patch("core.api.views.check_redis", return_value=(True, "connected")),
        ):
            request = request_factory.get("/api/v1/health/")
            response = health_check(request)

            assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
            assert response.data["status"] == "unhealthy"
            assert response.data["checks"]["postgresql"] == "connection failed"
            assert response.data["checks"]["mongodb"] == "connection failed"
            assert response.data["checks"]["redis"] == "connected"
