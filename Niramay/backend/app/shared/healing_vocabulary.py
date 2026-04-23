"""
Single source of truth for all healing action names.

Every component that produces or consumes a healing action
(Causal Engine, Analyser Worker, Dispatcher Worker, Component A)
must import from here. This prevents vocabulary drift between
components.
"""

HEALING_ACTIONS = {
    "restart_service": "Restart the affected service container",
    "throttle_requests": "Apply rate limiting to reduce load",
    "flush_cache": "Clear service cache to resolve stale state",
    "scale_up": "Increase instance count for the service",
    "circuit_breaker": "Open circuit breaker to fail fast",
    "rollback_deployment": "Revert to previous known good deployment",
    "escalate_only": "No automated action, alert a human",
    "none": "No action recommended",
}

VALID_ACTIONS = set(HEALING_ACTIONS.keys())


def is_valid_action(action: str) -> bool:
    """Check if an action name is in the official vocabulary."""
    return action in VALID_ACTIONS


def coerce_action(action: str, default: str = "escalate_only") -> str:
    """
    Return the action if valid, otherwise the default.
    Used to sanitize LLM output which may return strings
    outside the vocabulary.
    """
    if action in VALID_ACTIONS:
        return action
    return default
