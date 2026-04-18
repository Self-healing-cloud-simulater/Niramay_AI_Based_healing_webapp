from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class AuditLogResponse(BaseModel):
    id: int
    timestamp: datetime
    service: str
    endpoint: str
    method: str
    status_code: int
    response_time: float
    failure_type: str
    request_id: Optional[str]
    metadata_json: Dict[str, Any]

    class Config:
        from_attributes = True

class AnomalyResponse(BaseModel):
    id: int
    log_id: int
    timestamp: datetime
    is_anomaly: bool
    anomaly_score: float
    reasons: List[str]
    ai_analysis: Dict[str, Any]
    log: Optional[AuditLogResponse] = None

    class Config:
        from_attributes = True

class HealingActionResponse(BaseModel):
    id: int
    anomaly_id: int
    timestamp: datetime
    action: str
    status: str
    message: str
    verification_status: str
    verification_timestamp: Optional[datetime] = None

    class Config:
        from_attributes = True

class SystemStatsResponse(BaseModel):
    total_logs: int
    total_anomalies: int
    health_score: float
    by_endpoint: Dict[str, int]
    by_type: Dict[str, int]
    window_health_score: float = Field(..., description="Health score based on the last 5 minutes of traffic")
