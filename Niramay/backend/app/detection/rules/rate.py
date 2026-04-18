import time
from typing import Dict, Any
from collections import defaultdict
from .base import BaseRule, RuleResult
from app.core.config import settings


class RateRule(BaseRule):
    """
    Rate-based anomaly detection rule.

    Tracks the number of requests per endpoint within a sliding time window.
    If the request rate for any endpoint exceeds the configured threshold,
    it triggers an anomaly (indicating potential DDoS, spam, or runaway clients).

    This rule maintains an in-memory sliding window counter. Each call to
    `evaluate()` records the current timestamp and prunes entries older than
    the window. If the count exceeds the threshold, the rule fires.
    """

    def __init__(
        self,
        window_seconds: float = settings.DETECTION_RATE_WINDOW_SECONDS,
        threshold: int = settings.DETECTION_RATE_THRESHOLD,
        weight: int = 2,
    ):
        super().__init__(name="high_request_rate", weight=weight)
        self.window_seconds = window_seconds
        self.threshold = threshold
        # endpoint -> list of timestamps within the window
        self._endpoint_timestamps: Dict[str, list] = defaultdict(list)

    def _prune_window(self, endpoint: str, now: float) -> None:
        """Remove timestamps outside the sliding window."""
        cutoff = now - self.window_seconds
        timestamps = self._endpoint_timestamps[endpoint]
        # Keep only timestamps within the window
        self._endpoint_timestamps[endpoint] = [
            ts for ts in timestamps if ts > cutoff
        ]

    def evaluate(self, log: Dict[str, Any]) -> RuleResult:
        endpoint = log.get("endpoint", "unknown")
        now = time.time()

        # Record this request
        self._endpoint_timestamps[endpoint].append(now)

        # Prune old entries
        self._prune_window(endpoint, now)

        current_count = len(self._endpoint_timestamps[endpoint])

        if current_count > self.threshold:
            return RuleResult(
                triggered=True,
                reason=self.name,
                score=self.weight,
            )

        return RuleResult(triggered=False)
