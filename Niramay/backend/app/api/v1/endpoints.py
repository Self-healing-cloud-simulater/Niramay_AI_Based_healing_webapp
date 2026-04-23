"""
Consolidated API Routes for the Healing Layer

All data endpoints read from Redis (real-time) or OpenSearch (history).
No SQLite dependencies.

Includes: Observation, Detection, Healing, Escalation,
History, and Failure Simulator endpoints.
"""
from fastapi import APIRouter, Query
from typing import List, Dict, Any, Optional
import json
from app.core.redis_client import redis_client
from app.ingestion.opensearch_client import opensearch_writer
from app.simulation.failure_config import failure_simulator
from app.ingestion.rabbitmq_publisher import rabbitmq_publisher

router = APIRouter()


# ──────────────────────────────────────────────────────────────────────────────
# OBSERVATION LAYER — Real-time + History
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/observation/logs", tags=["Observation"])
async def get_observation_logs(
    limit: int = Query(100, ge=1, le=1000, description="Number of logs to return"),
):
    """
    Returns real-time API observation logs from Redis.
    Last 1000 entries captured by the pipeline.
    """
    try:
        data = redis_client.lrange("observation:logs", 0, limit - 1)
        return [json.loads(x) for x in data]
    except Exception:
        return []


@router.get("/observation/logs/history", tags=["Observation"])
async def get_observation_logs_history(
    service: Optional[str] = Query(None, description="Filter by service name"),
    limit: int = Query(500, ge=1, le=5000, description="Number of logs to return"),
):
    """
    Returns historical logs from OpenSearch (permanent storage).
    Supports optional service filter.
    """
    return opensearch_writer.get_recent_logs(service=service, limit=limit)


@router.post("/observe", tags=["Observation"])
async def observe_log(log: Dict[str, Any]):
    """
    Generic ingestion API for external systems.
    Publishes directly to RabbitMQ for pipeline processing.
    """
    rabbitmq_publisher.publish(log)
    return {"status": "accepted"}


# ──────────────────────────────────────────────────────────────────────────────
# DETECTION LAYER — Real-time + History
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/detection/anomalies", tags=["Detection"])
async def get_anomalies(
    limit: int = Query(50, ge=1, le=1000),
):
    """
    Retrieve real-time anomalies from Redis.
    Returns the most recent detected anomalies.
    """
    try:
        data = redis_client.lrange("observation:anomalies", 0, limit - 1)
        return [json.loads(x) for x in data]
    except Exception:
        return []


@router.get("/detection/anomalies/history", tags=["Detection"])
async def get_anomaly_history(
    service: Optional[str] = Query(None, description="Filter by service name"),
    limit: int = Query(200, ge=1, le=2000),
):
    """
    Returns historical anomaly records from OpenSearch (permanent storage).
    """
    return opensearch_writer.get_anomaly_history(service=service, limit=limit)


@router.get("/stats", tags=["Dashboard"])
async def get_system_stats():
    """
    Calculates overall system health and statistics.
    Reads from Redis lists and stat hashes.
    """
    try:
        total_logs = redis_client.llen("observation:logs")
        total_anomalies = redis_client.llen("observation:anomalies")
        health_score = (1 - (total_anomalies / total_logs)) * 100 if total_logs > 0 else 100.0

        # Read stats hashes
        by_type = {}
        by_endpoint = {}

        try:
            raw_types = redis_client.hgetall("anomaly_stats:type")
            by_type = {k: int(v) for k, v in raw_types.items()}
        except Exception:
            pass

        try:
            raw_endpoints = redis_client.hgetall("anomaly_stats:endpoint")
            by_endpoint = {k: int(v) for k, v in raw_endpoints.items()}
        except Exception:
            pass

        return {
            "total_logs": total_logs,
            "total_anomalies": total_anomalies,
            "health_score": round(health_score, 2),
            "by_endpoint": by_endpoint,
            "by_type": by_type,
        }
    except Exception:
        return {
            "total_logs": 0,
            "total_anomalies": 0,
            "health_score": 100.0,
            "by_endpoint": {},
            "by_type": {},
        }


# ──────────────────────────────────────────────────────────────────────────────
# HEALING LAYER
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/healing/actions", tags=["Healing"])
async def get_healing_actions(
    limit: int = Query(50, ge=1, le=1000),
):
    """
    Retrieve real-time healing actions from Redis.
    """
    try:
        data = redis_client.lrange("healing:actions", 0, limit - 1)
        return [json.loads(x) for x in data]
    except Exception:
        return []


