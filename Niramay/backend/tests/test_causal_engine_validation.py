"""Tests that the Causal Engine validates LLM output against
the healing vocabulary."""
import pytest
from unittest.mock import AsyncMock, patch
from app.causal_engine.client import causal_engine


@pytest.mark.asyncio
async def test_llm_action_in_vocabulary_passes_through():
    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json = lambda: {
        "response": '{"root_cause": "test", '
                    '"confidence": 0.8, '
                    '"suggested_action": "restart_service"}'
    }
    with patch.object(
        causal_engine, "enabled", True
    ), patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.post = (
            AsyncMock(return_value=mock_response)
        )
        result = await causal_engine.analyze(
            {"anomaly_reasons": ["server_error"]}
        )
        assert result["suggested_action"] == "restart_service"


@pytest.mark.asyncio
async def test_llm_action_outside_vocabulary_is_coerced():
    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json = lambda: {
        "response": '{"root_cause": "test", '
                    '"confidence": 0.8, '
                    '"suggested_action": "reboot_everything_now"}'
    }
    with patch.object(
        causal_engine, "enabled", True
    ), patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.post = (
            AsyncMock(return_value=mock_response)
        )
        result = await causal_engine.analyze(
            {"anomaly_reasons": ["server_error"]}
        )
        assert result["suggested_action"] == "escalate_only"


def test_fallback_returns_valid_vocabulary_actions():
    from app.shared.healing_vocabulary import VALID_ACTIONS
    for reason in [
        "server_error",
        "high_latency",
        "rate_limit",
        "unknown_xyz",
    ]:
        result = causal_engine._rule_based_fallback(
            {"anomaly_reasons": [reason]}
        )
        assert result["suggested_action"] in VALID_ACTIONS
