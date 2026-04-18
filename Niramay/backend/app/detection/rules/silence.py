import time
from typing import Dict, Any
from .base import BaseRule, RuleResult
from app.core.config import settings


class SilenceRule(BaseRule):
    """
    Silence detection rule.

    Tracks the "last seen" timestamp for each critical endpoint. If a
    monitored endpoint has not produced any traffic for longer than the
    configured silence threshold, this rule fires — indicating a potential
    silent crash, hung process, or network partition.

    The rule only fires for endpoints that have been seen at least once
    (to avoid false positives on cold start).
    """

    def __init__(
        self,
        silence_threshold_seconds: float = settings.DETECTION_SILENCE_THRESHOLD_SECONDS,
        weight: int = 2,
    ):
        super().__init__(name="endpoint_silence", weight=weight)
        self.silence_threshold = silence_threshold_seconds
        # endpoint -> last seen timestamp (epoch seconds)
        self._last_seen: Dict[str, float] = {}

    def evaluate(self, log: Dict[str, Any]) -> RuleResult:
        endpoint = log.get("endpoint", "unknown")
        now = time.time()

        # Check if we've seen this endpoint before
        if endpoint in self._last_seen:
            gap = now - self._last_seen[endpoint]

            # Update last seen BEFORE returning so the next check starts fresh
            self._last_seen[endpoint] = now

            if gap > self.silence_threshold:
                return RuleResult(
                    triggered=True,
                    reason=self.name,
                    score=self.weight,
                )
        else:
            # First time seeing this endpoint — just record it, don't trigger
            self._last_seen[endpoint] = now

        return RuleResult(triggered=False)
