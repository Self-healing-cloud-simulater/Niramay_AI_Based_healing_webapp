"""
Dispatcher Worker: Alert Dispatch and Verification

Receives machine alerts from the Analyser Worker via
dispatcher:pending queue and handles:
    1. Sending alert to Component A (placeholder)
    2. Receiving feedback from Component A (placeholder)
    3. Triggering verification worker
    4. Escalation if verification fails

STATUS: Skeleton only. Component A communication is
a placeholder demo function until Component A is
fully designed and integrated.
"""
import asyncio
import json
import structlog
from datetime import datetime, timezone
from app.core.redis_client import get_async_redis

logger = structlog.get_logger(__name__)

DISPATCHER_QUEUE_KEY = "dispatcher:pending"
HEALING_KEY = "healing:actions"
LIST_CAP = 1000


async def dispatcher_worker_loop():
    """
    Main async loop for the Dispatcher Worker.
    Pops machine alerts from dispatcher:pending queue
    and dispatches to Component A.
    """
    logger.info("Dispatcher Worker started (skeleton mode)")
    r = await get_async_redis()

    while True:
        try:
            result = await r.brpop(DISPATCHER_QUEUE_KEY, timeout=5)
            if result is None:
                continue

            _, raw = result
            try:
                machine_alert = json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                logger.warning(
                    "Dispatcher Worker: unparseable message",
                    raw=str(raw)[:200]
                )
                continue

            await _handle_dispatcher(r, machine_alert)

        except asyncio.CancelledError:
            logger.info("Dispatcher Worker cancelled")
            break
        except Exception as e:
            logger.error("Dispatcher Worker error", error=str(e))
            await asyncio.sleep(2)


async def _handle_dispatcher(r, machine_alert: dict):
    """
    Core Dispatcher Worker logic (skeleton).

    TODO when Component A is designed:
        - Replace _send_to_component_a() with real
          API call or queue publish
        - Implement real feedback receiver
        - Connect to verification worker
    """
    alert_id = machine_alert.get("alert_id", "unknown")
    detection_id = machine_alert.get("detection_id", "unknown")

    logger.info(
        "Dispatcher Worker: received machine alert",
        alert_id=alert_id,
        severity=machine_alert.get("severity")
    )

    # -- 1. Send alert to Component A (placeholder) --
    healing_result = await _send_to_component_a(machine_alert)

    # -- 2. Store healing result to Redis healing:actions --
    # This feeds the verification worker which reads
    # from healing:actions to verify outcomes.
    try:
        healing_record = {
            **healing_result,
            "detection_id": detection_id,
            "alert_id": alert_id,
            "service": machine_alert.get("service"),
            "endpoint": machine_alert.get("endpoint"),
            "failure_tag": machine_alert.get(
                "failure_tag", "none"),
            "timestamp": datetime.now(
                timezone.utc).isoformat(),
            "verification_status": "PENDING",
        }
        await r.lpush(
            HEALING_KEY,
            json.dumps(healing_record)
        )
        await r.ltrim(HEALING_KEY, 0, LIST_CAP - 1)
        logger.info(
            "Dispatcher Worker: healing record pushed to Redis",
            alert_id=alert_id
        )
    except Exception as e:
        logger.warning(
            "Dispatcher Worker: failed to store healing record",
            error=str(e)
        )


async def _send_to_component_a(
    machine_alert: dict
) -> dict:
    """
    Placeholder function representing Component A
    communication.

    REPLACE THIS when Component A is designed.
    Currently returns a simulated pending response
    so the verification worker has something to verify.

    When Component A is ready this function will:
        - Make an HTTP call to Component A API, OR
        - Publish to a shared message queue, OR
        - Call Component A's healing function directly
          (since A and B are in the same application)
    """
    logger.info(
        "Dispatcher Worker: sending alert to Component A "
        "(placeholder)",
        alert_id=machine_alert.get("alert_id"),
        recommended_action=machine_alert.get(
            "healing_action", "unknown")
    )

    # Simulate Component A receiving and acknowledging
    return {
        "healing_action": machine_alert.get(
            "healing_action", "none"),
        "status": "pending",
        "message": (
            "Component A placeholder: alert received. "
            "Actual healing not yet implemented."
        ),
        "verification_status": "PENDING",
    }


def start_dispatcher_worker():
    """Start Dispatcher Worker as a background async task."""
    asyncio.create_task(dispatcher_worker_loop())
    logger.info("Dispatcher Worker task created")
