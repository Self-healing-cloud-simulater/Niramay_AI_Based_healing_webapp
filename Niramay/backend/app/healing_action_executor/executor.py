"""
Healing Action Executor

Main Component A class. Receives a machine alert
from the Dispatcher Worker and executes the
appropriate healing strategy.

This is the single entry point for all healing
execution. The Dispatcher Worker calls
HealingActionExecutor.execute() and receives back
a standardized result dict.

Strategy routing:
    restart_service   → RestartServiceStrategy
    escalate_only     → EscalateOnlyStrategy
    none              → NoopStrategy
    (all others)      → StubStrategy (Phase 2)

All strategies return the same result dict structure.
The executor never raises exceptions.
"""
import asyncio
import structlog
from typing import Dict, Any
from app.shared.healing_vocabulary import (
    VALID_ACTIONS,
    coerce_action,
)
from app.healing_action_executor.strategies.restart import (
    RestartServiceStrategy,
)
from app.healing_action_executor.strategies.escalate import (
    EscalateOnlyStrategy,
)
from app.healing_action_executor.strategies.noop import (
    NoopStrategy,
)
from app.healing_action_executor.strategies.stub import (
    StubStrategy,
)
from app.core.config import settings

logger = structlog.get_logger(__name__)

# Strategy registry
# Maps vocabulary action names to strategy instances
_STRATEGY_REGISTRY: Dict[str, Any] = {
    "restart_service": RestartServiceStrategy(),
    "escalate_only": EscalateOnlyStrategy(),
    "none": NoopStrategy(),
    # Phase 2 stubs
    "throttle_requests": StubStrategy("throttle_requests"),
    "flush_cache": StubStrategy("flush_cache"),
    "scale_up": StubStrategy("scale_up"),
    "circuit_breaker": StubStrategy("circuit_breaker"),
    "rollback_deployment": StubStrategy("rollback_deployment"),
}


class HealingActionExecutor:
    """
    Main Component A executor.

    Receives machine alert from Dispatcher Worker.
    Routes to correct strategy based on
    recommended_action field.
    Returns standardized result dict.

    Never raises exceptions. If anything unexpected
    happens, returns a failed result with clear error.
    """

    async def execute(
        self,
        machine_alert: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute the healing action for the given alert.

        Args:
            machine_alert: The full machine alert dict
                from the Analyser Worker. Must contain
                recommended_action field.

        Returns:
            Result dict with at minimum:
                healing_action: str
                status: "success" | "failed"
                message: str
                error: str | None
                executed_at: ISO8601 str
        """
        alert_id = machine_alert.get("alert_id", "unknown")

        # Get and validate the recommended action
        raw_action = machine_alert.get(
            "recommended_action", "none"
        )
        action = coerce_action(raw_action)

        if action != raw_action:
            logger.warning(
                "HealingActionExecutor: action coerced "
                "to vocabulary value",
                original=raw_action,
                coerced=action,
                alert_id=alert_id
            )

        logger.info(
            "HealingActionExecutor: executing",
            action=action,
            service=machine_alert.get("service"),
            severity=machine_alert.get("severity"),
            alert_id=alert_id,
        )

        # Get the strategy
        strategy = _STRATEGY_REGISTRY.get(action)
        if strategy is None:
            # Should never happen if coerce_action works
            # but handle defensively
            logger.error(
                "HealingActionExecutor: no strategy "
                "found for action",
                action=action,
                alert_id=alert_id,
            )
            from datetime import datetime, timezone
            return {
                "healing_action": action,
                "status": "failed",
                "message": f"No strategy registered "
                           f"for action: {action}",
                "error": "Missing strategy",
                "executed_at": datetime.now(
                    timezone.utc).isoformat(),
                "service": machine_alert.get("service"),
                "container_restarted": None,
                "scenarios_disabled": [],
            }

        # Execute with timeout
        try:
            result = await asyncio.wait_for(
                strategy.execute(machine_alert),
                timeout=settings.COMPONENT_A_TIMEOUT_SECONDS
            )
            logger.info(
                "HealingActionExecutor: complete",
                action=action,
                status=result.get("status"),
                alert_id=alert_id,
            )
            return result

        except asyncio.TimeoutError:
            logger.error(
                "HealingActionExecutor: execution timed out",
                action=action,
                timeout=settings.COMPONENT_A_TIMEOUT_SECONDS,
                alert_id=alert_id,
            )
            from datetime import datetime, timezone
            return {
                "healing_action": action,
                "status": "failed",
                "message": f"Healing action timed out "
                           f"after "
                           f"{settings.COMPONENT_A_TIMEOUT_SECONDS}s",
                "error": "Timeout",
                "executed_at": datetime.now(
                    timezone.utc).isoformat(),
                "service": machine_alert.get("service"),
                "container_restarted": None,
                "scenarios_disabled": [],
            }
        except Exception as e:
            logger.error(
                "HealingActionExecutor: unexpected error",
                action=action,
                error=str(e),
                alert_id=alert_id,
            )
            from datetime import datetime, timezone
            return {
                "healing_action": action,
                "status": "failed",
                "message": "Unexpected error during healing",
                "error": str(e),
                "executed_at": datetime.now(
                    timezone.utc).isoformat(),
                "service": machine_alert.get("service"),
                "container_restarted": None,
                "scenarios_disabled": [],
            }


# Singleton instance for use by Dispatcher Worker
healing_executor = HealingActionExecutor()
