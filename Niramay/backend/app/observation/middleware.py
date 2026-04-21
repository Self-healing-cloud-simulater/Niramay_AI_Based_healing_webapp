"""
Observation Middleware — CCTV for API Traffic

Captures all HTTP request/response data and publishes
log entries to RabbitMQ for the unified pipeline:
    Middleware → RabbitMQ → Normalizer → Detection → Healing

This is the ONLY place in the codebase that publishes
internal traffic to RabbitMQ.
"""
import time
import uuid
from datetime import datetime, timezone
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.ingestion.rabbitmq_publisher import rabbitmq_publisher

# Paths to exclude from observation (avoid recursive noise)
_EXCLUDED_PATHS = {
    "/api/v1/observation/logs",
    "/api/v1/observation/logs/history",
    "/api/v1/detection/anomalies",
    "/api/v1/detection/anomalies/history",
    "/api/v1/healing/actions",
    "/api/v1/escalations",
    "/api/v1/stats",
    "/api/v1/failure-simulator/status",
    "/api/v1/failure-simulator/scenarios",
    "/health",
    "/",
    "/docs",
    "/redoc",
    "/openapi.json",
}


class ObservationMiddleware(BaseHTTPMiddleware):
    """
    Captures API request-response data and publishes to RabbitMQ.
    Uses canonical field names matching the normalizer output:
        response_time_ms, failure_tag (not response_time, failure_type)
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path

        # Skip tracking for excluded paths
        if path in _EXCLUDED_PATHS:
            return await call_next(request)

        # 1. Capture request metadata
        request_id = str(uuid.uuid4())
        start_time = time.monotonic()
        timestamp = datetime.now(timezone.utc).isoformat()

        # 2. Process the request
        try:
            response: Response = await call_next(request)
        except Exception as exc:
            duration_ms = round((time.monotonic() - start_time) * 1000, 1)
            failure_tag = getattr(request.state, "observation_failure_type", "none")

            log_entry = {
                "timestamp": timestamp,
                "service": "niramay",
                "endpoint": path,
                "method": request.method,
                "status_code": 500,
                "response_time_ms": duration_ms,
                "failure_tag": failure_tag,
                "request_id": request_id,
            }
            rabbitmq_publisher.publish(log_entry)
            raise exc

        # 3. Capture response metadata
        duration_ms = round((time.monotonic() - start_time) * 1000, 1)
        failure_tag = getattr(request.state, "observation_failure_type", "none")

        # 4. Publish to RabbitMQ
        log_entry = {
            "timestamp": timestamp,
            "service": "niramay",
            "endpoint": path,
            "method": request.method,
            "status_code": response.status_code,
            "response_time_ms": duration_ms,
            "failure_tag": failure_tag,
            "request_id": request_id,
        }

        rabbitmq_publisher.publish(log_entry)
        return response
