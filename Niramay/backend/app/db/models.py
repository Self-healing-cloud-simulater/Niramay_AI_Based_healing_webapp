from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from .session import Base
import datetime

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    service = Column(String, index=True)
    endpoint = Column(String, index=True)
    method = Column(String)
    status_code = Column(Integer)
    response_time = Column(Float)
    failure_type = Column(String, default="none")
    request_id = Column(String, unique=True, index=True)
    metadata_json = Column(JSON, default={})

    # Relationships
    anomaly = relationship("AnomalyRecord", back_populates="log", uselist=False)

class AnomalyRecord(Base):
    __tablename__ = "anomalies_history"

    id = Column(Integer, primary_key=True, index=True)
    log_id = Column(Integer, ForeignKey("audit_logs.id"))
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    is_anomaly = Column(Boolean, default=False)
    anomaly_score = Column(Float)
    reasons = Column(JSON, default=[])
    ai_analysis = Column(JSON, default={})

    # Relationships
    log = relationship("AuditLog", back_populates="anomaly")
    healing_action = relationship("HealingActionRecord", back_populates="anomaly", uselist=False)

class HealingActionRecord(Base):
    __tablename__ = "healing_actions_history"

    id = Column(Integer, primary_key=True, index=True)
    anomaly_id = Column(Integer, ForeignKey("anomalies_history.id"))
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    action = Column(String)
    status = Column(String)
    message = Column(String)
    verification_status = Column(String, default="PENDING") # PENDING, SUCCESS, FAILURE, EXPIRED
    verification_timestamp = Column(DateTime, nullable=True)

    # Relationships
    anomaly = relationship("AnomalyRecord", back_populates="healing_action")
