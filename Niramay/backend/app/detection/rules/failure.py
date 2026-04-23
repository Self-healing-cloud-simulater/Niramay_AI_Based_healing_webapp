from typing import Dict, Any
from .base import BaseRule, RuleResult

class FailureTagRule(BaseRule):
    """Rule to detect failures injected by the simulator"""

    def __init__(self, weight: int = 3):
        super().__init__(name="failure_tag", weight=weight)

    def evaluate(self, log: Dict[str, Any]) -> RuleResult:
        failure_type = log.get("failure_type", "none")

        if failure_type != "none":
            return RuleResult(
                triggered=True,
                reason=failure_type,
                score=self.weight
            )

        return RuleResult(triggered=False)
