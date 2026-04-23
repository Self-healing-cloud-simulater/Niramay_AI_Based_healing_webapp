"""
FastAPI Middleware for Failure Injection
Intercepts requests and applies failure scenarios
"""
import asyncio
import time
import random
from typing import Optional
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.simulation.failure_config import failure_simulator, FailureType
from app.core.logging import logger


class FailureSimulationMiddleware(BaseHTTPMiddleware):
    """
    Middleware that intercepts HTTP requests and injects failures
    based on configured scenarios
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        endpoint = request.url.path
        method = request.method
        client_ip = request.client.host if request.client else "unknown"

        # Skip management and health paths to avoid breaking the dashboard itself
        from app.observation.middleware import _EXCLUDED_PATHS
        if endpoint in _EXCLUDED_PATHS:
            return await call_next(request)

        scenario = failure_simulator.should_fail_request(
            endpoint=endpoint,
            method=method,
            client_ip=client_ip
        )

        if scenario:
            request.state.observation_failure_type = scenario.name or scenario.failure_type.value
            logger.info(
                f"Injecting failure: {scenario.name or scenario.failure_type.value} for {method} {endpoint}"
            )
            failure_simulator.record_request(failed=True)
            return await self._inject_failure(request, scenario, client_ip)

        failure_simulator.record_request(failed=False)
        return await call_next(request)

    async def _inject_failure(self, request: Request, scenario, client_ip: str) -> Response:
        failure_type = scenario.failure_type

        if failure_type == FailureType.RATE_LIMIT:
            return await self._inject_rate_limit(request, scenario, client_ip)
        elif failure_type == FailureType.TIMEOUT:
            return await self._inject_timeout(scenario)
        elif failure_type == FailureType.AUTHENTICATION:
            return self._inject_auth_failure(scenario)
        elif failure_type == FailureType.AUTHORIZATION:
            return self._inject_forbidden(scenario)
        elif failure_type == FailureType.SERVER_ERROR:
            return self._inject_server_error(scenario)
        elif failure_type == FailureType.SERVICE_UNAVAILABLE:
            return self._inject_service_unavailable(scenario)
        elif failure_type == FailureType.BAD_REQUEST:
            return self._inject_bad_request(scenario)
        elif failure_type == FailureType.DEPENDENCY:
            return self._inject_dependency_failure(scenario)
        elif failure_type == FailureType.CONFIGURATION:
            return self._inject_config_error(scenario)

        return self._inject_server_error(scenario)

    async def _inject_rate_limit(self, request, scenario, client_ip: str) -> Response:
        endpoint = request.url.path
        key = f"{client_ip}:{endpoint}"
        is_limited = await failure_simulator.check_rate_limit(key, scenario)

        return JSONResponse(
            status_code=429,
            content={
                "error": "RateLimitExceeded",
                "message": scenario.error_message or "Rate limit exceeded.",
                "retry_after": scenario.rate_limit_window
            },
            headers={"Retry-After": str(scenario.rate_limit_window)}
        )

    async def _inject_timeout(self, scenario) -> Response:
        delay = scenario.timeout_seconds or random.uniform(5, 15)
        await asyncio.sleep(min(delay, 3.0))  # Cap at 3s for demo responsiveness
        return JSONResponse(
            status_code=504,
            content={
                "error": "GatewayTimeout",
                "message": scenario.error_message or "Request timed out.",
                "timeout_seconds": delay
            }
        )

    def _inject_auth_failure(self, scenario) -> Response:
        return JSONResponse(
            status_code=401,
            content={
                "error": "Unauthorized",
                "message": scenario.error_message or "Authentication required.",
            },
            headers={"WWW-Authenticate": "Bearer"}
        )

    def _inject_forbidden(self, scenario) -> Response:
        return JSONResponse(
            status_code=403,
            content={
                "error": "Forbidden",
                "message": scenario.error_message or "You don't have permission.",
            }
        )

    def _inject_server_error(self, scenario) -> Response:
        msgs = [
            "Internal server error occurred.",
            "Database connection failed.",
            "Unexpected error processing request.",
        ]
        return JSONResponse(
            status_code=500,
            content={
                "error": "InternalServerError",
                "message": scenario.error_message or random.choice(msgs),
                "request_id": f"req_{random.randint(10000, 99999)}",
                "timestamp": time.time()
            }
        )

    def _inject_service_unavailable(self, scenario) -> Response:
        return JSONResponse(
            status_code=503,
            content={
                "error": "ServiceUnavailable",
                "message": scenario.error_message or "Service temporarily unavailable.",
                "retry_after": 30
            },
            headers={"Retry-After": "30"}
        )

    def _inject_bad_request(self, scenario) -> Response:
        return JSONResponse(
            status_code=400,
            content={
                "error": "BadRequest",
                "message": scenario.error_message or "Invalid request data.",
            }
        )

    def _inject_dependency_failure(self, scenario) -> Response:
        errors = [
            {"status": 502, "error": "BadGateway", "message": "External service returned invalid response."},
            {"status": 503, "error": "ServiceUnavailable", "message": "External service temporarily unavailable."},
            {"status": 504, "error": "GatewayTimeout", "message": "External service did not respond in time."},
        ]
        error = random.choice(errors)
        return JSONResponse(
            status_code=error["status"],
            content={
                "error": error["error"],
                "message": scenario.error_message or error["message"],
                "dependency": "external_service",
            },
            headers={"Retry-After": "60"}
        )

    def _inject_config_error(self, scenario) -> Response:
        return JSONResponse(
            status_code=500,
            content={
                "error": "ConfigurationError",
                "message": scenario.error_message or "Service configuration error.",
            }
        )
