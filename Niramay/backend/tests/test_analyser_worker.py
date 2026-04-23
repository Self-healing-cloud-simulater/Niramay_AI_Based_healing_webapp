"""
Tests for Analyser Worker: LLM Classification
and Report Generation
"""
import asyncio
import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch

SAMPLE_DETECTION = {
    "detection_id": "test-det-001",
    "timestamp": "2024-01-15T10:30:00Z",
    "service": "order-service",
    "endpoint": "/api/orders",
    "method": "POST",
    "status_code": 500,
    "response_time_ms": 2340.0,
    "failure_tag": "database_error",
    "engines_triggered": ["feature_rule_engine"],
    "anomaly_reasons": ["server_error"],
    "anomaly_score": 0.7,
    "severity": "high",
    "is_anomaly": True,
    "requires_llm": False,
}

SAMPLE_DETECTION_LLM = {
    **SAMPLE_DETECTION,
    "detection_id": "test-det-002",
    "failure_tag": "none",
    "anomaly_reasons": ["high_latency"],
    "requires_llm": True,
}


@pytest.mark.asyncio
async def test_analyser_worker_consumes_from_queue():
    """Analyser Worker pops from analyser:pending queue"""
    from app.analyser.worker import analyser_worker_loop
    mock_redis = AsyncMock()
    mock_redis.brpop.return_value = (
        "analyser:pending",
        json.dumps(SAMPLE_DETECTION)
    )
    with patch("app.analyser.worker.get_async_redis",
               return_value=mock_redis):
        with patch("app.analyser.worker._handle_analyser",
                   new_callable=AsyncMock) as mock_handle:
            mock_handle.side_effect = asyncio.CancelledError
            try:
                await analyser_worker_loop()
            except asyncio.CancelledError:
                pass
            mock_handle.assert_called_once()


@pytest.mark.asyncio
async def test_analyser_calls_rule_fallback_when_not_requires_llm():
    """When requires_llm is False, rule fallback is used"""
    from app.analyser.worker import _handle_analyser
    mock_redis = AsyncMock()

    with patch("app.analyser.worker.analyze_anomaly",
               new_callable=AsyncMock) as mock_llm:
        with patch(
            "app.analyser.worker.generate_incident_report"
        ) as mock_report:
            mock_report.return_value = {
                "human_report": "test",
                "machine_alert": {"alert_id": "a1"},
                "detection_id": "test-det-001",
                "service": "order-service",
                "severity": "high",
                "verification_status": "PENDING",
            }
            with patch(
                "app.analyser.worker.opensearch_writer"
            ):
                await _handle_analyser(
                    mock_redis, SAMPLE_DETECTION.copy()
                )
                # LLM should NOT be called when
                # requires_llm is False
                mock_llm.assert_not_called()


@pytest.mark.asyncio
async def test_analyser_calls_llm_when_requires_llm_true():
    """When requires_llm is True, LLM analyze is called"""
    from app.analyser.worker import _handle_analyser
    mock_redis = AsyncMock()

    with patch(
        "app.analyser.worker.analyze_anomaly",
        new_callable=AsyncMock,
        return_value={
            "root_cause": "Test root cause",
            "confidence": 0.9,
            "suggested_action": "restart_service",
            "analysis_type": "ai_llm"
        }
    ) as mock_llm:
        with patch(
            "app.analyser.worker.generate_incident_report"
        ) as mock_report:
            mock_report.return_value = {
                "human_report": "test",
                "machine_alert": {"alert_id": "a2"},
                "detection_id": "test-det-002",
                "service": "order-service",
                "severity": "high",
                "verification_status": "PENDING",
            }
            with patch(
                "app.analyser.worker.opensearch_writer"
            ):
                await _handle_analyser(
                    mock_redis, SAMPLE_DETECTION_LLM.copy()
                )
                mock_llm.assert_called_once()
                # Verify the call was made with the right detection
                call_arg = mock_llm.call_args[0][0]
                assert call_arg["detection_id"] == "test-det-002"
                assert call_arg["requires_llm"] is True


@pytest.mark.asyncio
async def test_analyser_generates_incident_report():
    """Analyser Worker always generates an incident report"""
    from app.analyser.worker import _handle_analyser
    mock_redis = AsyncMock()

    with patch("app.analyser.worker.analyze_anomaly",
               new_callable=AsyncMock,
               return_value={"root_cause": "test",
                             "confidence": 0.8,
                             "suggested_action": "none",
                             "analysis_type": "rule_fallback"}):
        with patch(
            "app.analyser.worker.generate_incident_report"
        ) as mock_report:
            mock_report.return_value = {
                "human_report": "# Incident Report",
                "machine_alert": {"alert_id": "a3"},
                "detection_id": "test-det-001",
                "service": "order-service",
                "severity": "high",
                "verification_status": "PENDING",
            }
            with patch(
                "app.analyser.worker.opensearch_writer"
            ):
                await _handle_analyser(
                    mock_redis, SAMPLE_DETECTION.copy()
                )
                mock_report.assert_called_once()


