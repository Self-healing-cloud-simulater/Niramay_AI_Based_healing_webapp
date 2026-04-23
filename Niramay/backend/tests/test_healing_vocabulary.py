"""Tests for the shared healing vocabulary module."""
from app.shared.healing_vocabulary import (
    HEALING_ACTIONS,
    VALID_ACTIONS,
    is_valid_action,
    coerce_action,
)


def test_vocabulary_is_not_empty():
    assert len(HEALING_ACTIONS) > 0
    assert len(VALID_ACTIONS) > 0


def test_vocabulary_contains_core_actions():
    required = {
        "restart_service",
        "throttle_requests",
        "escalate_only",
        "none",
    }
    assert required.issubset(VALID_ACTIONS)


def test_is_valid_action_accepts_known():
    assert is_valid_action("restart_service") is True
    assert is_valid_action("none") is True


def test_is_valid_action_rejects_unknown():
    assert is_valid_action("reboot_everything") is False
    assert is_valid_action("") is False
    assert is_valid_action("Restart Service") is False


def test_coerce_action_returns_valid_unchanged():
    assert coerce_action("restart_service") == "restart_service"


def test_coerce_action_coerces_unknown_to_escalate():
    result = coerce_action("do the thing")
    assert result == "escalate_only"


def test_coerce_action_respects_custom_default():
    result = coerce_action("bad_action", default="none")
    assert result == "none"
