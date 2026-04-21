"""
Baseline Anomaly Engine — Deviation from Normal Range (Redis-backed)

Maintains rolling baseline statistics per service:endpoint in Redis:
    - Average response time
    - Sample count

Fires when the current log's response time deviates beyond a
configurable factor from the rolling average, indicating
performance degradation or anomalous behavior.

Redis key format:  baseline:{service}:{endpoint}  (hash)
    Fields:  count, sum_rt, avg_rt
"""
import structlog
from typing import Dict, Any, List
from app.detection.engines.base_engine import BaseEngine
from app.detection.rules.base import RuleResult
from app.core.config import settings

logger = structlog.get_logger(__name__)


class BaselineAnomalyEngine(BaseEngine):
    """
    Redis-backed baseline deviation detection engine.

    Tracks a rolling average response time per service:endpoint.
    Fires when the current response time exceeds the rolling average
    by more than the configured deviation factor.

    Only fires after enough samples have been collected (min_samples)
    to avoid false positives during cold start.
    """

    def __init__(
        self,
        deviation_factor: float = settings.BASELINE_DEVIATION_FACTOR,
        min_samples: int = settings.BASELINE_MIN_SAMPLES,
        score: int = 2,
    ):
        super().__init__(name="baseline_anomaly_engine")
        self.deviation_factor = deviation_factor
        self.min_samples = min_samples
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
            logger.warning("BaselineAnomalyEngine: Redis unavailable", error=str(e))
            self._redis = None
            return None

    def evaluate(self, log: Dict[str, Any]) -> List[RuleResult]:
        """
        Compare current response time against the rolling baseline.

        1. Read current baseline (avg_rt, count) from Redis
        2. Check for deviation
        3. Update baseline with current value (rolling average)
        4. Return [RuleResult] if deviation detected, else []
        """
        response_time = log.get("response_time_ms") or log.get("response_time", 0.0)

        # Skip zero/missing response times
        if response_time <= 0:
            return []

        r = self._get_redis()
        if r is None:
            return []

        service = log.get("service", "unknown")
        endpoint = log.get("endpoint", "unknown")
        key = f"baseline:{service}:{endpoint}"

        try:
            # Read current baseline
            baseline_data = r.hgetall(key)

            count = int(baseline_data.get("count", 0))
            sum_rt = float(baseline_data.get("sum_rt", 0.0))

            triggered = False

            if count >= self.min_samples:
                avg_rt = sum_rt / count
                threshold = avg_rt * self.deviation_factor

                if response_time > threshold and avg_rt > 0:
                    logger.info(
                        "Baseline anomaly detected",
                        service=service,
                        endpoint=endpoint,
                        response_time=response_time,
                        baseline_avg=round(avg_rt, 2),
                        deviation_factor=self.deviation_factor,
                        threshold=round(threshold, 2),
                    )
                    triggered = True

            # Update baseline with current value (rolling average)
            pipe = r.pipeline()
            pipe.hincrby(key, "count", 1)
            pipe.hincrbyfloat(key, "sum_rt", response_time)
            # Recompute average
            new_count = count + 1
            new_avg = (sum_rt + response_time) / new_count
            pipe.hset(key, "avg_rt", str(round(new_avg, 4)))
            pipe.execute()

            if triggered:
                return [RuleResult(
                    triggered=True,
                    reason="baseline_deviation",
                    score=self.score,
                )]

        except Exception as e:
            logger.warning("BaselineAnomalyEngine: Redis operation failed", error=str(e))
            self._redis = None

        return []
