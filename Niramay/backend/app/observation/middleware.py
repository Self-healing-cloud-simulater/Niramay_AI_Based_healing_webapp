import time
import uuid
from datetime import datetime, timezone
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.observation.store import observation_store

# Paths to exclude from observation (avoid recursive noise)
_EXCLUDED_PATHS = {
    "/api/v1/observation/logs",
    "/api/v1/detection/anomalies",
    "/api/v1/healing/actions",
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
    Captures API request-response data for the Observation Layer.
    Acts as a 'CCTV camera' for all API traffic.

    Emits log dictionaries using canonical field names that align with
    the ObservationLog Pydantic schema (e.g., 'response_time' not 'response_time_ms',
    'service' not 'service_name').
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
            failure_type = getattr(request.state, "observation_failure_type", "none")

            log_entry = {
                "timestamp": timestamp,
                "endpoint": path,
                "method": request.method,
                "status_code": 500,
                "response_time": duration_ms,
                "request_id": request_id,
                "service": "niramay",
                "failure_type": failure_type
            }
            await observation_store.push_log(log_entry)
            raise exc

        # 3. Capture response metadata
        duration_ms = round((time.monotonic() - start_time) * 1000, 1)
        failure_type = getattr(request.state, "observation_failure_type", "none")

        # 4. Record the log
        log_entry = {
            "timestamp": timestamp,
            "endpoint": path,
            "method": request.method,
            "status_code": response.status_code,
            "response_time": duration_ms,
            "request_id": request_id,
            "service": "niramay",
            "failure_type": failure_type
        }

        await observation_store.push_log(log_entry)
        return response
