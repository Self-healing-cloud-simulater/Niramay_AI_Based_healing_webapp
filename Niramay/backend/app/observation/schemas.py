from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from enum import Enum


class NormalizationStatus(str, Enum):
    """Status of the normalization checkpoint."""
    COMPLETE = "complete"           # All required fields present and valid
    PARTIAL = "partial"            # Some optional fields were missing and filled with defaults
    INCOMPLETE = "incomplete"      # Critical fields were missing but recovered with defaults


class ObservationLog(BaseModel):
    """
    Standardized log schema for Niramay Ingestion.
    Acts as the Data Normalization Checkpoint for Stage 1.

    This schema validates, normalizes, and standardizes all incoming log data
    before it enters Redis or PostgreSQL. It handles field name mismatches
    (e.g., 'response_time_ms' vs 'response_time') and fills missing attributes
    with safe defaults.
    """
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    service: str = Field(default="unknown", description="Name of the service generating the log")
    endpoint: str = Field(default="unknown", description="API endpoint path")
    method: str = Field(default="GET", description="HTTP method")
    status_code: int = Field(default=0, description="HTTP status code")
    response_time: float = Field(default=0.0, description="Response time in milliseconds")
    failure_type: str = Field(default="none", description="Manual failure tag or category")
    request_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional context")

    # Normalization tracking
    normalization_status: NormalizationStatus = Field(
        default=NormalizationStatus.COMPLETE,
        description="Tracks whether the log was fully normalized or had missing fields"
    )
    missing_fields: List[str] = Field(
        default_factory=list,
        description="List of field names that were missing and filled with defaults"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "service": "order-service",
                "endpoint": "/api/v1/orders",
                "method": "POST",
                "status_code": 201,
                "response_time": 125.5,
                "failure_type": "none",
                "metadata": {"user_id": "user_123"}
            }
        }

    @model_validator(mode="before")
    @classmethod
    def normalize_field_aliases(cls, values: Any) -> Any:
        """
        Data Normalization Checkpoint — Step 1: Field Name Alignment.

        The middleware emits 'response_time_ms' and 'service_name',
        but the canonical schema and DB model use 'response_time' and 'service'.
        This validator transparently maps the incoming keys to the canonical form.
        """
        if isinstance(values, dict):
            # Alias: response_time_ms -> response_time
            if "response_time_ms" in values and "response_time" not in values:
                values["response_time"] = values.pop("response_time_ms")

            # Alias: service_name -> service
            if "service_name" in values and "service" not in values:
                values["service"] = values.pop("service_name")

        return values

    @model_validator(mode="after")
    def track_missing_fields(self) -> "ObservationLog":
        """
        Data Normalization Checkpoint — Step 2: Missing Field Detection.

        After all defaults have been applied, this validator checks which critical
        fields ended up using their default values, and records that information
        in the `normalization_status` and `missing_fields` attributes.
        """
        missing = []
        critical_defaults = {
            "service": "unknown",
            "endpoint": "unknown",
            "status_code": 0,
            "response_time": 0.0,
        }

        for field_name, default_val in critical_defaults.items():
            if getattr(self, field_name) == default_val:
                missing.append(field_name)

        if missing:
            self.missing_fields = missing
            # If more than half the critical fields are defaults, mark as incomplete
            if len(missing) >= 3:
                self.normalization_status = NormalizationStatus.INCOMPLETE
            else:
                self.normalization_status = NormalizationStatus.PARTIAL
        else:
            self.normalization_status = NormalizationStatus.COMPLETE

        return self


class AnomalyResult(BaseModel):
    """
    Standardized anomaly output schema.
    """
    is_anomaly: bool
    anomaly_score: float = Field(ge=0, le=1)
    reasons: list[str] = Field(default_factory=list)
