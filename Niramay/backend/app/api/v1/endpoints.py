"""
Consolidated API Routes for the Healing Layer

All data endpoints read from Redis (real-time) or OpenSearch (history).
Niramay monitors CRAVE — no failure simulation in this service.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Query, Request
from typing import List, Dict, Any, Optional
import json
import structlog
import httpx
from app.core.config import settings
from app.core.redis_client import redis_client
from app.ingestion.opensearch_client import opensearch_writer

logger = structlog.get_logger(__name__)

router = APIRouter()


# ──────────────────────────────────────────────────────────────────────────────
# OBSERVATION LAYER — Real-time + History
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/observation/logs", tags=["Observation"])
async def get_observation_logs(
    limit: int = Query(100, ge=1, le=1000, description="Number of logs to return"),
):
    try:
        data = redis_client.lrange("observation:logs", 0, limit - 1)
        return [json.loads(x) for x in data]
    except Exception:
        return []


@router.get("/observation/logs/raw", tags=["Observation"])
async def get_raw_logs(limit: int = 100):
    try:
        logs = opensearch_writer.get_raw_logs(limit=limit)
        return logs
    except Exception as e:
        logger.warning("Failed to fetch raw logs", error=str(e))
        return []


@router.get("/observation/logs/history", tags=["Observation"])
async def get_observation_logs_history(
    service: Optional[str] = Query(None, description="Filter by service name"),
    limit: int = Query(500, ge=1, le=5000, description="Number of logs to return"),
):
    return opensearch_writer.get_recent_logs(service=service, limit=limit)


@router.get("/pipeline/stage", tags=["Pipeline"])
async def get_pipeline_stage():
    try:
        raw = redis_client.get(settings.PIPELINE_STAGE_KEY)
        if raw:
            return json.loads(raw)
        return {
            "stage": "idle",
            "message": "No active pipeline processing",
            "timestamp": None,
        }
    except Exception as e:
        logger.warning("Failed to read pipeline stage", error=str(e))
        return {
            "stage": "unknown",
            "message": str(e),
            "timestamp": None,
        }


# ──────────────────────────────────────────────────────────────────────────────
# DETECTION LAYER — Real-time + History
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/detection/anomalies", tags=["Detection"])
async def get_anomalies(limit: int = Query(50, ge=1, le=1000)):
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
    return opensearch_writer.get_anomaly_history(service=service, limit=limit)


@router.get("/stats", tags=["Dashboard"])
async def get_system_stats():
    try:
        total_logs = redis_client.llen("observation:logs")
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

        total_anomaly_count = sum(by_type.values()) if by_type else 0

        try:
            if total_logs == 0:
                health_score = 100.0
            else:
                capped = min(total_anomaly_count, total_logs * 10)
                raw_rate = capped / (total_logs * 10)
                health_score = round(max(0.0, (1 - raw_rate) * 100), 1)
        except Exception:
            health_score = 100.0

        return {
            "total_logs": total_logs,
            "total_anomalies": total_anomaly_count,
            "health_score": health_score,
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
async def get_healing_actions(limit: int = Query(50, ge=1, le=1000)):
    try:
        data = redis_client.lrange("healing:actions", 0, limit - 1)
        return [json.loads(x) for x in data]
    except Exception:
        return []


# ──────────────────────────────────────────────────────────────────────────────
# ESCALATION ALERTS
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/escalations", tags=["Healing"])
async def get_escalation_alerts(limit: int = Query(50, ge=1, le=100)):
    try:
        data = redis_client.lrange("escalation:alerts", 0, limit - 1)
        return [json.loads(x) for x in data]
    except Exception:
        return []


# ──────────────────────────────────────────────────────────────────────────────
# INCIDENT REPORTS
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/incident/reports", tags=["Incidents"])
async def get_incident_reports(limit: int = Query(50, ge=1, le=1000)):
    try:
        data = redis_client.lrange("incident:reports", 0, limit - 1)
        return [json.loads(x) for x in data]
    except Exception:
        return []


@router.get("/incident/reports/history", tags=["Incidents"])
async def get_incident_reports_history(limit: int = Query(200, ge=1, le=2000)):
    return opensearch_writer.get_incident_reports(limit=limit)


# ──────────────────────────────────────────────────────────────────────────────
# DEMO CONTROL — Triggers failures in CRAVE (not Niramay)
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/demo/trigger-failure", tags=["Demo Control"])
async def trigger_failure(request: Request):
    """
    Triggers a failure scenario in CRAVE via its API.
    Niramay does not simulate failures itself — it monitors CRAVE.
    """
    try:
        body = await request.json()
        scenario = body.get("scenario", "database_error")

        async with httpx.AsyncClient(timeout=10.0) as client:
            login = await client.post(
                f"{settings.CRAVE_BACKEND_URL}/api/v1/auth/login",
                json={
                    "email": settings.CRAVE_DEVELOPER_EMAIL,
                    "password": settings.CRAVE_DEVELOPER_PASSWORD,
                },
            )
            if login.status_code != 200:
                return {
                    "success": False,
                    "error": "CRAVE auth failed",
                    "status_code": login.status_code,
                }
            token = login.json().get("access_token")

            enable = await client.post(
                f"{settings.CRAVE_BACKEND_URL}/api/v1/failure-simulator/scenarios/{scenario}/enable",
                headers={"Authorization": f"Bearer {token}"},
            )
            return {
                "success": enable.status_code == 200,
                "scenario": scenario,
                "response": enable.json() if enable.status_code == 200 else enable.text[:200],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

    except Exception as e:
        return {"success": False, "error": str(e)}