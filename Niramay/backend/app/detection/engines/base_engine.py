"""
Base Engine Interface

All Stage 2 detection engines must implement this interface.
Each engine receives a normalized log and returns a list of
RuleResult objects (zero or more). The Detection Worker runs
all engines in parallel and aggregates the results.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List
from app.detection.rules.base import RuleResult


class BaseEngine(ABC):
    """
    Abstract base class for all detection engines.

    Unlike BaseRule (which returns a single RuleResult),
    BaseEngine returns a list — an engine may produce
    multiple signals from a single log entry.
    """

    def __init__(self, name: str):
        self.name = name

    @abstractmethod
    def evaluate(self, log: Dict[str, Any]) -> List[RuleResult]:
        """
        Evaluate the engine against a single normalized log entry.

        Returns:
            List of RuleResult objects for all triggered checks.
            Empty list if nothing triggered.
        """
        pass
