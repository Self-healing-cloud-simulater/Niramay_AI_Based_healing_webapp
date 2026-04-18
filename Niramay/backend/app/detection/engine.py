from typing import Dict, Any, List
from .rules.latency import LatencyRule
from .rules.status import StatusCodeRule
from .rules.failure import FailureTagRule
from .rules.rate import RateRule
from .rules.silence import SilenceRule
from app.core.config import settings
import structlog

logger = structlog.get_logger(__name__)


# ── Severity Classification ──
def _classify_severity(score: float) -> str:
    """
    Maps a continuous anomaly score (0.0–1.0) to a discrete severity level.

    Thresholds:
        0.0  – 0.39  →  low
        0.40 – 0.59  →  medium
        0.60 – 0.79  →  high
        0.80 – 1.0   →  critical
    """
    if score >= 0.80:
        return "critical"
    elif score >= 0.60:
        return "high"
    elif score >= 0.40:
        return "medium"
    return "low"


def _should_escalate_to_llm(severity: str, reasons: List[str]) -> bool:
    """
    Determines whether the anomaly warrants LLM-based causal analysis (Stage 3).

    Current policy:
        - Always escalate 'critical' and 'high' severity anomalies.
        - Escalate 'medium' only if multiple detection engines fired simultaneously,
          suggesting a complex, multi-signal anomaly that benefits from AI reasoning.
        - Never escalate 'low'.
    """
    if severity in ("critical", "high"):
        return True
    if severity == "medium" and len(reasons) >= 2:
        return True
    return False


class DetectionEngine:
    """
    Modular Detection Engine that calculates normalized anomaly scores
    based on weighted rules.

    Rules:
        - LatencyRule      — High response time
        - StatusCodeRule   — 5xx server errors / 429 rate limits
        - FailureTagRule   — Injected failure simulator tags
        - RateRule         — Abnormal request rate spikes
        - SilenceRule      — Endpoint going silent (potential crash)
    """
    def __init__(self):
        self.rules = {
            "latency": LatencyRule(),
            "status": StatusCodeRule(),
            "failure": FailureTagRule(),
            "rate": RateRule(),
            "silence": SilenceRule(),
        }
        # Weights normalized in config (must sum to 1.0)
        self.weights = {
            "latency": settings.DETECTION_WEIGHT_LATENCY,
            "status": settings.DETECTION_WEIGHT_STATUS,
            "failure": settings.DETECTION_WEIGHT_FAILURE,
            "rate": settings.DETECTION_WEIGHT_RATE,
            "silence": settings.DETECTION_WEIGHT_SILENCE,
        }
        self.threshold = settings.DETECTION_ANOMALY_THRESHOLD

    def analyze_log(self, log: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculates a normalized anomaly score (0-1), identifies reasons,
        assigns a severity level, and determines LLM escalation.
        """
        reasons = []
        raw_scores = {}
        
        # 1. Evaluate individual rules
        for key, rule in self.rules.items():
            result = rule.evaluate(log)
            if result.triggered:
                reasons.append(result.reason)
                # Map raw rule triggers to a binary 1.0 for the weighted calc
                raw_scores[key] = 1.0
            else:
                raw_scores[key] = 0.0

        # 2. Calculate weighted score
        # Formula: Sum(Weight_i * Trigger_i)
        # Since weights sum to 1.0, the total score is naturally in [0, 1]
        anomaly_score = sum(
            self.weights.get(key, 0) * raw_scores.get(key, 0)
            for key in self.rules.keys()
        )

        # DEBUG: Log every analysis attempt
        logger.info(
            "Detection analysis complete",
            request_id=log.get("request_id"),
            endpoint=log.get("endpoint"),
            score=round(anomaly_score, 2),
            triggers=[k for k, v in raw_scores.items() if v > 0],
            threshold=self.threshold
        )

        is_anomaly = anomaly_score >= self.threshold

        # 3. Classify severity
        severity = _classify_severity(anomaly_score) if is_anomaly else "low"

        # 4. Determine LLM escalation
        requires_llm_analysis = _should_escalate_to_llm(severity, reasons) if is_anomaly else False

        if is_anomaly:
            logger.info(
                "Anomaly detected",
                request_id=log.get("request_id"),
                score=round(anomaly_score, 2),
                severity=severity,
                requires_llm=requires_llm_analysis,
                reasons=reasons,
            )

        return {
            "is_anomaly": is_anomaly,
            "anomaly_score": round(anomaly_score, 2),
            "anomaly_reasons": reasons,
            "severity": severity,
            "requires_llm_analysis": requires_llm_analysis,
        }

# Singleton instance
detection_engine = DetectionEngine()