# ──────────────────────────────────────────────────────────────────────────────
# ESCALATION ALERTS
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/escalations", tags=["Healing"])
async def get_escalation_alerts(
    limit: int = Query(50, ge=1, le=100),
):
    """
    Retrieve escalation alerts from Redis.
    Generated when healing fails after 3 retry attempts.
    """
    try:
        data = redis_client.lrange("escalation:alerts", 0, limit - 1)
        return [json.loads(x) for x in data]
    except Exception:
        return []


# ──────────────────────────────────────────────────────────────────────────────
# INCIDENT REPORTS
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/incident/reports", tags=["Incidents"])
async def get_incident_reports(
    limit: int = Query(50, ge=1, le=1000),
):
    """
    Retrieve real-time incident reports from Redis.
    """
    try:
        data = redis_client.lrange("incident:reports", 0, limit - 1)
        return [json.loads(x) for x in data]
    except Exception:
        return []

@router.get("/incident/reports/history", tags=["Incidents"])
async def get_incident_reports_history(
    limit: int = Query(200, ge=1, le=2000),
):
    """
    Returns historical incident reports from OpenSearch (permanent storage).
    """
    return opensearch_writer.get_incident_reports(limit=limit)

# ──────────────────────────────────────────────────────────────────────────────
# FAILURE SIMULATOR — Controls (for generating failures to heal)
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/failure-simulator/status", tags=["Failure Simulator"])
async def get_simulator_status():
    """Get current status of the failure simulator"""
    metrics = failure_simulator.get_metrics()
    return {
        "enabled": failure_simulator.state.enabled,
        "global_failure_rate": failure_simulator.state.global_failure_rate,
        "active_scenarios": metrics["active_scenarios"],
        "total_scenarios": metrics["total_scenarios"],
        "request_count": metrics["total_requests"],
        "failure_count": metrics["failed_requests"],
        "success_rate": metrics["success_rate"],
        "failure_rate": metrics["failure_rate"],
        "last_updated": failure_simulator.state.last_updated.isoformat()
    }


@router.get("/failure-simulator/scenarios", tags=["Failure Simulator"])
async def list_scenarios():
    """List all available failure scenarios"""
    scenarios = failure_simulator.list_scenarios()
    result = {}
    for name, scenario in scenarios.items():
        result[name] = {
            "name": name,
            "enabled": scenario.enabled,
            "failure_type": scenario.failure_type.value,
            "probability": scenario.probability,
            "endpoints": scenario.endpoints,
            "error_message": scenario.error_message,
        }
    return result


@router.post("/failure-simulator/scenarios/{name}/enable", tags=["Failure Simulator"])
async def enable_scenario(name: str):
    """Enable a failure scenario"""
    if name not in failure_simulator.state.scenarios:
        return {"error": f"Scenario '{name}' not found"}
    failure_simulator.enable_scenario(name)
    return {"message": f"Scenario '{name}' enabled"}


@router.post("/failure-simulator/scenarios/{name}/disable", tags=["Failure Simulator"])
async def disable_scenario(name: str):
    """Disable a failure scenario"""
    if name not in failure_simulator.state.scenarios:
        return {"error": f"Scenario '{name}' not found"}
    failure_simulator.disable_scenario(name)
    return {"message": f"Scenario '{name}' disabled"}


@router.post("/failure-simulator/reset", tags=["Failure Simulator"])
async def reset_all_scenarios():
    """Reset all scenarios to disabled"""
    failure_simulator.reset_all()
    return {"message": "All failure scenarios have been reset"}


@router.post("/failure-simulator/toggle", tags=["Failure Simulator"])
async def toggle_simulator(enabled: bool = Query(...)):
    """Enable or disable the entire failure simulator"""
    failure_simulator.state.enabled = enabled
    return {"message": f"Failure simulator {'enabled' if enabled else 'disabled'}", "enabled": enabled}


@router.post("/failure-simulator/global-rate", tags=["Failure Simulator"])
async def set_global_failure_rate(rate: float = Query(..., ge=0.0, le=1.0)):
    """Set a global failure rate (0-1) that applies to all requests"""
    failure_simulator.state.global_failure_rate = rate
    return {"message": f"Global failure rate set to {rate * 100}%", "global_failure_rate": rate}
