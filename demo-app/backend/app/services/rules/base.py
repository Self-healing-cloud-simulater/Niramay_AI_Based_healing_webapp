from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

class RuleResult(BaseModel):
    """Result of a single rule evaluation"""
    triggered: bool
    reason: Optional[str] = None
    score: int = 0

class BaseRule(ABC):
    """Base class for all anomaly detection rules"""
    
    def __init__(self, name: str, weight: int):
        self.name = name
        self.weight = weight

    @abstractmethod
    def evaluate(self, log: Dict[str, Any]) -> RuleResult:
        """Evaluate the rule against a log entry"""
        pass
