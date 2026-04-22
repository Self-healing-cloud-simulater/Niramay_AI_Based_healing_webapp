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

    # ── Normalized Scoring ─────────────────────────────────────────────
    #
    # The numeric score is the PRIMARY signal.  Severity is DERIVED.
    # Existing rule-based engines still run in parallel to collect
    # anomaly_reasons and engines_triggered for explainability.
    # ──────────────────────────────────────────────────────────────────

    @staticmethod
    def _compute_normalized_score(
        log: Dict[str, Any],
        engine_names: List[str],
    ) -> float:
        """
        Compute a continuous anomaly score in [0, 1] from raw log fields.

        Components:
            latency_score   – response time contribution
            status_score    – HTTP status code contribution
            failure_score   – failure-tag / failure-type contribution
            rate_limit_score – 429 penalty
            engine_bump     – flat bump when advanced engines fire
        """
        # ── Latency contribution ──────────────────────────────────────
        rt = log.get("response_time_ms") or log.get("response_time") or 0.0
        if rt > 500:
            latency_score = 0.6
        elif rt > 200:
            latency_score = 0.3
        else:
            latency_score = 0.0

        # ── Status-code contribution ──────────────────────────────────
        sc = log.get("status_code", 200)
        if sc >= 500:
            status_score = 0.7
        elif sc >= 400 and sc != 429:      # 429 handled separately
            status_score = 0.4
        else:
            status_score = 0.0

        # ── Failure-tag contribution ──────────────────────────────────
        ft = log.get("failure_tag") or log.get("failure_type") or "none"
        failure_score = 0.6 if ft != "none" else 0.0

        # ── Rate-limit (429) penalty ──────────────────────────────────
        rate_limit_score = 0.5 if sc == 429 else 0.0

        # ── Advanced-engine bump ──────────────────────────────────────
        advanced = {"rate_based_engine", "silence_detection_engine"}
        engine_bump = 0.5 if advanced.intersection(engine_names) else 0.0

        raw = latency_score + status_score + failure_score + rate_limit_score + engine_bump
        return round(min(1.0, raw), 4)

    @staticmethod
    def _derive_severity(score: float) -> str:
        """
        Map a [0, 1] anomaly score to a discrete severity label.

            0.0 – 0.3  → low
            0.3 – 0.6  → medium
            0.6 – 0.8  → high
            0.8 – 1.0  → critical
        """
        if score >= 0.8:
            return "critical"
        if score >= 0.6:
            return "high"
        if score >= 0.3:
            return "medium"
        return "low"

    # ── Main entry point ──────────────────────────────────────────────

    def detect_anomaly(self, log: Dict[str, Any]) -> Dict[str, Any]:
        """
        Pure function: evaluate a normalized log against all engines.

        Returns a fully enriched detection result dict.
        Does NOT write to any storage or push to any queue.

        Scoring strategy:
            1. Run existing engines in parallel → collect reasons & engine names
            2. Compute normalized [0, 1] anomaly_score from raw log fields
            3. Derive severity from score (low / medium / high / critical)
            4. is_anomaly = anomaly_score >= DETECTION_ANOMALY_THRESHOLD
        """
        # ── 1. Run all engines in parallel ────────────────────────────
        futures = {
            self._executor.submit(self._run_engine, engine, log): engine
            for engine in self.engines
        }

        all_reasons: List[str] = []
        engines_triggered: List[str] = []

        for future in as_completed(futures, timeout=5):
            try:
                engine_name, results = future.result()
                for result in results:
                    if result.triggered:
                        all_reasons.append(result.reason)
                        engines_triggered.append(engine_name)
            except Exception as e:
                logger.warning("Engine future failed", error=str(e))

        # De-duplicate
        unique_reasons = list(set(all_reasons))
        unique_engines = list(set(engines_triggered))

        # ── 2. Compute normalized score ───────────────────────────────
        anomaly_score = self._compute_normalized_score(log, engines_triggered)

        # ── 3. Derive severity ────────────────────────────────────────
        severity = self._derive_severity(anomaly_score)

        # ── 4. Determine if anomaly ───────────────────────────────────
        is_anomaly = anomaly_score >= settings.DETECTION_ANOMALY_THRESHOLD

        # ── 5. LLM escalation check ──────────────────────────────────
        requires_llm = self._should_require_llm(
            unique_reasons, unique_engines, log
        )

        # ── 6. Build enriched result ──────────────────────────────────
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
            "engines_triggered": unique_engines,
            "anomaly_reasons": unique_reasons,
            "anomaly_score": anomaly_score,
            "severity": severity,
            "is_anomaly": is_anomaly,
            "requires_llm": requires_llm,
        }

        if is_anomaly:
            logger.info(
                "Anomaly detected",
                score=anomaly_score,
                severity=severity,
                reasons=unique_reasons,
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
