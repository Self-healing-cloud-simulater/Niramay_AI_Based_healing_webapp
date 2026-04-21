"""
Detection Service — Pure Anomaly Scoring

Runs all four detection engines in parallel against a normalized
log entry and returns a fully enriched detection result dict.

This is a PURE function — no side effects, no storage writes,
no queue pushes. The Detection Worker (worker.py) handles all
storage and dispatch after calling detect_anomaly().

Engines:
    1. FeatureRuleEngine  — status code, latency, failure tag checks
    2. RateBasedEngine     — Redis-backed error spike detection
    3. SilenceDetectionEngine — Redis-backed last-seen tracking
    4. BaselineAnomalyEngine  — Redis-backed rolling average deviation
"""
import structlog
from uuid import uuid4
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Any, List
from app.core.config import settings

# Import engines
from app.detection.engines.feature_rule_engine import FeatureRuleEngine
from app.detection.engines.rate_based_engine import RateBasedEngine
from app.detection.engines.silence_detection_engine import silence_engine
from app.detection.engines.baseline_anomaly_engine import BaselineAnomalyEngine

logger = structlog.get_logger(__name__)


class DetectionService:
    """
    Orchestrates all four detection engines and produces an
    enriched detection result. No side effects.
    """

    def __init__(self):
        self.engines = [
            FeatureRuleEngine(),
            RateBasedEngine(),
            silence_engine,  # singleton — also used by background checker
            BaselineAnomalyEngine(),
        ]
        self._executor = ThreadPoolExecutor(
            max_workers=4, thread_name_prefix="detection"
        )

    def _run_engine(self, engine, log: Dict[str, Any]):
        """Run a single engine. Returns (engine_name, results)."""
        try:
            results = engine.evaluate(log)
            return engine.name, results
        except Exception as e:
            logger.warning(
                "Engine evaluation failed",
                engine=engine.name,
                error=str(e),
            )
            return engine.name, []

    def detect_anomaly(self, log: Dict[str, Any]) -> Dict[str, Any]:
        """
        Pure function: evaluate a normalized log against all engines.

        Returns a fully enriched detection result dict.
        Does NOT write to any storage or push to any queue.
        """
        # Run all engines in parallel
        futures = {
            self._executor.submit(self._run_engine, engine, log): engine
            for engine in self.engines
        }

        all_reasons: List[str] = []
        engines_triggered: List[str] = []
        total_score = 0

        for future in as_completed(futures, timeout=5):
            try:
                engine_name, results = future.result()
                for result in results:
                    if result.triggered:
                        all_reasons.append(result.reason)
                        engines_triggered.append(engine_name)
                        total_score += result.score
            except Exception as e:
                logger.warning("Engine future failed", error=str(e))

        # Determine severity
        if total_score >= 6:
            severity = "high"
        elif total_score >= 3:
            severity = "medium"
        else:
            severity = "low"

        # Determine if anomaly
        is_anomaly = total_score >= settings.DETECTION_ANOMALY_SCORE_THRESHOLD

        # Determine if LLM analysis is needed
        requires_llm = self._should_require_llm(
            all_reasons, engines_triggered, log
        )

        # Build enriched result — carry forward ALL original log fields
        detection_result = {
            "detection_id": str(uuid4()),
            "timestamp": log.get("timestamp", ""),
            "service": log.get("service", "unknown"),
            "endpoint": log.get("endpoint", "unknown"),
            "method": log.get("method", "UNKNOWN"),
            "status_code": log.get("status_code", 0),
            "response_time_ms": log.get("response_time_ms", 0.0),
            "failure_tag": log.get("failure_tag", "none"),
            "request_id": log.get("request_id"),
            "engines_triggered": list(set(engines_triggered)),
            "anomaly_reasons": list(set(all_reasons)),
            "anomaly_score": total_score,
            "severity": severity,
            "is_anomaly": is_anomaly,
            "requires_llm": requires_llm,
        }

        if is_anomaly:
            logger.info(
                "Anomaly detected",
                score=total_score,
                severity=severity,
                reasons=all_reasons,
                endpoint=log.get("endpoint"),
                requires_llm=requires_llm,
            )

        return detection_result

    def _should_require_llm(
        self,
        reasons: List[str],
        engines: List[str],
        log: Dict[str, Any],
    ) -> bool:
        """
        Determine if the anomaly needs LLM-based root cause analysis.

        True when:
            - Only high_latency fired with no failure_tag and no status code signal
            - Three or more engines fired with conflicting signals
        False when:
            - Clear single classification (server_error, rate_limit alone)
            - failure_tag is present (already classified)
        """
        failure_tag = log.get("failure_tag", "none")

        # If failure tag is present, classification is clear
        if failure_tag and failure_tag != "none":
            return False

        # Clear single signals don't need LLM
        clear_signals = {"server_error", "rate_limit", "rate_based_error_spike"}
        if len(reasons) == 1 and reasons[0] in clear_signals:
            return False

        # Only high_latency with no other context → LLM needed
        if reasons == ["high_latency"]:
            return True

        # Three or more engines with different signals → complex, LLM needed
        unique_engines = set(engines)
        if len(unique_engines) >= 3:
            return True

        return False


# Singleton instance
detection_service = DetectionService()
