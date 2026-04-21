"""
Shared Redis Client

Provides a single sync Redis client and an async factory,
eliminating duplicated connection logic across 5+ files.
All other modules must import from here instead of creating
their own Redis connections.
"""
import redis
import redis.asyncio as aioredis
import structlog
from app.core.config import settings

logger = structlog.get_logger(__name__)


def get_sync_redis() -> redis.Redis:
    """Create a synchronous Redis client."""
    return redis.Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        decode_responses=True,
        socket_connect_timeout=3,
    )


async def get_async_redis() -> aioredis.Redis:
    """Create an async Redis client."""
    return aioredis.Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        decode_responses=True,
    )


# Singleton sync client for modules that need immediate access
try:
    redis_client = get_sync_redis()
    redis_client.ping()
    logger.info("Redis client connected", host=settings.REDIS_HOST, port=settings.REDIS_PORT)
except Exception as e:
    logger.warning("Redis client connection failed on init (will retry later)", error=str(e))
    redis_client = get_sync_redis()  # Create anyway, will fail on first use
