from typing import Dict, Any
from .base import BaseRule, RuleResult

class StatusCodeRule(BaseRule):
    """Rule to detect server errors and rate limits"""

    def __init__(self, server_error_weight: int = 3, rate_limit_weight: int = 2):
        super().__init__(name="status_code_rule", weight=0)
        self.server_error_weight = server_error_weight
        self.rate_limit_weight = rate_limit_weight

    def evaluate(self, log: Dict[str, Any]) -> RuleResult:
        status_code = log.get("status_code", 0)

        if status_code >= 500:
            return RuleResult(
                triggered=True,
                reason="server_error",
                score=self.server_error_weight
            )
        elif status_code == 429:
            return RuleResult(
                triggered=True,
                reason="rate_limit",
                score=self.rate_limit_weight
            )

        return RuleResult(triggered=False)
