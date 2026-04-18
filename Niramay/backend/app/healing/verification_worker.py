import asyncio
import structlog
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models import HealingActionRecord, AuditLog, AnomalyRecord
from app.healing.index import healing_service
from app.observation.store import observation_store
import json

logger = structlog.get_logger(__name__)

async def verification_worker_loop():
    """
    Background worker that verifies the success of PENDING healing actions.
    Checks subsequent traffic logs for the same service/endpoint.
    """
    logger.info("Starting Healing Verification Worker...")
    
    while True:
        try:
            with SessionLocal() as db:
                # 1. Fetch all PENDING actions
                pending_actions = db.query(HealingActionRecord).filter(
                    HealingActionRecord.verification_status == "PENDING"
                ).all()

                for action in pending_actions:
                    # 2. Apply Dynamic Settling Windows
                    # Different actions require different amounts of time to stabilize
                    windows = {
                        "restart_service": 45,
                        "throttle_requests": 15,
                        "retry_request": 5,
                        "fallback_response": 2
                    }
                    wait_seconds = windows.get(action.action, 30)
                    
                    if action.timestamp <= datetime.now() - timedelta(seconds=wait_seconds):
                        await verify_healing_action(action, db)
            
            # Run every 15 seconds
            await asyncio.sleep(15)
            
        except Exception as e:
            logger.error("Error in verification worker loop", error=str(e))
            await asyncio.sleep(5)

async def verify_healing_action(action: HealingActionRecord, db: Session):
    """
    Looks at logs for the service/endpoint after the healing action took place.
    If multiple new logs show high anomaly scores, mark as FAILURE.
    If majority of new logs are healthy, mark as SUCCESS.
    """
    try:
        anomaly = action.anomaly
        log = anomaly.log
        
        # 1. Find logs for this endpoint after the healing action
        subsequent_logs = db.query(AuditLog).join(AnomalyRecord).filter(
            AuditLog.endpoint == log.endpoint,
            AuditLog.timestamp > action.timestamp
        ).order_by(AuditLog.timestamp.asc()).limit(10).all()

        if not subsequent_logs:
            # Check if action is too old to verify (e.g., no traffic for 10 mins)
            if action.timestamp < datetime.now() - timedelta(minutes=10):
                action.verification_status = "EXPIRED"
                db.commit()
                logger.warning("Healing verification expired (no traffic)", action_id=action.id)
            return

        # 2. Analyze anomaly density in subsequent traffic
        anomaly_count = 0
        for s_log in subsequent_logs:
            if s_log.anomaly and s_log.anomaly.anomaly_score > 0.5:
                anomaly_count += 1
        
        # 3. Decision Logic
        # If more than 30% of subsequent logs are still anomalies, healing failed.
        failure_rate = anomaly_count / len(subsequent_logs)
        
        if failure_rate > 0.3:
            action.verification_status = "FAILURE"
            action.message += " | Verification: Anomalies persist in subsequent traffic."
        else:
            action.verification_status = "SUCCESS"
            action.message += " | Verification: System performance stabilized."

        action.verification_timestamp = datetime.now()
        db.commit()
        
        # 4. Emit Real-time Update to UI
        try:
            r = await observation_store.get_redis()
            if r:
                update_payload = {
                    "id": action.id,
                    "action": action.action,
                    "status": action.verification_status,
                    "timestamp": action.verification_timestamp.isoformat(),
                    "message": action.message
                }
                await r.publish("niramay:healing_updates", json.dumps(update_payload))
        except Exception as e:
            logger.error("Failed to publish verification update", error=str(e))
        
        logger.info("Healing action verified", 
                    action=action.action, 
                    status=action.verification_status, 
                    failure_rate=f"{failure_rate:.1%}")

    except Exception as e:
        logger.error("Failed to verify healing action", action_id=action.id, error=str(e))

def start_verification_worker():
    """Start the verification worker in the background"""
    asyncio.create_task(verification_worker_loop())
