import httpx
import json
import structlog
from app.core.config import settings
from typing import Dict, Any, Optional

logger = structlog.get_logger(__name__)

class CausalEngine:
    """
    AI-Powered Causal Engine.
    Uses a local Ollama instance (LLaMA3) to perform Root Cause Analysis (RCA) 
    on detected anomalies.
    """
    
    def __init__(self):
        self.url = settings.OLLAMA_URL
        self.model = settings.OLLAMA_MODEL
        self.enabled = settings.ENABLE_AI_CAUSAL

    async def analyze(self, log: Dict[str, Any]) -> Dict[str, Any]:
        """
        Performs RCA on an anomaly log.
        Falls back to rule-based analysis if LLM is disabled or fails.
        """
        if not self.enabled:
            return self._rule_based_fallback(log)

        try:
            prompt = self._build_prompt(log)
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    self.url,
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "stream": False,
                        "format": "json"
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    ai_response = json.loads(result.get("response", "{}"))
                    return {
                        "root_cause": ai_response.get("root_cause", "Unknown (AI Parsing Error)"),
                        "confidence": ai_response.get("confidence", 0.5),
                        "suggested_action": ai_response.get("suggested_action", "Investigate manually"),
                        "analysis_type": "ai_llm"
                    }
                else:
                    logger.warning("Ollama API returned error", status=response.status_code)
                    return self._rule_based_fallback(log)

        except Exception as e:
            logger.error("Causal Engine AI analysis failed", error=str(e))
            return self._rule_based_fallback(log)

    def _build_prompt(self, log: Dict[str, Any]) -> str:
        """Constructs the prompt for the LLM"""
        return f"""
        You are an expert SRE and system architect. Analyze the following anomaly detected in a backend service and provide a root cause analysis in JSON format.
        
        LOG DATA:
        - Service: {log.get('service')}
        - Endpoint: {log.get('endpoint')}
        - Status Code: {log.get('status_code')}
        - Response Time: {log.get('response_time')}ms
        - Failure Type: {log.get('failure_type')}
        - Anomaly Reasons: {log.get('anomaly_reasons')}
        - Metadata: {log.get('metadata')}
        
        INSTRUCTIONS:
        1. Identify the most likely root cause.
        2. Assign a confidence score between 0.0 and 1.0.
        3. Suggest a technical healing action (e.g., restart_service, flush_cache, scale_up, etc.).
        4. Return ONLY a valid JSON object with the keys: "root_cause", "confidence", "suggested_action".
        
        Example Output:
        {{
            "root_cause": "Database connection pool exhaustion due to high concurrent traffic.",
            "confidence": 0.95,
            "suggested_action": "restart_service"
        }}
        """

    def _rule_based_fallback(self, log: Dict[str, Any]) -> Dict[str, Any]:
        """Simple rule-based RCA for when the LLM is unavailable"""
        reasons = log.get("anomaly_reasons", [])
        
        root_cause = "Unknown behavioral anomaly"
        suggested_action = "none"
        
        if "server_error" in reasons:
            root_cause = "Internal server error (5xx) detected in service logic or database."
            suggested_action = "restart_service"
        elif "high_latency" in reasons:
            root_cause = "Service degradation or resource bottleneck causing increased response times."
            suggested_action = "throttle_requests"
        elif "rate_limit" in reasons:
            root_cause = "External or internal client exceeding API rate limits."
            suggested_action = "throttle_requests"
            
        return {
            "root_cause": root_cause,
            "confidence": 0.7,
            "suggested_action": suggested_action,
            "analysis_type": "rule_fallback"
        }

# Singleton instance
causal_engine = CausalEngine()
