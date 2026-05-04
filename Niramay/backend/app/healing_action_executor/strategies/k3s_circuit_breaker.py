"""
K3s Circuit Breaker Strategy
==============================

Implements the `circuit_breaker` healing action for K3s clusters.

Mechanism:
    "Open" the circuit by scaling the Crave backend Deployment to 0 replicas.
    This immediately terminates all pods and stops all traffic to the service.

    After K3S_CIRCUIT_BREAKER_DURATION_SECONDS (default 30s), the circuit
    "closes" by restoring the original replica count. K3s then creates
    fresh pods with clean middleware state.

    This is the nuclear option — complete isolation of the service.
    Used only for cascading failures that spread across multiple endpoints.

When used:
    - Cascading failure pattern detected (server_error + high_latency together)
    - Multiple downstream services failing simultaneously
"""
import asyncio
import structlog
from datetime import datetime, timezone
from typing import Dict, Any
from app.healing_action_executor.strategies.base import BaseHealingStrategy
from app.shared.k3s_client import get_apps_v1
from app.core.config import settings

logger = structlog.get_logger(__name__)


class K3sCircuitBreakerStrategy(BaseHealingStrategy):
    """
    K3s implementation of `circuit_breaker`.

    Scales Deployment to 0 (circuit open) → waits → restores (circuit close).
    """

    async def execute(
        self, machine_alert: Dict[str, Any]
    ) -> Dict[str, Any]:
        service = machine_alert.get("service", "unknown")
        alert_id = machine_alert.get("alert_id", "unknown")

        logger.info(
            "K3sCircuitBreakerStrategy: starting",
            service=service,
            alert_id=alert_id,
        )

        apps = get_apps_v1()
        if apps is None:
            return self._failure(
                healing_action="circuit_breaker",
                message="K3s client unavailable — cannot open circuit",
                error="K3s AppsV1Api returned None.",
                service=service,
            )

        deployment_name = settings.K3S_CRAVE_DEPLOYMENT_NAME
        namespace = settings.K3S_NAMESPACE
        duration = settings.K3S_CIRCUIT_BREAKER_DURATION_SECONDS

        try:
            # Read current replica count (to restore later)
            deployment = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: apps.read_namespaced_deployment(
                    name=deployment_name,
                    namespace=namespace,
                )
            )
            original_replicas = deployment.spec.replicas or 1

            # ── Step 1: Open circuit — scale to 0 ────────────────────────
            patch_zero = {"spec": {"replicas": 0}}

            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: apps.patch_namespaced_deployment(
                    name=deployment_name,
                    namespace=namespace,
                    body=patch_zero,
                )
            )

            opened_at = datetime.now(timezone.utc).isoformat()
            logger.info(
                "K3sCircuitBreakerStrategy: circuit OPENED (scaled to 0)",
                deployment=deployment_name,
                original_replicas=original_replicas,
            )

            # ── Step 2: Wait for circuit breaker duration ─────────────────
            logger.info(
                "K3sCircuitBreakerStrategy: holding circuit open",
                duration_seconds=duration,
            )
            await asyncio.sleep(duration)

            # ── Step 3: Close circuit — restore replicas ──────────────────
            patch_restore = {"spec": {"replicas": original_replicas}}

            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: apps.patch_namespaced_deployment(
                    name=deployment_name,
                    namespace=namespace,
                    body=patch_restore,
                )
            )

            restored_at = datetime.now(timezone.utc).isoformat()
            logger.info(
                "K3sCircuitBreakerStrategy: circuit CLOSED (restored)",
                deployment=deployment_name,
                restored_replicas=original_replicas,
            )

            return self._success(
                healing_action="circuit_breaker",
                message=(
                    f"Circuit breaker for '{deployment_name}': "
                    f"scaled to 0 for {duration}s, then restored "
                    f"to {original_replicas} replicas."
                ),
                service=service,
                previous_replicas=original_replicas,
                zero_duration_seconds=duration,
                opened_at=opened_at,
                restored_at=restored_at,
            )

        except Exception as e:
            logger.error(
                "K3sCircuitBreakerStrategy: failed",
                deployment=deployment_name,
                error=str(e),
            )
            return self._failure(
                healing_action="circuit_breaker",
                message=(
                    f"K3s circuit breaker failed for "
                    f"'{deployment_name}'"
                ),
                error=str(e),
                service=service,
            )
