"""
Stage 2 — Detection Service (Parallel Engine Orchestrator)

Runs all 4 detection engines IN PARALLEL using ThreadPoolExecutor:
    1. Feature Rule Engine      — Status code & value checks
    2. Rate-Based Rule Engine   — Frequency & spike detection
    3. Silence Detection Engine — Missing signal / timeout
    4. Baseline Anomaly Engine  — Deviation from normal range

After parallel execution, the Detection Worker aggregates all
engine results into a single enriched detection output, determines
severity and LLM routing, and dispatches to Redis + OpenSearch.

Architecture (matches diagram):
    Normalized logs → [4 parallel engines] → Detection Worker →
        → Final severity scoring
        → LLM required?  (Yes → Stage 3, No → Stage 4)
        → Store event
"""
import json
import structlog
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Any, List
from uuid import uuid4

from app.detection.engines.feature_rule_engine import FeatureRuleEngine
from app.detection.engines.rate_based_engine import RateBasedEngine
from app.detection.engines.silence_detection_engine import silence_engine
from app.detection.engines.baseline_anomaly_engine import BaselineAnomalyEngine
from app.detection.rules.base import RuleResult
from app.core.config import settings

logger = structlog.get_logger(__name__)

# Thread pool for parallel engine execution (4 engines = 4 workers)
_engine_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="detection-engine")


def _classify_severity(score: int) -> str:
    """
    Map integer anomaly score to severity level.
        1-2  → low
        3-5  → medium
        6+   → high
    """
    if score >= 6:
        return "high"
    elif score >= 3:
        return "medium"
    return "low"


def _should_require_llm(
    anomaly_reasons: List[str],
    failure_tag: str,
    status_code: int,
) -> bool:
    """
    Determine if this anomaly requires LLM classification (Stage 3).

    Returns True if:
        - Only high_latency triggered with no failure_tag or status code signal
        - Multiple conflicting signals fire together
    Returns False for:
        - Clear classifications like server_error or rate_limit alone
    """
    if not anomaly_reasons:
        return False

    # Clear-cut single-signal cases → no LLM needed
    clear_reasons = {"server_error", "rate_limit", "rate_based_error_spike"}
    if len(anomaly_reasons) == 1 and anomaly_reasons[0] in clear_reasons:
        return False

    # Single failure_tag signal is also clear
    if len(anomaly_reasons) == 1 and failure_tag != "none":
        return False

    # High latency alone with no other signal → ambiguous → LLM
    if anomaly_reasons == ["high_latency"]:
        has_failure = failure_tag != "none"
        has_status_signal = status_code >= 400
        if not has_failure and not has_status_signal:
            return True

    # Multiple different signals → complex → LLM
    if len(anomaly_reasons) >= 2:
        return True

    return False