@pytest.mark.asyncio
async def test_analyser_pushes_report_to_redis():
    """Analyser Worker pushes incident report to Redis
    incident:reports key"""
    from app.analyser.worker import _handle_analyser
    mock_redis = AsyncMock()

    with patch("app.analyser.worker.analyze_anomaly",
               new_callable=AsyncMock,
               return_value={"root_cause": "test",
                             "confidence": 0.7,
                             "suggested_action": "none",
                             "analysis_type": "rule_fallback"}):
        with patch(
            "app.analyser.worker.generate_incident_report",
            return_value={
                "human_report": "# Report",
                "machine_alert": {"alert_id": "a4"},
                "detection_id": "test-det-001",
                "service": "order-service",
                "severity": "high",
                "verification_status": "PENDING",
            }
        ):
            with patch(
                "app.analyser.worker.opensearch_writer"
            ):
                await _handle_analyser(
                    mock_redis, SAMPLE_DETECTION.copy()
                )
                mock_redis.lpush.assert_called()
                call_args = mock_redis.lpush.call_args_list
                keys_pushed = [c[0][0] for c in call_args]
                assert "incident:reports" in keys_pushed


@pytest.mark.asyncio
async def test_analyser_pushes_machine_alert_to_dispatcher():
    """Analyser Worker pushes machine alert to
    dispatcher:pending"""
    from app.analyser.worker import _handle_analyser
    mock_redis = AsyncMock()

    with patch("app.analyser.worker.analyze_anomaly",
               new_callable=AsyncMock,
               return_value={"root_cause": "test",
                             "confidence": 0.7,
                             "suggested_action": "none",
                             "analysis_type": "rule_fallback"}):
        with patch(
            "app.analyser.worker.generate_incident_report",
            return_value={
                "human_report": "# Report",
                "machine_alert": {
                    "alert_id": "a5",
                    "healing_action": "restart_service"
                },
                "detection_id": "test-det-001",
                "service": "order-service",
                "severity": "high",
                "verification_status": "PENDING",
            }
        ):
            with patch(
                "app.analyser.worker.opensearch_writer"
            ):
                await _handle_analyser(
                    mock_redis, SAMPLE_DETECTION.copy()
                )
                call_args = mock_redis.rpush.call_args_list
                keys_pushed = [c[0][0] for c in call_args]
                assert "dispatcher:pending" in keys_pushed


@pytest.mark.asyncio
async def test_analyser_writes_report_to_opensearch():
    """Analyser Worker writes incident report to OpenSearch"""
    from app.analyser.worker import _handle_analyser
    mock_redis = AsyncMock()
    mock_os = MagicMock()

    with patch("app.analyser.worker.analyze_anomaly",
               new_callable=AsyncMock,
               return_value={"root_cause": "test",
                             "confidence": 0.7,
                             "suggested_action": "none",
                             "analysis_type": "rule_fallback"}):
        with patch(
            "app.analyser.worker.generate_incident_report",
            return_value={
                "human_report": "# Report",
                "machine_alert": {"alert_id": "a6"},
                "detection_id": "test-det-001",
                "service": "order-service",
                "severity": "high",
                "verification_status": "PENDING",
            }
        ):
            with patch(
                "app.analyser.worker.opensearch_writer",
                mock_os
            ):
                await _handle_analyser(
                    mock_redis, SAMPLE_DETECTION.copy()
                )
                mock_os.write_incident_report\
                    .assert_called_once()


@pytest.mark.asyncio
async def test_analyser_handles_causal_engine_failure():
    """Analyser Worker continues gracefully if causal
    engine fails"""
    from app.analyser.worker import _handle_analyser
    mock_redis = AsyncMock()

    with patch("app.analyser.worker.analyze_anomaly",
               new_callable=AsyncMock,
               side_effect=Exception("Ollama unavailable")):
        with patch(
            "app.analyser.worker.generate_incident_report",
            return_value={
                "human_report": "# Report",
                "machine_alert": {"alert_id": "a7"},
                "detection_id": "test-det-002",
                "service": "order-service",
                "severity": "high",
                "verification_status": "PENDING",
            }
        ) as mock_report:
            with patch(
                "app.analyser.worker.opensearch_writer"
            ):
                await _handle_analyser(
                    mock_redis, SAMPLE_DETECTION_LLM.copy()
                )
                # Report should still be generated
                # even when causal engine fails
                mock_report.assert_called_once()
                call_kwargs = mock_report.call_args[0]
                ai_arg = call_kwargs[1]
                assert ai_arg.get("skipped") is True
