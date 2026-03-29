from typing import Dict, Any
from .rules.latency import LatencyRule
from .rules.status import StatusCodeRule
from .rules.failure import FailureTagRule
from app.core.config import settings
import structlog

logger = structlog.get_logger(__name__)

class DetectionService:
    """
    Orchestrates anomaly detection rules and scoring
    """

    def __init__(self):
        self.rules = [
            LatencyRule(),
            StatusCodeRule(),
            FailureTagRule()
        ]
        self.score_threshold = settings.DETECTION_ANOMALY_SCORE_THRESHOLD

    def detect_anomaly(self, log: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluate a log against all rules and calculate total score
        """
        anomaly_reasons = []
        total_score = 0

        for rule in self.rules:
            result = rule.evaluate(log)
            if result.triggered:
                anomaly_reasons.append(result.reason)
                total_score += result.score

        is_anomaly = total_score >= self.score_threshold

        if is_anomaly:
            logger.info(
                "Anomaly detected",
                request_id=log.get("request_id"),
                score=total_score,
                reasons=anomaly_reasons
            )

        return {
            "is_anomaly": is_anomaly,
            "anomaly_score": total_score,
            "anomaly_reasons": anomaly_reasons
        }

# Global singleton
detection_service = DetectionService()
