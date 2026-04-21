"""
Failure Simulator Configuration
Define all failure types and their simulation parameters.
Retained in the standalone healing layer to generate failures that the
Observation → Detection → Healing pipeline can process.
"""
from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime
import random
import asyncio


class FailureType(str, Enum):
    """Types of API failures that can be simulated"""
    RATE_LIMIT = "rate_limit"
    TIMEOUT = "timeout"
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    SERVER_ERROR = "server_error"
    SERVICE_UNAVAILABLE = "service_unavailable"
    BAD_REQUEST = "bad_request"
    DEPENDENCY = "dependency"
    CONFIGURATION = "configuration"


class FailureScenario(BaseModel):
    """Configuration for a specific failure scenario"""
    enabled: bool = False
    failure_type: FailureType
    probability: float = Field(0.3, ge=0.0, le=1.0)
    endpoints: List[str] = ["*"]
    methods: List[str] = ["GET", "POST", "PUT", "PATCH", "DELETE"]

    # Type-specific parameters
    rate_limit_requests: int = 10
    rate_limit_window: int = 60
    timeout_seconds: float = 5.0
    error_message: Optional[str] = None
    status_code: Optional[int] = None
    name: Optional[str] = None

    # Conditional failures
    only_for_users: Optional[List[str]] = None
    only_for_ips: Optional[List[str]] = None
    time_based: bool = False
    failure_hours: List[int] = []


class FailureSimulatorState(BaseModel):
    """Current state of the failure simulator"""
    enabled: bool = True
    scenarios: Dict[str, FailureScenario] = {}
    global_failure_rate: float = 0.0
    request_count: int = 0
    failure_count: int = 0
    last_updated: datetime = Field(default_factory=datetime.utcnow)


# Default failure scenarios
DEFAULT_SCENARIOS = {
    "rate_limiting": FailureScenario(
        enabled=False,
        failure_type=FailureType.RATE_LIMIT,
        probability=0.5,
        endpoints=["/api/restaurants", "/api/orders"],
        rate_limit_requests=5,
        rate_limit_window=60,
        error_message="Rate limit exceeded. Try again later."
    ),
    "auth_expiration": FailureScenario(
        enabled=False,
        failure_type=FailureType.AUTHENTICATION,
        probability=0.3,
        endpoints=["/api/orders/*", "/api/payments/*"],
        error_message="Your session has expired. Please log in again."
    ),
    "payment_timeout": FailureScenario(
        enabled=False,
        failure_type=FailureType.TIMEOUT,
        probability=0.4,
        endpoints=["/api/payments/*"],
        timeout_seconds=10.0,
        error_message="Payment processing timed out. Please try again."
    ),
    "database_error": FailureScenario(
        enabled=False,
        failure_type=FailureType.SERVER_ERROR,
        probability=0.2,
        endpoints=["/api/v1/restaurants/*", "/api/v1/orders/*"],
        error_message="Database connection error. Please try again later."
    ),
    "validation_error": FailureScenario(
        enabled=False,
        failure_type=FailureType.BAD_REQUEST,
        probability=0.3,
        endpoints=["/api/v1/orders", "/api/v1/cart/items"],
        error_message="Invalid request data. Please check your input."
    ),
    "stripe_dependency": FailureScenario(
        enabled=False,
        failure_type=FailureType.DEPENDENCY,
        probability=0.5,
        endpoints=["/api/v1/payments/*"],
        error_message="Payment service temporarily unavailable."
    ),
    "maps_dependency": FailureScenario(
        enabled=False,
        failure_type=FailureType.DEPENDENCY,
        probability=0.4,
        endpoints=["/api/v1/delivery/*", "/api/v1/maps/*"],
        error_message="Location service temporarily unavailable."
    ),
    "config_error": FailureScenario(
        enabled=False,
        failure_type=FailureType.CONFIGURATION,
        probability=0.2,
        endpoints=["/api/v1/webhooks/*"],
        error_message="Service configuration error. Contact support."
    ),
    "service_overload": FailureScenario(
        enabled=False,
        failure_type=FailureType.SERVICE_UNAVAILABLE,
        probability=0.3,
        endpoints=["*"],
        error_message="Service temporarily overloaded. Please try again later."
    ),
}


