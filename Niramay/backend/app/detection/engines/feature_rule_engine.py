"""
Feature Rule Engine — Status Code & Value Checks

Composes the three existing rules (FailureTagRule, LatencyRule,
StatusCodeRule) into a single engine that evaluates all three
and returns the combined list of triggered signals.

This engine is purely in-memory with no external state.
"""
import structlog
from typing import Dict, Any, List
from app.detection.engines.base_engine import BaseEngine
from app.detection.rules.base import RuleResult
from app.detection.rules.failure import FailureTagRule
from app.detection.rules.latency import LatencyRule
from app.detection.rules.status import StatusCodeRule

logger = structlog.get_logger(__name__)


class FeatureRuleEngine(BaseEngine):
    """
    Consolidates all value-based / feature-based rule checks:
        - FailureTagRule   (weight 3): failure_tag != "none"
        - LatencyRule      (weight 2): response_time > threshold
        - StatusCodeRule   (weight 3/2): 5xx or 429
    """

    def __init__(self):
        super().__init__(name="feature_rule_engine")
        self._rules = [
            FailureTagRule(),
            LatencyRule(),
            StatusCodeRule(),
        ]

    def evaluate(self, log: Dict[str, Any]) -> List[RuleResult]:
        """
        Run all three sub-rules and return the list of triggered results.

        Handles field aliasing so normalized logs (from Stage 1) work
        with the existing rules that use older field names:
            failure_tag  → failure_type  (FailureTagRule reads failure_type)
            response_time_ms → response_time (LatencyRule reads response_time)
        """
        # Build a view with aliased fields (don't mutate original log)
        aliased = dict(log)
        if "failure_tag" in aliased and "failure_type" not in aliased:
            aliased["failure_type"] = aliased["failure_tag"]
        if "response_time_ms" in aliased and "response_time" not in aliased:
            aliased["response_time"] = aliased["response_time_ms"]

        triggered = []
        for rule in self._rules:
            try:
                result = rule.evaluate(aliased)
                if result.triggered:
                    triggered.append(result)
            except Exception as e:
                logger.warning(
                    "Feature rule evaluation failed",
                    rule=rule.name,
                    error=str(e),
                )
        return triggered
