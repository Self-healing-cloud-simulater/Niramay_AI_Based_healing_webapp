import asyncio
import structlog
from datetime import datetime, timezone
from app.core.failure_config import failure_simulator

logger = structlog.get_logger(__name__)

class HealingService:
    """
    Automated Healing Layer. Decides on an action based on anomaly reasons
    and ACTUALLY executes recovery by disabling the active failure scenarios.
    """
    def __init__(self):
        self.rules = {
            "database_error": "restart_service",
            "server_error": "restart_service",
            "high_latency": "retry_request",
            "rate_limit": "throttle_requests"
        }

        # Maps anomaly reasons to the actual failure simulator scenario names
        self.reason_to_scenario = {
            "database_error": "database_error",
            "server_error": "service_overload",
            "high_latency": "payment_timeout",
            "rate_limit": "rate_limiting"
        }

    def decide_healing_action(self, log: dict) -> str:
        """
        Determines the appropriate healing action based on anomaly reasons.
        If multiple reasons exist, picks the most critical action.
        """
        reasons = log.get("anomaly_reasons", [])
        
        # Priority mapping: restart > throttle > retry > none
        action_priority = {
            "restart_service": 3,
            "throttle_requests": 2,
            "retry_request": 1,
            "none": 0
        }
        
        best_action = "none"
        max_priority = 0
        
        for reason in reasons:
            action = self.rules.get(reason, "none")
            priority = action_priority.get(action, 0)
            if priority > max_priority:
                max_priority = priority
                best_action = action
                
        return best_action
        
    async def execute_healing(self, action: str, log: dict = None) -> dict:
        """
        Executes the healing action by ACTUALLY disabling the failure scenario
        in the failure simulator, then returns the result.
        """
        if action == "none":
            return {
                "healing_action": "none",
                "status": "skipped",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "message": "No actionable anomaly rule matched."
            }

        # Route to execution methods
        if action == "restart_service":
            message = await self._exec_restart_service(log)
        elif action == "retry_request":
            message = await self._exec_retry_request(log)
        elif action == "throttle_requests":
            message = await self._exec_throttle_requests(log)
        else:
            message = f"Unknown action: {action}"
            
        return {
            "healing_action": action,
            "status": "success",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": message
        }
        
    async def _exec_restart_service(self, log: dict = None) -> str:
        """
        ACTUALLY disables the failure scenario that caused the server/database error,
        effectively "restarting" the service back to a healthy state.
        """
        logger.info("🔥 [HEALING] INTERVENTION: Restarting degraded service...")
        
        # Simulate the time it takes to drain connections and reboot
        await asyncio.sleep(2.0)
        
        # ACTUALLY disable the offending failure scenarios
        disabled = []
        reasons = log.get("anomaly_reasons", []) if log else []
        for reason in reasons:
            scenario_name = self.reason_to_scenario.get(reason)
            if scenario_name:
                scenario = failure_simulator.get_scenario(scenario_name)
                if scenario and scenario.enabled:
                    failure_simulator.disable_scenario(scenario_name)
                    disabled.append(scenario_name)
                    logger.info(f"🛠️  [HEALING] Disabled failure scenario: {scenario_name}")
        
        if disabled:
            msg = f"Service restarted. Disabled failure scenarios: {', '.join(disabled)}. Healthy traffic resumed."
        else:
            msg = "Service restarted. No active failure scenarios found to disable."
        
        logger.info(f"✅ [HEALING] SUCCESS: {msg}")
        return msg
    
    async def _exec_retry_request(self, log: dict = None) -> str:
        """
        ACTUALLY disables timeout/latency scenarios to let the retry succeed.
        """
        logger.info("🔥 [HEALING] INTERVENTION: Retrying request on healthy node...")

        await asyncio.sleep(0.5)

        disabled = []
        reasons = log.get("anomaly_reasons", []) if log else []
        for reason in reasons:
            scenario_name = self.reason_to_scenario.get(reason)
            if scenario_name:
                scenario = failure_simulator.get_scenario(scenario_name)
                if scenario and scenario.enabled:
                    failure_simulator.disable_scenario(scenario_name)
                    disabled.append(scenario_name)
                    logger.info(f"🛠️  [HEALING] Disabled failure scenario: {scenario_name}")

        if disabled:
            msg = f"Retry successful. Disabled scenarios: {', '.join(disabled)}. Bypassed degraded node."
        else:
            msg = "Retry successful. Bypassed degraded node."

        logger.info(f"✅ [HEALING] SUCCESS: {msg}")
        return msg

    async def _exec_throttle_requests(self, log: dict = None) -> str:
        """
        ACTUALLY disables rate limiting scenarios to shed the excess load.
        """
        logger.info("🔥 [HEALING] INTERVENTION: Rate limit breached. Disabling rate limiter...")
        
        await asyncio.sleep(0.1)
        
        # Disable the rate_limiting scenario directly
        scenario = failure_simulator.get_scenario("rate_limiting")
        if scenario and scenario.enabled:
            failure_simulator.disable_scenario("rate_limiting")
            logger.info("🛠️  [HEALING] Disabled failure scenario: rate_limiting")
            msg = "Rate limiter disabled. Gateway load successfully shed."
        else:
            msg = "Rate limiter was already inactive. No changes needed."

        logger.info(f"✅ [HEALING] SUCCESS: {msg}")
        return msg

# Singleton instance
healing_service = HealingService()
