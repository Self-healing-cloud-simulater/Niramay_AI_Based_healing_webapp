import asyncio
from datetime import datetime, timezone

class HealingService:
    """
    Automated Healing Layer. Decides on an action based on anomaly reasons
    and simulates the execution of that action.
    """
    def __init__(self):
        self.rules = {
            "database_error": "restart_service",
            "server_error": "restart_service",
            "high_latency": "retry_request",
            "rate_limit": "throttle_requests"
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
        
    async def execute_healing(self, action: str) -> dict:
        """
        Simulates the execution of a healing action and returns the result.
        """
        if action == "none":
            return {
                "healing_action": "none",
                "status": "skipped",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "message": "No actionable anomaly rule matched."
            }

        # Route to simulated methods
        if action == "restart_service":
            message = await self._sim_restart_service()
        elif action == "retry_request":
            message = await self._sim_retry_request()
        elif action == "throttle_requests":
            message = await self._sim_throttle_requests()
        else:
            message = f"Unknown action simulated successfully: {action}"
            
        return {
            "healing_action": action,
            "status": "success",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": message
        }
        
    async def _sim_restart_service(self) -> str:
        # Simulate time taken to safely drain connections and restart the replica
        await asyncio.sleep(2.0)
        return "Service successfully restarted. Healthy traffic resumed."
        
    async def _sim_retry_request(self) -> str:
        # Simulate forwarding request to a non-degraded node
        await asyncio.sleep(0.5)
        return "Failed request successfully retried and bypassed degraded node."

    async def _sim_throttle_requests(self) -> str:
        # Simulate dynamic rate limit adjustment to shed load
        await asyncio.sleep(0.1)
        return "API Gateway rate-limits temporarily tightened to shed excess load."

# Singleton instance
healing_service = HealingService()
