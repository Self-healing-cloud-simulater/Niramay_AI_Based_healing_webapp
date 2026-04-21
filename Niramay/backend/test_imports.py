"""
Stage 1 & Stage 2 — Full Smoke Test Suite

Tests the complete parallel engine architecture:
    1. Normalizer (valid, missing, malformed)
    2. OpenSearch client (import + index names)
    3. RabbitMQ consumer (import)
    4. All 4 engines (import + config + evaluate)
    5. DetectionService (parallel execution + enriched output)
    6. Detection Worker (import)
    7. Config settings (all new settings present)
    8. Backward compatibility (deprecated engine.py)
"""
import json

print("=" * 60)
print("Stage 1 & Stage 2 — Full Architecture Test")
print("=" * 60)

# ──────────────────────────────────────────────────────────
# Test 1: Normalizer
# ──────────────────────────────────────────────────────────
print("\n[1] Normalizer...")
from app.ingestion.normalizer import normalize_log

result = normalize_log('{"service": "order-svc", "endpoint": "/api/orders", "status_code": 500, "response_time_ms": 450.2, "failure_tag": "database_error"}')
assert result["service"] == "order-svc"
assert result["status_code"] == 500
assert result["is_malformed"] == False
print("  Valid JSON: OK")

result = normalize_log('{"service": "test-svc"}')
assert result["endpoint"] == "unknown"
assert result["status_code"] == 0
assert "endpoint" in result["incomplete_fields"]
print("  Missing fields: OK")

result = normalize_log("garbage data!!!")
assert result["is_malformed"] == True
assert result["raw"] == "garbage data!!!"
print("  Malformed: OK")

# ──────────────────────────────────────────────────────────
# Test 2: OpenSearch Client
# ──────────────────────────────────────────────────────────
print("\n[2] OpenSearch Client...")
from app.ingestion.opensearch_client import opensearch_writer, INDEX_NORMALIZED_LOGS, INDEX_ANOMALY_RECORDS, INDEX_HEALTHY_LOGS
assert INDEX_NORMALIZED_LOGS == "b-normalized-logs"
assert INDEX_ANOMALY_RECORDS == "b-anomaly-records"
assert INDEX_HEALTHY_LOGS == "b-healthy-logs"
print("  Indices: OK")

# ──────────────────────────────────────────────────────────
# Test 3: RabbitMQ Consumer
# ──────────────────────────────────────────────────────────
print("\n[3] RabbitMQ Consumer...")
from app.ingestion.rabbitmq_consumer import start_rabbitmq_consumer
print("  Import: OK")

# ──────────────────────────────────────────────────────────
# Test 4: All 4 Engines
# ──────────────────────────────────────────────────────────
print("\n[4] Engines...")

from app.detection.engines.base_engine import BaseEngine
from app.detection.engines.feature_rule_engine import FeatureRuleEngine
from app.detection.engines.rate_based_engine import RateBasedEngine
from app.detection.engines.silence_detection_engine import SilenceDetectionEngine, silence_engine
from app.detection.engines.baseline_anomaly_engine import BaselineAnomalyEngine

# Feature Rule Engine
fre = FeatureRuleEngine()
assert fre.name == "feature_rule_engine"
results = fre.evaluate({"status_code": 500, "response_time": 100, "failure_type": "none"})
assert len(results) == 1  # StatusCodeRule fires (server_error)
assert results[0].reason == "server_error"
assert results[0].score == 3
print("  Feature Rule Engine: OK")

results = fre.evaluate({"status_code": 200, "response_time": 500, "failure_type": "none"})
assert len(results) == 1  # LatencyRule fires (high_latency, 500 > 300)
assert results[0].reason == "high_latency"
print("  Feature Rule Engine (latency): OK")

results = fre.evaluate({"status_code": 200, "response_time": 100, "failure_type": "database_error"})
assert len(results) == 1  # FailureTagRule fires
print("  Feature Rule Engine (failure_tag): OK")

results = fre.evaluate({"status_code": 500, "response_time": 500, "failure_type": "database_error"})
assert len(results) == 3  # All three fire
print("  Feature Rule Engine (all three): OK")

# Rate-Based Engine
rbe = RateBasedEngine()
assert rbe.name == "rate_based_engine"
results = rbe.evaluate({"status_code": 200})  # Not an error
assert len(results) == 0
print("  Rate-Based Engine: OK (skips non-errors)")

# Silence Detection Engine
assert silence_engine.name == "silence_detection_engine"
results = silence_engine.evaluate({"service": "test-svc"})
assert len(results) == 0  # Only updates timestamp, never fires inline
print("  Silence Detection Engine: OK (updates timestamp)")

# Baseline Anomaly Engine
bae = BaselineAnomalyEngine()
assert bae.name == "baseline_anomaly_engine"
print("  Baseline Anomaly Engine: OK")

