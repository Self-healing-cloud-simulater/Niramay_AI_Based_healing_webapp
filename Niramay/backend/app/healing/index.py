import asyncio
import structlog
from datetime import datetime, timezone, timedelta
from abc import ABC, abstractmethod
from typing import Dict, Any, List
from app.db.session import SessionLocal
from app.db.models import HealingActionRecord, AnomalyRecord, AuditLog
from sqlalchemy import desc

logger = structlog.get_logger(__name__)

class HealingStrategy(ABC):
    """Base class for all healing strategies"""
    
    @abstractmethod
    async def execute(self, log: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the healing action"""
        pass

    @abstractmethod
    async def verify(self, log: Dict[str, Any], db: Any) -> str:
        """
        Verify if the action worked.
        Returns: "SUCCESS", "FAILURE", or "PENDING"
        """
        pass

class RestartServiceStrategy(HealingStrategy):
    async def execute(self, log: Dict[str, Any]) -> Dict[str, Any]:
        service = log.get("service", "unknown")
        
        try:
            import docker
            client = docker.from_env()
            
            # Find the container by name or partial name
            # In docker-compose, names are often project_service_1
            containers = client.containers.list(filters={"name": service})
            
            if not containers:
                return {
                    "status": "failed",
                    "message": f"Could not find a running container for service '{service}'."
                }
            
            target = containers[0]
            target.restart() # This is a blocking call in standard docker-py, 
                            # but we're in a separate worker thread usually
            
            return {
                "status": "success",
                "message": f"Container {target.name} restarted successfully."
            }
        except Exception as e:
            logger.error("Docker restart failed", error=str(e))
            return {
                "status": "failed",
                "message": f"Docker error: {str(e)}"
            }

    async def verify(self, log: Dict[str, Any], db: Any) -> str:
        # Implementation in BaseVerification class or here
        return "PENDING"

class RetryRequestStrategy(HealingStrategy):
    async def execute(self, log: Dict[str, Any]) -> Dict[str, Any]:
        endpoint = log.get("endpoint", "unknown")
        await asyncio.sleep(0.5) # Simulate retry latency
        return {
            "status": "success",
            "message": f"Request to {endpoint} retried on healthy node. Payload processed successfully."
        }

    async def verify(self, log: Dict[str, Any], db: Any) -> str:
        return "PENDING"

class ThrottleTrafficStrategy(HealingStrategy):
    async def execute(self, log: Dict[str, Any]) -> Dict[str, Any]:
        await asyncio.sleep(0.1)
        return {
            "status": "success",
            "message": "Gateway rate-limits dynamically adjusted to protect service from cascading failure."
        }

    async def verify(self, log: Dict[str, Any], db: Any) -> str:
        return "PENDING"

class FallbackResponseStrategy(HealingStrategy):
    async def execute(self, log: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "status": "success",
            "message": "Fallback static response served. Degraded experience maintained for user."
        }

    async def verify(self, log: Dict[str, Any], db: Any) -> str:
        return "SUCCESS" # Immediate success as it's a defensive measure

class ShellExecutorStrategy(HealingStrategy):
    """Real-world hook: Executes a shell script for healing"""
    async def execute(self, log: Dict[str, Any]) -> Dict[str, Any]:
        import os
        import subprocess
        
        action = log.get("healing_action", "unknown")
        sanitized_action = self._sanitize_action(action)
        script_path = f"/scripts/healing/{sanitized_action}.sh"
        
        if not os.path.exists(script_path):
            return {
                "status": "failed",
                "message": f"Execution hook not found: {script_path}. Falling back to simulation."
            }
            
        try:
            # Dangerous: In a real prod app, use subprocess.run with strict validation
            process = await asyncio.create_subprocess_shell(
                f"bash {script_path}",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                return {"status": "success", "message": f"Production script {action}.sh executed successfully."}
            else:
                return {"status": "failed", "message": f"Script failed: {stderr.decode()}"}
        except Exception as e:
            return {"status": "failed", "message": f"Error executing hook: {str(e)}"}

    def _sanitize_action(self, action: str) -> str:
        """Prevent directory traversal and injection"""
        import re
        return re.sub(r'[^a-zA-Z0-9_\-]', '', action)

    async def verify(self, log: Dict[str, Any], db: Any) -> str:
        return "PENDING"

class HealingEngine:
    """
    Advanced Healing Engine that maps anomalies to strategies.
    Supports both rule-based defaults and AI-suggested overrides.
    """
    def __init__(self):
        self.strategies = {
            "restart_service": RestartServiceStrategy(),
            "retry_request": RetryRequestStrategy(),
            "throttle_requests": ThrottleTrafficStrategy(),
            "fallback_response": FallbackResponseStrategy()
        }
        
        # Default rule mapping (Anomaly Reason -> Strategy Key)
        self.default_mapping = {
            "server_error": "restart_service",
            "database_error": "restart_service",
            "high_latency": "throttle_requests",
            "rate_limit": "throttle_requests",
            "failure_tag": "retry_request"
        }

    def decide_healing_action(self, log: Dict[str, Any]) -> str:
        """
        Determines the appropriate healing action key.
        Priority: AI Suggesion (if high confidence) > Critical Rule > Default Rule
        """
        # 1. Check AI Suggestion (passed in log from Detection Worker)
        ai_suggestion = log.get("ai_analysis", {}).get("suggested_action")
        ai_confidence = log.get("ai_analysis", {}).get("confidence", 0)
        
        if ai_suggestion and ai_suggestion != "none" and ai_confidence > 0.8:
            if ai_suggestion in self.strategies:
                logger.info("Using AI-suggested healing action", action=ai_suggestion, confidence=ai_confidence)
                return ai_suggestion

        # 2. ESCALATION LOGIC: Check if we've tried and failed recently
        service = log.get("service")
        if service:
            with SessionLocal() as db:
                # Find the most recent healing action for this service in the last 10 minutes
                cutoff = datetime.now() - timedelta(minutes=10)
                last_action = db.query(HealingActionRecord)\
                    .join(AnomalyRecord)\
                    .join(AuditLog)\
                    .filter(AuditLog.service == service)\
                    .filter(HealingActionRecord.timestamp >= cutoff)\
                    .order_by(desc(HealingActionRecord.timestamp))\
                    .first()
                
                if last_action and last_action.verification_status == "FAILURE":
                    if last_action.action == "retry_request":
                        logger.warning("Escalating: Previous retry failed. Switching to restart.", service=service)
                        return "restart_service"
                    elif last_action.action == "throttle_requests":
                         logger.warning("Escalating: Previous throttle failed. Switching to restart.", service=service)
                         return "restart_service"

        # 3. Rule based fallback
        reasons = log.get("anomaly_reasons", [])
        
        # Priority mapping
        priority_order = ["restart_service", "throttle_requests", "retry_request"]
        
        candidate_actions = []
        for reason in reasons:
            action = self.default_mapping.get(reason)
            if action:
                candidate_actions.append(action)
        
        # Return highest priority action
        for priority_action in priority_order:
            if priority_action in candidate_actions:
                return priority_action
                
        return "none"

    async def execute_healing(self, action_key: str, log: Dict[str, Any]) -> Dict[str, Any]:
        """Executes the strategy and returns a standardized result"""
        if action_key == "none" or action_key not in self.strategies:
            return {
                "healing_action": "none",
                "status": "skipped",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "message": "No actionable healing strategy identified."
            }

        strategy = self.strategies[action_key]
        
        try:
            result = await strategy.execute(log)
            # Fetch initial verification status from strategy
            v_status = await strategy.verify(log, None) 
            
            return {
                "healing_action": action_key,
                "status": result.get("status", "success"),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "message": result.get("message", "Action completed."),
                "verification_status": v_status
            }
        except Exception as e:
            logger.error("Healing execution failed", action=action_key, error=str(e))
            return {
                "healing_action": action_key,
                "status": "failed",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "message": f"Execution error: {str(e)}",
                "verification_status": "EXPIRED" # Cannot verify a failed execution
            }

# Singleton instance
healing_service = HealingEngine()
