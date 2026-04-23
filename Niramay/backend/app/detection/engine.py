"""
DEPRECATED — This file is superseded by the parallel engine architecture.

The old DetectionEngine with weighted 0-1 scoring has been replaced by:
    - app.detection.index.DetectionService (parallel orchestrator)
    - app.detection.engines/ (4 parallel engines)

This stub exists only for backward compatibility. All new code should
import from app.detection.index instead.
"""
import structlog
from app.detection.index import detection_service

logger = structlog.get_logger(__name__)

logger.warning("DEPRECATED: app.detection.engine is deprecated. Use app.detection.index instead.")


class DetectionEngine:
    """Deprecated wrapper — delegates to the new DetectionService."""

    def analyze_log(self, log):
        """Delegates to DetectionService.detect_anomaly()"""
        return detection_service.detect_anomaly(log)


# Backward-compatible singleton
detection_engine = DetectionEngine()
