"""
Consolidated API Routes for the Healing Layer
Includes: Observation, Detection, Healing, and Failure Simulator endpoints.
All endpoints are public (no auth required in the standalone app).
"""
from fastapi import APIRouter, Query, Depends
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import json
from app.observation.store import (
    observation_store,
    REDIS_ANOMALIES_KEY,
    REDIS_STATS_PREFIX,
    REDIS_HEALING_KEY,
)
from app.observation.schemas import ObservationLog
from app.api.v1.schemas import AuditLogResponse, AnomalyResponse, HealingActionResponse, SystemStatsResponse
from app.core.failure_config import failure_simulator
from app.db.session import get_db
from app.db.models import AuditLog, AnomalyRecord, HealingActionRecord
from sqlalchemy.orm import Session
from fastapi import Depends

router = APIRouter()


# ──────────────────────────────────────────────────────────────────────────────
# OBSERVATION LAYER — Phase 1
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/observation/logs", response_model=List[AuditLogResponse], tags=["Observation"])
async def get_observation_logs(
    limit: int = Query(100, ge=1, le=1000, description="Number of logs to return"),
    service: Optional[str] = Query(None, description="Filter by service name"),
    start_time: Optional[datetime] = Query(None, description="ISO timestamp for start range"),
    end_time: Optional[datetime] = Query(None, description="ISO timestamp for end range"),
    db: Session = Depends(get_db)
):
    """
    Returns API observation logs from PostgreSQL (historical).
    Enables analysis of historical traffic patterns and failure occurrences.
    """
    query = db.query(AuditLog)
    if service:
        query = query.filter(AuditLog.service == service)
    if start_time:
        query = query.filter(AuditLog.timestamp >= start_time)
    if end_time:
        query = query.filter(AuditLog.timestamp <= end_time)
    
    logs = query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return logs


@router.post("/observe", tags=["Observation"])
async def observe_log(log: ObservationLog):
    """
    Generic ingestion API for external systems.
    Accepts standardized log schema and triggers detection pipeline.
    """
    await observation_store.push_log(log.model_dump())
    return {"status": "accepted", "request_id": log.request_id}


# ──────────────────────────────────────────────────────────────────────────────
# DETECTION LAYER — Phase 2
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/detection/anomalies", response_model=List[AnomalyResponse], tags=["Detection"])
async def get_anomalies(
    limit: int = Query(50, ge=1, le=1000),
    min_score: float = Query(0.0, ge=0.0, le=1.0),
    service: Optional[str] = Query(None),
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Retrieve historical anomalies from PostgreSQL.
    Allows drill-down into specific services and time periods.
    """
    query = db.query(AnomalyRecord).join(AuditLog)
    query = query.filter(AnomalyRecord.anomaly_score >= min_score)
    
    if service:
        query = query.filter(AuditLog.service == service)
    if start_time:
        query = query.filter(AnomalyRecord.timestamp >= start_time)
    if end_time:
        query = query.filter(AnomalyRecord.timestamp <= end_time)
        
    anomalies = query.order_by(AnomalyRecord.timestamp.desc()).limit(limit).all()
    return anomalies


@router.get("/stats", response_model=SystemStatsResponse, tags=["Dashboard"])
async def get_system_stats(db: Session = Depends(get_db)):
    """
    Calculates overall system health and statistics.
    Provides both total history and a 5-minute sliding window health score.
    """
    # 1. Total Stats
    total_logs = db.query(AuditLog).count()
    total_anomalies = db.query(AnomalyRecord).count()
    health_score = (1 - (total_anomalies / total_logs)) * 100 if total_logs > 0 else 100.0

    # 2. Window Stats (Last 5 Minutes)
    window_start = datetime.utcnow() - timedelta(minutes=5)
    window_logs = db.query(AuditLog).filter(AuditLog.timestamp >= window_start).count()
    window_anomalies = db.query(AnomalyRecord).filter(AnomalyRecord.timestamp >= window_start).count()
    window_health = (1 - (window_anomalies / window_logs)) * 100 if window_logs > 0 else 100.0

    # 3. Aggregations (using Redis for real-time counters)
    r = await observation_store.get_redis()
    by_type = {}
    by_endpoint = {}
    
    if r:
        try:
            raw_types = await r.hgetall(f"{REDIS_STATS_PREFIX}:type")
            by_type = {k: int(v) for k, v in raw_types.items()}
            
            raw_endpoints = await r.hgetall(f"{REDIS_STATS_PREFIX}:endpoint")
            by_endpoint = {k: int(v) for k, v in raw_endpoints.items()}
        except Exception as e:
            from app.core.logging import logger
            logger.error(f"Error fetching stats from Redis: {e}")

    return {
        "total_logs": total_logs,
        "total_anomalies": total_anomalies,
        "health_score": round(health_score, 2),
        "window_health_score": round(window_health, 2),
        "by_endpoint": by_endpoint,
        "by_type": by_type
    }


# ──────────────────────────────────────────────────────────────────────────────
# HEALING LAYER — Phase 3
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/healing/actions", response_model=List[HealingActionResponse], tags=["Healing"])
async def get_healing_actions(
    limit: int = Query(50, ge=1, le=1000, description="Max healing actions to return"),
    service: Optional[str] = Query(None),
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Retrieve history of healing actions from PostgreSQL.
    Monitoring autonomous remediation effectiveness across the environment.
    """
    query = db.query(HealingActionRecord).join(AnomalyRecord).join(AuditLog)
    
    if service:
        query = query.filter(AuditLog.service == service)
    if start_time:
        query = query.filter(HealingActionRecord.timestamp >= start_time)
    if end_time:
        query = query.filter(HealingActionRecord.timestamp <= end_time)
        
    actions = query.order_by(HealingActionRecord.timestamp.desc()).limit(limit).all()
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


# DEMO ENDPOINTS — Removed for system-agnostic modularity.
# Generic traffic can now be ingested via POST /api/v1/observe
