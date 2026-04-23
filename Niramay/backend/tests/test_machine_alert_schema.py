"""Tests for the machine alert contract produced by the
Analyser and consumed by Component A."""
from app.reporting.report_generator import generate_machine_alert


SAMPLE_DETECTION = {
    "detection_id": "det-001",
    "timestamp": "2024-01-15T10:30:00Z",
    "service": "order-service",
    "endpoint": "/api/orders",
    "method": "POST",
    "status_code": 500,
    "response_time_ms": 2340.0,
    "failure_tag": "database_error",
    "engines_triggered": ["feature_rule_engine"],
    "anomaly_reasons": ["server_error"],
    "anomaly_score": 0.72,
    "severity": "high",
    "is_anomaly": True,
    "requires_llm": False,
}

SAMPLE_AI_ANALYSIS = {
    "root_cause": "DB connection pool exhausted",
    "confidence": 0.9,
    "suggested_action": "restart_service",
    "analysis_type": "ai_llm",
}

SAMPLE_HEAL_PENDING = {
    "healing_action": "pending",
    "status": "pending",
    "message": "Awaiting Component A.",
    "verification_status": "PENDING",
}


def test_alert_contains_recommended_action():
    alert = generate_machine_alert(
        SAMPLE_DETECTION, SAMPLE_AI_ANALYSIS, SAMPLE_HEAL_PENDING
    )
    assert alert["recommended_action"] == "restart_service"


def test_alert_does_not_leak_pending_as_action():
    alert = generate_machine_alert(
        SAMPLE_DETECTION, SAMPLE_AI_ANALYSIS, SAMPLE_HEAL_PENDING
    )
    assert alert.get("recommended_action") != "pending"
    assert "healing_action" not in alert  # old field removed


def test_alert_healing_action_taken_is_null_when_pending():
    alert = generate_machine_alert(
        SAMPLE_DETECTION, SAMPLE_AI_ANALYSIS, SAMPLE_HEAL_PENDING
    )
    assert alert["healing_action_taken"] is None


def test_alert_healing_action_taken_populated_after_execution():
    heal_done = {
        "healing_action": "restart_service",
        "status": "success",
        "message": "Service restarted.",
        "verification_status": "PENDING",
    }
    alert = generate_machine_alert(
        SAMPLE_DETECTION, SAMPLE_AI_ANALYSIS, heal_done
    )
    assert alert["healing_action_taken"] == "restart_service"
    assert alert["healing_status"] == "success"


def test_alert_contains_full_diagnosis():
    alert = generate_machine_alert(
        SAMPLE_DETECTION, SAMPLE_AI_ANALYSIS, SAMPLE_HEAL_PENDING
    )
    assert alert["root_cause"] == "DB connection pool exhausted"
    assert alert["confidence"] == 0.9
    assert alert["analysis_type"] == "ai_llm"


def test_alert_contains_target_fields():
    alert = generate_machine_alert(
        SAMPLE_DETECTION, SAMPLE_AI_ANALYSIS, SAMPLE_HEAL_PENDING
    )
    assert alert["service"] == "order-service"
    assert alert["endpoint"] == "/api/orders"
    assert alert["severity"] == "high"


def test_alert_contains_context_for_component_a():
    alert = generate_machine_alert(
        SAMPLE_DETECTION, SAMPLE_AI_ANALYSIS, SAMPLE_HEAL_PENDING
    )
    assert alert["failure_tag"] == "database_error"
    assert alert["status_code"] == 500
    assert "server_error" in alert["anomaly_reasons"]
    assert "feature_rule_engine" in alert["engines_triggered"]


def test_alert_has_unique_alert_id():
    alert1 = generate_machine_alert(
        SAMPLE_DETECTION, SAMPLE_AI_ANALYSIS, SAMPLE_HEAL_PENDING
    )
    alert2 = generate_machine_alert(
        SAMPLE_DETECTION, SAMPLE_AI_ANALYSIS, SAMPLE_HEAL_PENDING
    )
    assert alert1["alert_id"] != alert2["alert_id"]
