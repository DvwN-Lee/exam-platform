"""
Health Check Endpoint 테스트.

DB 연결 검증 기능을 포함한 health check endpoint 테스트.
"""

from unittest.mock import MagicMock, patch

import pytest
from django.test import RequestFactory
from rest_framework import status

from core.api.views import check_mongodb, check_postgresql, check_redis, health_check


@pytest.fixture
def request_factory():
    """Request factory fixture."""
    return RequestFactory()


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

    def test_postgresql_connection_failed(self):
        """PostgreSQL 연결 실패 시 False와 error message를 반환한다."""
        with patch("core.api.views.connection") as mock_conn:
            mock_conn.cursor.side_effect = Exception("Connection refused")

            result, message = check_postgresql()

            assert result is False
            assert "Connection refused" in message


class TestCheckMongoDB:
    """MongoDB 연결 검증 테스트."""

    def test_mongodb_connected(self):
        """MongoDB 연결 성공 시 True와 'connected'를 반환한다."""
        mock_settings = MagicMock()
        mock_settings.MONGODB = {
            "host": "localhost",
            "port": 27017,
            "username": "user",
            "password": "pass",
            "authSource": "admin",
        }

        with (
            patch("core.api.views.settings", mock_settings),
            patch("core.api.views.MongoClient") as mock_client,
        ):
            mock_instance = MagicMock()
            mock_client.return_value = mock_instance

            result, message = check_mongodb()

            assert result is True
            assert message == "connected"
            mock_instance.admin.command.assert_called_once_with("ping")
            mock_instance.close.assert_called_once()

    def test_mongodb_not_configured(self):
        """MongoDB가 설정되지 않은 경우 True와 'not configured'를 반환한다."""
        mock_settings = MagicMock()
        mock_settings.MONGODB = None

        with patch("core.api.views.settings", mock_settings):
            result, message = check_mongodb()

            assert result is True
            assert message == "not configured"

    def test_mongodb_connection_failed(self):
        """MongoDB 연결 실패 시 False와 error message를 반환한다."""
        from pymongo.errors import ConnectionFailure

        mock_settings = MagicMock()
        mock_settings.MONGODB = {
            "host": "localhost",
            "port": 27017,
            "username": "user",
            "password": "pass",
            "authSource": "admin",
        }

        with (
            patch("core.api.views.settings", mock_settings),
            patch("core.api.views.MongoClient") as mock_client,
        ):
            mock_client.side_effect = ConnectionFailure("Connection failed")

            result, message = check_mongodb()

            assert result is False
            assert "Connection failed" in message


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

    def test_redis_connection_failed(self):
        """Redis 연결 실패 시 False와 error message를 반환한다."""
        with patch("core.api.views.cache") as mock_cache:
            mock_cache.set.side_effect = Exception("Connection refused")

            result, message = check_redis()

            assert result is False
            assert "Connection refused" in message


class TestHealthCheckEndpoint:
    """Health check endpoint 통합 테스트."""

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
            patch("core.api.views.check_postgresql", return_value=(False, "connection refused")),
            patch("core.api.views.check_mongodb", return_value=(True, "connected")),
            patch("core.api.views.check_redis", return_value=(True, "connected")),
        ):
            request = request_factory.get("/api/v1/health/")
            response = health_check(request)

            assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
            assert response.data["status"] == "unhealthy"
            assert response.data["checks"]["postgresql"] == "connection refused"

    def test_multiple_services_unhealthy(self, request_factory):
        """여러 서비스가 비정상일 때 503을 반환한다."""
        with (
            patch("core.api.views.check_postgresql", return_value=(False, "pg error")),
            patch("core.api.views.check_mongodb", return_value=(False, "mongo error")),
            patch("core.api.views.check_redis", return_value=(True, "connected")),
        ):
            request = request_factory.get("/api/v1/health/")
            response = health_check(request)

            assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
            assert response.data["status"] == "unhealthy"
            assert response.data["checks"]["postgresql"] == "pg error"
            assert response.data["checks"]["mongodb"] == "mongo error"
            assert response.data["checks"]["redis"] == "connected"
