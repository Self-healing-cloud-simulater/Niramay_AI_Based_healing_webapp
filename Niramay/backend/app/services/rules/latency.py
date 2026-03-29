from typing import Dict, Any
from .base import BaseRule, RuleResult
from app.core.config import settings

class LatencyRule(BaseRule):
    """Rule to detect high latency anomalies"""

    def __init__(self, threshold_ms: float = settings.DETECTION_LATENCY_THRESHOLD_MS, weight: int = 2):
        super().__init__(name="high_latency", weight=weight)
        self.threshold_ms = threshold_ms

    def evaluate(self, log: Dict[str, Any]) -> RuleResult:
        latency = log.get("response_time_ms", 0)
        if latency > self.threshold_ms:
            return RuleResult(
                triggered=True,
                reason=self.name,
                score=self.weight
            )
        return RuleResult(triggered=False)
