import httpx
import json
import structlog
from app.core.config import settings
from app.shared.healing_vocabulary import (
    HEALING_ACTIONS,
    coerce_action,
)
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
                    raw_action = ai_response.get("suggested_action", "none")
                    validated_action = coerce_action(raw_action)
                    if validated_action != raw_action:
                        logger.warning(
                            "LLM returned action outside vocabulary, coerced",
                            returned=raw_action,
                            coerced_to=validated_action,
                        )
                    return {
                        "root_cause": ai_response.get(
                            "root_cause", "Unknown (AI Parsing Error)"
                        ),
                        "confidence": ai_response.get("confidence", 0.5),
                        "suggested_action": validated_action,
                        "analysis_type": "ai_llm",
                    }
                else:
                    logger.warning("Ollama API returned error", status=response.status_code)
                    return self._rule_based_fallback(log)

        except Exception as e:
            logger.error("Causal Engine AI analysis failed", error=str(e))
            return self._rule_based_fallback(log)

    def _build_prompt(self, log: Dict[str, Any]) -> str:
        """Constructs the prompt for the LLM with enriched Stage 2 context"""
        vocab_block = "\n".join(
            f"       - {k}: {v}"
            for k, v in HEALING_ACTIONS.items()
        )
        return f"""
        You are an expert SRE and system architect. Analyze the following anomaly detected in a backend service and provide a root cause analysis in JSON format.

        LOG DATA:
        - Service: {log.get('service')}
        - Endpoint: {log.get('endpoint')}
        - Status Code: {log.get('status_code')}
        - Response Time: {log.get('response_time_ms', log.get('response_time'))}ms
        - Failure Tag: {log.get('failure_tag', log.get('failure_type'))}
        - Anomaly Reasons: {log.get('anomaly_reasons')}
        - Engines Triggered: {log.get('engines_triggered', [])}
        - Anomaly Score: {log.get('anomaly_score', 'N/A')}
        - Severity: {log.get('severity', 'N/A')}
        - Metadata: {log.get('metadata')}

        INSTRUCTIONS:
        1. Identify the most likely root cause considering all triggered detection engines.
        2. Assign a confidence score between 0.0 and 1.0.
        3. Suggest a technical healing action. You MUST pick exactly
           ONE value from this allowed vocabulary:
{vocab_block}
           Do not invent new action names. Do not return phrases or
           sentences. Return only the single action key.
        4. Return ONLY a valid JSON object with the keys: "root_cause", "confidence", "suggested_action".

        Example Output:
        {{
            "root_cause": "Database connection pool exhaustion due to high concurrent traffic.",
            "confidence": 0.95,
            "suggested_action": "restart_service"
        }}
        """

    def _rule_based_fallback(self, log: Dict[str, Any]) -> Dict[str, Any]:
        """
        Rule-based RCA for when the LLM is unavailable.

        Two-priority routing:
            Priority 1: failure_tag (set by FailureSimulationMiddleware)
                Maps specific Crave failure types to K3s healing actions.
            Priority 2: anomaly_reasons (ChaosMiddleware has no failure_tag)
                Uses detected anomaly signals to infer best action.
        """
        reasons = log.get("anomaly_reasons", [])
        failure_tag = log.get("failure_tag", "none") or "none"

        # ── Priority 1: failure_tag routing ───────────────────────────
        # FailureSimulationMiddleware sets this field on every injected
        # failure. This is the most reliable signal.
        _TAG_MAP = {
            "service_overload": (
                "Service overload: high error rate across all endpoints",
                0.85, "scale_up",
            ),
            "config_error": (
                "Configuration error: service misconfiguration detected",
                0.85, "rollback_deployment",
            ),
            "database_error": (
                "Database layer failure causing 500 errors",
                0.80, "restart_service",
            ),
            "payment_timeout": (
                "Payment service dependency timeout (504)",
                0.80, "restart_service",
            ),
            "stripe_dependency": (
                "Stripe payment gateway unreachable",
                0.80, "restart_service",
            ),
            "maps_dependency": (
                "Maps service dependency failure",
                0.80, "restart_service",
            ),
            "rate_limiting": (
                "API rate limit breach detected (429)",
                0.85, "throttle_requests",
            ),
        }

        if failure_tag in _TAG_MAP:
            root_cause, confidence, action = _TAG_MAP[failure_tag]
            return {
                "root_cause": root_cause,
                "confidence": confidence,
                "suggested_action": action,
                "analysis_type": "rule_fallback",
            }

        # ── Priority 2: anomaly_reasons routing ──────────────────────
        # ChaosMiddleware does NOT set failure_tag, so we rely on
        # the anomaly signals detected by the Detection Worker.

        if "server_error" in reasons and "high_latency" in reasons:
            return {
                "root_cause": "Resource exhaustion or cascading failure "
                              "(concurrent server errors and high latency)",
                "confidence": 0.70,
                "suggested_action": "circuit_breaker",
                "analysis_type": "rule_fallback",
            }

        if "server_error" in reasons:
            return {
                "root_cause": "Internal server error (5xx) detected "
                              "in service logic or database.",
                "confidence": 0.75,
                "suggested_action": "restart_service",
                "analysis_type": "rule_fallback",
            }

        if "high_latency" in reasons:
            return {
                "root_cause": "Resource pressure causing elevated "
                              "response times.",
                "confidence": 0.70,
                "suggested_action": "scale_up",
                "analysis_type": "rule_fallback",
            }

        if "rate_limit" in reasons:
            return {
                "root_cause": "External or internal client exceeding "
                              "API rate limits.",
                "confidence": 0.75,
                "suggested_action": "throttle_requests",
                "analysis_type": "rule_fallback",
            }

        # No recognizable signal — escalate to human
        return {
            "root_cause": "Unknown behavioral anomaly",
            "confidence": 0.5,
            "suggested_action": "escalate_only",
            "analysis_type": "rule_fallback",
        }

# Singleton instance
causal_engine = CausalEngine()


async def analyze_anomaly(log: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convenience wrapper for the detection worker.

    The detection worker imports this function:
        from app.causal_engine.client import analyze_anomaly
    """
    return await causal_engine.analyze(log)
