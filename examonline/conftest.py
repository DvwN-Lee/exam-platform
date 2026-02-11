"""
Global test configuration.

테스트 환경에서 Redis 의존성을 제거하고, 테스트 간 Rate Limiting Cache를 격리.
- LocMemCache: Redis 없이도 Cache 동작 보장 (CI 환경 호환)
- cache.clear(): 테스트 간 DRF SimpleRateThrottle Counter 격리
"""

import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def _test_cache(settings):
    """테스트 환경: In-Memory Cache 사용 + Throttle Counter 격리"""
    settings.CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        }
    }
    cache.clear()
    yield
    cache.clear()
