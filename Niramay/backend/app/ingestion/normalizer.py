"""
Stage 1 — Log Normalizer

Parses raw log messages from RabbitMQ (Component C) into a normalized
dictionary structure. Handles missing fields gracefully by applying
safe defaults and tracking normalization quality.

This normalizer produces the canonical field names required by the
Stage 2 detection pipeline:
    timestamp, service, endpoint, status_code, response_time_ms,
    failure_tag, request_id, raw, is_malformed
"""
import json
import structlog
from datetime import datetime, timezone
from typing import Dict, Any

logger = structlog.get_logger(__name__)


def normalize_log(raw_message: str) -> Dict[str, Any]:
    """
    Parse a raw log message string into the normalized structure.

    Handling rules:
        - Missing timestamp      → current UTC time
        - Missing status_code    → 0, flag as incomplete
        - Missing endpoint       → "unknown", flag as incomplete
        - Missing response_time_ms → 0.0
        - Missing failure_tag    → "none"
        - Completely unparseable → store in raw, set defaults, is_malformed=True

    Returns:
        dict with the normalized log structure.
    """
    incomplete_fields = []

    # ── Attempt JSON parse ──
    try:
        data = json.loads(raw_message)
        if not isinstance(data, dict):
            raise ValueError("Parsed JSON is not a dictionary")
    except (json.JSONDecodeError, ValueError) as e:
        logger.warning(
            "Completely unparseable message received",
            error=str(e),
            raw_preview=raw_message[:200]
        )
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "service": "unknown",
            "endpoint": "unknown",
            "status_code": 0,
            "response_time_ms": 0.0,
            "failure_tag": "none",
            "request_id": None,
            "raw": raw_message,
            "is_malformed": True,
            "incomplete_fields": [
                "timestamp", "service", "endpoint",
                "status_code", "response_time_ms", "failure_tag"
            ],
        }

    # ── Timestamp ──
    timestamp = data.get("timestamp")
    if not timestamp:
        timestamp = datetime.now(timezone.utc).isoformat()
        incomplete_fields.append("timestamp")
    else:
        # Validate it's a parseable ISO8601 string; if not, replace
        try:
            datetime.fromisoformat(str(timestamp).replace("Z", "+00:00"))
            timestamp = str(timestamp)
        except (ValueError, TypeError):
            timestamp = datetime.now(timezone.utc).isoformat()
            incomplete_fields.append("timestamp")

    # ── Service ──
    # Accept both "service" and "service_name" (Component C may use either)
    service = data.get("service") or data.get("service_name")
    if not service:
        service = "unknown"
        incomplete_fields.append("service")
    else:
        service = str(service)

    # ── Endpoint ──
    endpoint = data.get("endpoint")
    if not endpoint:
        endpoint = "unknown"
        incomplete_fields.append("endpoint")
    else:
        endpoint = str(endpoint)

    # ── Status Code ──
    status_code = data.get("status_code")
    if status_code is None:
        status_code = 0
        incomplete_fields.append("status_code")
    else:
        try:
            status_code = int(status_code)
        except (ValueError, TypeError):
            status_code = 0
            incomplete_fields.append("status_code")

    # ── Response Time (ms) ──
    # Accept both "response_time_ms" and "response_time"
    response_time_ms = data.get("response_time_ms") or data.get("response_time")
    if response_time_ms is None:
        response_time_ms = 0.0
    else:
        try:
            response_time_ms = float(response_time_ms)
        except (ValueError, TypeError):
            response_time_ms = 0.0

    # ── Failure Tag ──
    # Accept both "failure_tag" and "failure_type"
    failure_tag = data.get("failure_tag") or data.get("failure_type")
    if not failure_tag:
        failure_tag = "none"
    else:
        failure_tag = str(failure_tag)

    # ── Request ID ──
    request_id = data.get("request_id")
    if request_id is not None:
        request_id = str(request_id)

    # ── Build normalized output ──
    normalized = {
        "timestamp": timestamp,
        "service": service,
        "endpoint": endpoint,
        "status_code": status_code,
        "response_time_ms": response_time_ms,
        "failure_tag": failure_tag,
        "request_id": request_id,
        "raw": raw_message,
        "is_malformed": False,
        "incomplete_fields": incomplete_fields,
    }

    if incomplete_fields:
        logger.info(
            "Log normalized with missing fields",
            missing=incomplete_fields,
            service=service,
            endpoint=endpoint,
        )

    return normalized
