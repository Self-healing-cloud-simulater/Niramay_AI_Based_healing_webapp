"""
Consolidated API Routes for the Healing Layer

All data endpoints read from Redis (real-time) or OpenSearch (history).
Niramay monitors CRAVE — no failure simulation in this service.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Query, Request
from typing import List, Dict, Any, Optional
import json
import hashlib
import structlog
import httpx
from app.core.config import settings
from app.core.redis_client import redis_client
from app.ingestion.opensearch_client import opensearch_writer

logger = structlog.get_logger(__name__)

router = APIRouter()

# ── Healing toggle state (in-memory, resets on restart — starts OFF) ──
_healing_enabled = False


# ──────────────────────────────────────────────────────────────────────────────
# CONSUMER CONTROL — Start/Stop/Status RabbitMQ consumer
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/consumer/start", tags=["Consumer Control"])
async def start_consumer():
    """Start the RabbitMQ consumer."""
    from app.ingestion.rabbitmq_consumer import start_rabbitmq_consumer, get_consumer_status
    start_rabbitmq_consumer()
    return {"success": True, "status": get_consumer_status()}


@router.post("/consumer/stop", tags=["Consumer Control"])
async def stop_consumer():
    """Stop the RabbitMQ consumer."""
    from app.ingestion.rabbitmq_consumer import stop_rabbitmq_consumer, get_consumer_status
    stop_rabbitmq_consumer()
    return {"success": True, "status": get_consumer_status()}


@router.get("/consumer/status", tags=["Consumer Control"])
async def consumer_status():
    """Get current consumer status."""
    from app.ingestion.rabbitmq_consumer import get_consumer_status
    return get_consumer_status()


@router.get("/consumer/events", tags=["Consumer Control"])
async def consumer_events(limit: int = Query(50, ge=1, le=200)):
    """Get recent consumer lifecycle events (connected, errors, etc.)."""
    try:
        data = redis_client.lrange("consumer:events", 0, limit - 1)
        return [json.loads(x) for x in data]
    except Exception:
        return []


# ──────────────────────────────────────────────────────────────────────────────
# HEALING TOGGLE — Enable/Disable healing execution
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/healing/enabled", tags=["Healing Control"])
async def get_healing_enabled():
    """Check if healing is enabled."""
    return {"enabled": _healing_enabled}


@router.post("/healing/toggle", tags=["Healing Control"])
async def toggle_healing(request: Request):
    """Toggle healing on/off."""
    global _healing_enabled
    try:
        body = await request.json()
        _healing_enabled = bool(body.get("enabled", not _healing_enabled))
    except Exception:
        _healing_enabled = not _healing_enabled

    # Store in Redis so dispatcher worker can check
    try:
        redis_client.set("healing:enabled", "1" if _healing_enabled else "0")
    except Exception:
        pass

    return {"enabled": _healing_enabled}


# ──────────────────────────────────────────────────────────────────────────────
# OBSERVATION LAYER — Real-time + History
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/observation/logs", tags=["Observation"])
async def get_observation_logs(
    limit: int = Query(100, ge=1, le=1000, description="Number of logs to return"),
):
    try:
        data = redis_client.lrange("observation:logs", 0, limit - 1)
        logs = [json.loads(x) for x in data]
        # Add a fingerprint so frontend can detect actual data changes
        fingerprint = hashlib.md5(
            json.dumps([l.get("request_id", l.get("timestamp", "")) for l in logs[:10]]).encode()
        ).hexdigest()[:12]
        return {"logs": logs, "fingerprint": fingerprint, "count": len(logs)}
    except Exception:
        return {"logs": [], "fingerprint": "empty", "count": 0}


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
            stage_data = json.loads(raw)
            # Add staleness check: if stage timestamp is >60s old
            # and stage is not a terminal state, mark as idle
            ts = stage_data.get("timestamp")
            if ts:
                try:
                    stage_time = datetime.fromisoformat(
                        ts.replace("Z", "+00:00"))
                    elapsed = (
                        datetime.now(timezone.utc) - stage_time
                    ).total_seconds()
                    stage = stage_data.get("stage", "")
                    terminal_stages = {
                        "healing_complete",
                        "healing_failed_escalated",
                        "healing_failed_email_sent",
                    }
                    if elapsed > 60 and stage not in terminal_stages:
                        stage_data["stale"] = True
                except Exception:
                    pass
            return stage_data
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
        anomalies = [json.loads(x) for x in data]
        fingerprint = hashlib.md5(
            json.dumps([a.get("detection_id", a.get("timestamp", "")) for a in anomalies[:10]]).encode()
        ).hexdigest()[:12]
        return {"anomalies": anomalies, "fingerprint": fingerprint, "count": len(anomalies)}
    except Exception:
        return {"anomalies": [], "fingerprint": "empty", "count": 0}


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
            "healing_enabled": _healing_enabled,
        }
    except Exception:
        return {
            "total_logs": 0,
            "total_anomalies": 0,
            "health_score": 100.0,
            "by_endpoint": {},
            "by_type": {},
            "healing_enabled": _healing_enabled,
        }


# ──────────────────────────────────────────────────────────────────────────────
# HEALING LAYER
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/healing/actions", tags=["Healing"])
async def get_healing_actions(limit: int = Query(50, ge=1, le=1000)):
    try:
        data = redis_client.lrange("healing:actions", 0, limit - 1)
        actions = [json.loads(x) for x in data]
        fingerprint = hashlib.md5(
            json.dumps([a.get("alert_id", a.get("timestamp", "")) for a in actions[:10]]).encode()
        ).hexdigest()[:12]
        return {"actions": actions, "fingerprint": fingerprint, "count": len(actions)}
    except Exception:
        return {"actions": [], "fingerprint": "empty", "count": 0}


# ──────────────────────────────────────────────────────────────────────────────
# ESCALATION EMAIL SETTINGS
# ──────────────────────────────────────────────────────────────────────────────

ESCALATION_EMAIL_REDIS_KEY = "escalation:email_to"


@router.get("/escalation/email", tags=["Escalation"])
async def get_escalation_email():
    """Get the currently configured escalation email address."""
    try:
        email = redis_client.get(ESCALATION_EMAIL_REDIS_KEY)
        return {"email": email or ""}
    except Exception:
        return {"email": ""}


@router.post("/escalation/email", tags=["Escalation"])
async def set_escalation_email(request: Request):
    """
    Set the developer email address for escalation alerts.
    When healing fails after 3 attempts, an email is sent
    to this address.
    """
    try:
        body = await request.json()
        email = body.get("email", "").strip()
        if not email:
            return {"success": False, "error": "Email address is required"}
        # Basic validation
        if "@" not in email or "." not in email:
            return {"success": False, "error": "Invalid email address"}
        redis_client.set(ESCALATION_EMAIL_REDIS_KEY, email)
        logger.info("Escalation email updated", email=email)
        return {"success": True, "email": email}
    except Exception as e:
        logger.error("Failed to set escalation email", error=str(e))
        return {"success": False, "error": str(e)}


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