class DetectionService:
    """
    Stage 2 Detection Worker — runs all engines in parallel and
    aggregates results into the enriched detection output.

    Replaces the old sequential rule-based approach with a
    concurrent multi-engine architecture.
    """

    def __init__(self):
        # All 4 engines (per architecture diagram)
        self.engines = [
            FeatureRuleEngine(),       # Status code & value checks
            RateBasedEngine(),         # Frequency & spike detection
            silence_engine,            # Missing signal / timeout (singleton)
            BaselineAnomalyEngine(),   # Deviation from normal range
        ]
        self.score_threshold = settings.DETECTION_ANOMALY_SCORE_THRESHOLD

    def _run_engine(self, engine, log: Dict[str, Any]) -> tuple:
        """
        Run a single engine and return (engine_name, results).
        Never raises — catches all exceptions internally.
        """
        try:
            results = engine.evaluate(log)
            return (engine.name, results)
        except Exception as e:
            logger.error(
                "Engine evaluation failed",
                engine=engine.name,
                error=str(e),
            )
            return (engine.name, [])

    def detect_anomaly(self, log: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run all 4 engines in PARALLEL, aggregate results, and produce
        the enriched detection output.

        Pipeline:
            1. Submit all engines to thread pool (parallel)
            2. Collect results from all futures
            3. Aggregate: engines_triggered, anomaly_reasons, total_score
            4. Final severity scoring
            5. LLM routing decision
            6. Dispatch to Redis queue + OpenSearch
        """
        engines_triggered = []
        anomaly_reasons = []
        total_score = 0

        # ── Step 1 & 2: Run all engines in PARALLEL ──
        futures = {
            _engine_executor.submit(self._run_engine, engine, log): engine.name
            for engine in self.engines
        }

        for future in as_completed(futures):
            engine_name, results = future.result()
            if results:
                engines_triggered.append(engine_name)
                for result in results:
                    if result.triggered:
                        anomaly_reasons.append(result.reason)
                        total_score += result.score

        # ── Step 3: Build enriched output ──
        is_anomaly = total_score >= self.score_threshold

        failure_tag = log.get("failure_tag") or log.get("failure_type", "none")
        status_code = log.get("status_code", 0)
        response_time_ms = log.get("response_time_ms") or log.get("response_time", 0.0)

        severity = _classify_severity(total_score) if is_anomaly else "low"
        requires_llm = _should_require_llm(anomaly_reasons, failure_tag, status_code) if is_anomaly else False

        enriched = {
            "detection_id": str(uuid4()),
            "timestamp": log.get("timestamp", ""),
            "service": log.get("service", "unknown"),
            "endpoint": log.get("endpoint", "unknown"),
            "status_code": status_code,
            "response_time_ms": response_time_ms,
            "failure_tag": failure_tag,
            "engines_triggered": engines_triggered,
            "anomaly_reasons": anomaly_reasons,
            "anomaly_score": total_score,
            "severity": severity,
            "is_anomaly": is_anomaly,
            "requires_llm": requires_llm,
        }

        # ── Step 4 & 5: Log and dispatch ──
        if is_anomaly:
            logger.info(
                "Anomaly detected",
                detection_id=enriched["detection_id"],
                service=enriched["service"],
                endpoint=enriched["endpoint"],
                score=total_score,
                severity=severity,
                reasons=anomaly_reasons,
                engines=engines_triggered,
                requires_llm=requires_llm,
            )
            self._dispatch_anomaly(enriched)
        else:
            self._dispatch_healthy(enriched)

        return enriched

    def _dispatch_anomaly(self, enriched: Dict[str, Any]) -> None:
        """
        Push anomaly to Redis queue (Stage 3) and OpenSearch.
        Both are non-blocking and failure-tolerant.
        """
        # Redis: push to anomaly queue for Stage 3
        try:
            import redis
            r = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
                password=settings.REDIS_PASSWORD,
                decode_responses=True,
                socket_connect_timeout=2,
            )
            r.lpush("b-anomaly-queue", json.dumps(enriched))
        except Exception as e:
            logger.error("Failed to push anomaly to Redis queue", error=str(e))

        # OpenSearch: write full enriched record
        try:
            from app.ingestion.opensearch_client import opensearch_writer
            opensearch_writer.write_anomaly_record(enriched)
        except Exception as e:
            logger.error("Failed to write anomaly to OpenSearch", error=str(e))

    def _dispatch_healthy(self, enriched: Dict[str, Any]) -> None:
        """
        Write lightweight healthy record to OpenSearch only.
        Do NOT push to Redis.
        """
        lightweight = {
            "timestamp": enriched["timestamp"],
            "service": enriched["service"],
            "endpoint": enriched["endpoint"],
            "status_code": enriched["status_code"],
            "response_time_ms": enriched["response_time_ms"],
        }

        try:
            from app.ingestion.opensearch_client import opensearch_writer
            opensearch_writer.write_healthy_log(lightweight)
        except Exception as e:
            logger.error("Failed to write healthy log to OpenSearch", error=str(e))


# Global singleton
detection_service = DetectionService()
