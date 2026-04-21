"""
Rate-Based Rule Engine — Frequency & Spike Detection (Redis-backed)

Maintains a rolling error counter per endpoint in Redis.
Fires when the number of error status codes within a configurable
time window exceeds the threshold.

Redis key format:  rate:{service}:{endpoint}:errors
Key expiry:        RATE_BASED_WINDOW_SECONDS (default 60s)

Uses Redis INCR + EXPIRE as a natural sliding window — each
increment refreshes the TTL so the counter auto-expires after
the window elapses with no new errors.
"""
import structlog
from typing import Dict, Any, List
from app.detection.engines.base_engine import BaseEngine
from app.detection.rules.base import RuleResult
from app.core.config import settings

logger = structlog.get_logger(__name__)


class RateBasedEngine(BaseEngine):
    """
    Redis-backed rate-based error detection engine.

    Increments a per-endpoint error counter on every error status code
    (>= 400). Fires when the count within the rolling window exceeds
    the configured threshold.
    """

    def __init__(
        self,
        error_threshold: int = settings.RATE_BASED_ERROR_THRESHOLD,
        window_seconds: int = settings.RATE_BASED_WINDOW_SECONDS,
        score: int = 2,
    ):
        super().__init__(name="rate_based_engine")
        self.error_threshold = error_threshold
        self.window_seconds = window_seconds
        self.score = score
        self._redis = None

    def _get_redis(self):
        """Lazy-load synchronous Redis client. Returns None if unavailable."""
        if self._redis is not None:
            return self._redis
        try:
            import redis
            self._redis = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
                password=settings.REDIS_PASSWORD,
                decode_responses=True,
                socket_connect_timeout=2,
            )
            self._redis.ping()
            return self._redis
        except Exception as e:
            logger.warning("RateBasedEngine: Redis unavailable", error=str(e))
            self._redis = None
            return None

    def evaluate(self, log: Dict[str, Any]) -> List[RuleResult]:
        """
        Evaluate rate-based detection.

        Only increments counter for error status codes (>= 400).
        Returns [RuleResult] if threshold exceeded, else [].
        """
        status_code = log.get("status_code", 0)

        # Only track error status codes
        if status_code < 400:
            return []

        r = self._get_redis()
        if r is None:
            # Fail gracefully
            return []

        service = log.get("service", "unknown")
        endpoint = log.get("endpoint", "unknown")
        key = f"rate:{service}:{endpoint}:errors"

        try:
            pipe = r.pipeline()
            pipe.incr(key)
            pipe.expire(key, self.window_seconds)
            results = pipe.execute()

            current_count = results[0]

            if current_count > self.error_threshold:
                logger.info(
                    "Rate-based engine triggered",
                    service=service,
                    endpoint=endpoint,
                    error_count=current_count,
                    threshold=self.error_threshold,
                    window=self.window_seconds,
                )
                return [RuleResult(
                    triggered=True,
                    reason="rate_based_error_spike",
                    score=self.score,
                )]

        except Exception as e:
            logger.warning("RateBasedEngine: Redis operation failed", error=str(e))
            self._redis = None  # Force reconnect on next call

        return []
