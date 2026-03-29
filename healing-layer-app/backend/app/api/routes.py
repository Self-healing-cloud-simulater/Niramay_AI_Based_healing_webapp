"""
Consolidated API Routes for the Healing Layer
Includes: Observation, Detection, Healing, and Failure Simulator endpoints.
All endpoints are public (no auth required in the standalone app).
"""
from fastapi import APIRouter, Query
from typing import List, Dict, Any, Optional
import json
from app.core.observation_store import (
    observation_store,
    REDIS_ANOMALIES_KEY,
    REDIS_STATS_PREFIX,
    REDIS_HEALING_KEY,
)
from app.core.failure_config import failure_simulator

router = APIRouter()


# ──────────────────────────────────────────────────────────────────────────────
# OBSERVATION LAYER — Phase 1
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/observation/logs", response_model=List[Any], tags=["Observation"])
async def get_observation_logs(
    limit: int = Query(100, ge=1, le=1000, description="Number of logs to return")
):
    """
    Returns recent API observation logs.
    Provides structured behavioral data ('CCTV recordings') of API traffic.
    """
    return await observation_store.get_logs(limit=limit)


# ──────────────────────────────────────────────────────────────────────────────
# DETECTION LAYER — Phase 2
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/detection/anomalies", response_model=Dict[str, Any], tags=["Detection"])
async def get_anomalies(
    limit: int = Query(50, ge=1, le=1000),
    min_score: int = Query(0, ge=0),
    type: Optional[str] = Query(None, description="Filter by anomaly reason"),
    endpoint: Optional[str] = Query(None, description="Filter by endpoint path")
):
    """
    Retrieve anomalous logs with filtering and basic statistics.
    """
    r = await observation_store.get_redis()
    if not r:
        return {"total": 0, "filtered": 0, "anomalies": [], "stats": {}}

    raw_anomalies = await r.lrange(REDIS_ANOMALIES_KEY, 0, -1)
    anomalies = [json.loads(log) for log in raw_anomalies]

    filtered_anomalies = []
    for log in anomalies:
        if log.get("anomaly_score", 0) < min_score:
            continue
        if type and type not in log.get("anomaly_reasons", []):
            continue
        if endpoint and endpoint != log.get("endpoint"):
            continue
        filtered_anomalies.append(log)

    stats_endpoint = await r.hgetall(f"{REDIS_STATS_PREFIX}:endpoint")
    stats_type = await r.hgetall(f"{REDIS_STATS_PREFIX}:type")

    return {
        "total": len(anomalies),
        "filtered": len(filtered_anomalies),
        "anomalies": filtered_anomalies[:limit],
        "stats": {
            "by_endpoint": {k: int(v) for k, v in stats_endpoint.items()},
            "by_type": {k: int(v) for k, v in stats_type.items()}
        }
    }


# ──────────────────────────────────────────────────────────────────────────────
# HEALING LAYER — Phase 3
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/healing/actions", response_model=List[Dict[str, Any]], tags=["Healing"])
async def get_healing_actions(
    limit: int = Query(50, ge=1, le=1000, description="Max healing actions to return")
):
    """
    Retrieve the history of healing actions automatically triggered by anomalies.
    """
    r = await observation_store.get_redis()
    if not r:
        return []

    raw_actions = await r.lrange(REDIS_HEALING_KEY, 0, limit - 1)
    actions = [json.loads(action) for action in raw_actions]
    return actions


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


# ──────────────────────────────────────────────────────────────────────────────
# DEMO ENDPOINTS — Simulated API routes to generate traffic
# These endpoints exist solely so the traffic generator has real API paths
# to hit, which then flow through the Observation → Detection → Healing pipeline.
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/demo/restaurants", tags=["Demo Traffic"])
async def demo_restaurants():
    """Simulated restaurant listing endpoint"""
    return {"restaurants": [
        {"id": 1, "name": "Spice Garden", "cuisine": "Indian", "rating": 4.5},
        {"id": 2, "name": "Dragon Palace", "cuisine": "Chinese", "rating": 4.2},
        {"id": 3, "name": "La Piazza", "cuisine": "Italian", "rating": 4.7},
    ]}


@router.get("/demo/orders", tags=["Demo Traffic"])
async def demo_orders():
    """Simulated orders endpoint"""
    return {"orders": [
        {"id": 101, "status": "delivered", "total": 450},
        {"id": 102, "status": "preparing", "total": 780},
    ]}


@router.post("/demo/orders", tags=["Demo Traffic"])
async def demo_create_order():
    """Simulated order creation endpoint"""
    return {"order_id": 103, "status": "pending", "message": "Order placed successfully"}


@router.get("/demo/payments", tags=["Demo Traffic"])
async def demo_payments():
    """Simulated payment status endpoint"""
    return {"payment_id": "PAY-001", "status": "completed", "amount": 450}


@router.post("/demo/payments/process", tags=["Demo Traffic"])
async def demo_process_payment():
    """Simulated payment processing endpoint"""
    return {"transaction_id": "TXN-001", "status": "success"}


@router.get("/demo/delivery/status", tags=["Demo Traffic"])
async def demo_delivery_status():
    """Simulated delivery tracking endpoint"""
    return {"delivery_id": "DEL-001", "status": "en_route", "eta_minutes": 15}