class FailureSimulator:
    """
    Core failure simulation engine.
    Injects failures into API requests based on configured scenarios.
    """

    def __init__(self):
        scenarios = DEFAULT_SCENARIOS.copy()
        for name, scenario in scenarios.items():
            scenario.name = name

        self.state = FailureSimulatorState(scenarios=scenarios)
        self._request_counters: Dict[str, Dict[str, int]] = {}
        self._lock = asyncio.Lock()

    def enable_scenario(self, name: str) -> None:
        if name in self.state.scenarios:
            self.state.scenarios[name].enabled = True
            self.state.last_updated = datetime.utcnow()

    def disable_scenario(self, name: str) -> None:
        if name in self.state.scenarios:
            self.state.scenarios[name].enabled = False
            self.state.last_updated = datetime.utcnow()

    def update_scenario(self, name: str, **kwargs) -> None:
        if name in self.state.scenarios:
            scenario = self.state.scenarios[name]
            for key, value in kwargs.items():
                if hasattr(scenario, key):
                    setattr(scenario, key, value)
            self.state.last_updated = datetime.utcnow()

    def get_scenario(self, name: str) -> Optional[FailureScenario]:
        return self.state.scenarios.get(name)

    def list_scenarios(self) -> Dict[str, FailureScenario]:
        return self.state.scenarios

    def reset_all(self) -> None:
        for scenario in self.state.scenarios.values():
            scenario.enabled = False
        self.state.global_failure_rate = 0.0
        self.state.last_updated = datetime.utcnow()

    def should_fail_request(
        self,
        endpoint: str,
        method: str,
        user_id: Optional[str] = None,
        client_ip: Optional[str] = None
    ) -> Optional[FailureScenario]:
        if not self.state.enabled:
            return None

        if self.state.global_failure_rate > 0:
            if random.random() < self.state.global_failure_rate:
                return FailureScenario(
                    enabled=True,
                    failure_type=FailureType.SERVER_ERROR,
                    probability=1.0,
                    error_message="Random failure triggered by global setting"
                )

        for scenario in self.state.scenarios.values():
            if not scenario.enabled:
                continue

            endpoint_match = False
            for pattern in scenario.endpoints:
                if pattern == "*" or endpoint.startswith(pattern.replace("*", "")):
                    endpoint_match = True
                    break

            if not endpoint_match:
                continue

            if method.upper() not in [m.upper() for m in scenario.methods]:
                continue

            if scenario.only_for_users and user_id not in scenario.only_for_users:
                continue

            if scenario.only_for_ips and client_ip not in scenario.only_for_ips:
                continue

            if scenario.time_based and scenario.failure_hours:
                current_hour = datetime.utcnow().hour
                if current_hour not in scenario.failure_hours:
                    continue

            if random.random() < scenario.probability:
                return scenario

        return None

    async def check_rate_limit(self, key: str, scenario: FailureScenario) -> bool:
        async with self._lock:
            now = datetime.utcnow().timestamp()
            window_start = now - scenario.rate_limit_window

            if key not in self._request_counters:
                self._request_counters[key] = {}

            self._request_counters[key] = {
                ts: count for ts, count in self._request_counters[key].items()
                if float(ts) > window_start
            }

            total_requests = sum(self._request_counters[key].values())

            if total_requests >= scenario.rate_limit_requests:
                return True

            current_ts = str(int(now))
            self._request_counters[key][current_ts] = self._request_counters[key].get(current_ts, 0) + 1

            return False

    def record_request(self, failed: bool = False) -> None:
        self.state.request_count += 1
        if failed:
            self.state.failure_count += 1

    def get_metrics(self) -> Dict[str, Any]:
        total = self.state.request_count
        failures = self.state.failure_count
        return {
            "total_requests": total,
            "failed_requests": failures,
            "success_rate": ((total - failures) / total * 100) if total > 0 else 100.0,
            "failure_rate": (failures / total * 100) if total > 0 else 0.0,
            "active_scenarios": sum(1 for s in self.state.scenarios.values() if s.enabled),
            "total_scenarios": len(self.state.scenarios),
            "last_updated": self.state.last_updated.isoformat()
        }


# Global failure simulator instance
failure_simulator = FailureSimulator()
