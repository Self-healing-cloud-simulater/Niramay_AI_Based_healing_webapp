"""
API Response Schemas

Pydantic models matching the flat JSON structures stored in Redis.
No SQLAlchemy dependencies.
"""
from pydantic import BaseModel
from typing import List, Dict, Any, Optional


class ObservationLogResponse(BaseModel):
    """Normalized log from Redis observation:logs"""
    timestamp: str
    service: str
    endpoint: str
    method: Optional[str] = "UNKNOWN"
    status_code: int
    response_time_ms: float
    failure_tag: str
    request_id: Optional[str] = None


class AnomalyResponse(BaseModel):
    """Detection result from Redis observation:anomalies"""
    detection_id: str
    timestamp: str
    service: str
    endpoint: str
    method: Optional[str] = "UNKNOWN"
    status_code: int
    response_time_ms: float
    failure_tag: str
    anomaly_score: float
    anomaly_reasons: List[str]
    engines_triggered: List[str]
    severity: str
    is_anomaly: bool
    requires_llm: bool
    ai_analysis: Optional[Any] = None
    healing: Optional[Dict[str, Any]] = None


class HealingActionResponse(BaseModel):
    """Healing action from Redis healing:actions"""
    healing_action: str
    status: str
    timestamp: str
    message: str
    verification_status: str


class EscalationAlertResponse(BaseModel):
    """Escalation alert from Redis escalation:alerts"""
    type: str
    service: str
    endpoint: str
    failure_type: str
    attempts: int
    healing_actions_tried: List[str]
    outcomes: List[str]
    timestamp: str
    message: str


class SystemStatsResponse(BaseModel):
    """System health statistics from Redis"""
    total_logs: int
    total_anomalies: int
    health_score: float
    by_endpoint: Dict[str, int]
    by_type: Dict[str, int]