# ──────────────────────────────────────────────────────────
# Test 5: DetectionService (Parallel Execution)
# ──────────────────────────────────────────────────────────
print("\n[5] DetectionService (parallel execution)...")
from app.detection.index import DetectionService, detection_service

# Verify 4 engines
assert len(detection_service.engines) == 4
engine_names = [e.name for e in detection_service.engines]
assert "feature_rule_engine" in engine_names
assert "rate_based_engine" in engine_names
assert "silence_detection_engine" in engine_names
assert "baseline_anomaly_engine" in engine_names
print(f"  4 engines registered: {engine_names}")

# Test anomaly detection (server error → score 3 → triggers)
test_log = {
    "timestamp": "2026-04-21T12:00:00Z",
    "service": "order-svc",
    "endpoint": "/api/orders",
    "status_code": 500,
    "response_time_ms": 100.0,
    "failure_tag": "none",
    "request_id": "test-123",
}
result = detection_service.detect_anomaly(test_log)
assert "detection_id" in result
assert "engines_triggered" in result
assert "anomaly_reasons" in result
assert "anomaly_score" in result
assert "severity" in result
assert "is_anomaly" in result
assert "requires_llm" in result
assert result["is_anomaly"] == True
assert "server_error" in result["anomaly_reasons"]
assert result["anomaly_score"] >= 3
print(f"  Server error: ANOMALY (score={result['anomaly_score']}, severity={result['severity']}, engines={result['engines_triggered']})")

# Test healthy log (no triggers)
healthy_log = {
    "timestamp": "2026-04-21T12:00:00Z",
    "service": "order-svc",
    "endpoint": "/api/orders",
    "status_code": 200,
    "response_time_ms": 50.0,
    "failure_tag": "none",
    "request_id": "test-456",
}
result = detection_service.detect_anomaly(healthy_log)
assert result["is_anomaly"] == False
assert result["anomaly_score"] == 0
print(f"  Healthy log: OK (score={result['anomaly_score']}, is_anomaly=False)")

# Test multi-signal (server_error + high_latency + failure_tag)
# The FeatureRuleEngine aliases failure_tag → failure_type and response_time_ms → response_time
multi_log = {
    "timestamp": "2026-04-21T12:00:00Z",
    "service": "payment-svc",
    "endpoint": "/api/pay",
    "status_code": 500,
    "response_time_ms": 1200.0,
    "failure_tag": "timeout",
    "request_id": "test-789",
}
result = detection_service.detect_anomaly(multi_log)
assert result["is_anomaly"] == True
assert len(result["anomaly_reasons"]) >= 2  # At least server_error + high_latency or timeout
# Multiple reasons → requires_llm should be True
assert result["requires_llm"] == True
print(f"  Multi-signal: ANOMALY (score={result['anomaly_score']}, requires_llm={result['requires_llm']}, reasons={result['anomaly_reasons']})")

# ──────────────────────────────────────────────────────────
# Test 6: Detection Worker
# ──────────────────────────────────────────────────────────
print("\n[6] Detection Worker...")
from app.detection.worker import start_detection_worker
print("  Import: OK")

# ──────────────────────────────────────────────────────────
# Test 7: Config
# ──────────────────────────────────────────────────────────
print("\n[7] Config settings...")
from app.core.config import settings
assert settings.RATE_BASED_ERROR_THRESHOLD == 5
assert settings.RATE_BASED_WINDOW_SECONDS == 60
assert settings.SILENCE_THRESHOLD_SECONDS == 120
assert settings.SILENCE_CHECK_INTERVAL_SECONDS == 30
assert settings.DETECTION_ANOMALY_SCORE_THRESHOLD == 3
assert settings.BASELINE_DEVIATION_FACTOR == 2.0
assert settings.BASELINE_MIN_SAMPLES == 20
assert settings.OLLAMA_MODEL == "llama3.2"
assert settings.RABBITMQ_QUEUE == "component-c-logs"
print(f"  All settings: OK")

# ──────────────────────────────────────────────────────────
# Test 8: Backward Compat (deprecated engine.py)
# ──────────────────────────────────────────────────────────
print("\n[8] Backward compatibility...")
from app.detection.engine import detection_engine
result = detection_engine.analyze_log(test_log)
assert result["is_anomaly"] == True
print("  Deprecated engine.analyze_log(): OK (delegates to new DetectionService)")

print("\n" + "=" * 60)
print("ALL 8 TEST SUITES PASSED!")
print("=" * 60)
print("\nArchitecture:")
print("  Stage 1: RabbitMQ -> Normalizer -> OpenSearch (async)")
print("  Stage 2: [4 Parallel Engines] -> Detection Worker")
print("    |-- Feature Rule Engine     (status code & value checks)")
print("    |-- Rate-Based Engine       (frequency & spike detection)")
print("    |-- Silence Detection Engine (missing signal / timeout)")
print("    +-- Baseline Anomaly Engine (deviation from normal range)")
print("  Output: Enriched detection -> Redis queue + OpenSearch")
