"""
Detection Worker — Background Pipeline Loop

Consumes normalized logs from Redis (pushed by the Observation middleware)
and processes them through the Stage 2 Detection Service, which runs
all 4 engines in parallel.

After detection:
    - If anomaly with LLM required → Causal Engine (AI) → Healing
    - If anomaly without LLM       → Rule-based Healing
    - If healthy                    → No further action

Results are stored in Redis (real-time), SQLite/PostgreSQL (historical),
and OpenSearch (permanent searchable storage).
"""
import asyncio
import json
import structlog
from app.detection.index import detection_service
from app.healing.index import healing_service
from app.causal_engine.client import causal_engine
from app.observation.store import observation_store, REDIS_ANOMALIES_KEY, REDIS_STATS_PREFIX, REDIS_HEALING_KEY
from app.db.session import SessionLocal
from app.db.models import AuditLog, AnomalyRecord, HealingActionRecord

logger = structlog.get_logger(__name__)

# Key for the pending detection queue (populated by Observation middleware)
DETECTION_QUEUE_KEY = "observation:pending_detection"


async def detection_worker_loop():
    """
    Background loop that pops logs from Redis and processes them
    through the Detection → Healing pipeline.

    This is the internal pipeline (Observation middleware → Redis → here).
    The external pipeline (RabbitMQ → normalizer → DetectionService) runs
    separately in the RabbitMQ consumer thread.
    """
    logger.info("Starting Detection Worker Loop...")

    while True:
        try:
            r = await observation_store.get_redis()
            if not r:
                await asyncio.sleep(5)
                continue

            # Pop a log from the queue (blocking with 5s timeout)
            result = await r.brpop(DETECTION_QUEUE_KEY, timeout=5)

            if not result:
                continue

            _, log_json = result
            log = json.loads(log_json)

            # ── Stage 2: Run detection (4 engines in parallel) ──
            detection_result = detection_service.detect_anomaly(log)

            # Enrich the log with detection results
            log.update(detection_result)
            enriched_json = json.dumps(log)

            # ── Post-detection pipeline: Healing & Storage ──
            with SessionLocal() as db:
                # Find the existing AuditLog by request_id
                db_log = db.query(AuditLog).filter(AuditLog.request_id == log.get("request_id")).first()

                if detection_result["is_anomaly"]:
                    # --- CAUSAL ENGINE (AI Analysis) ---
                    ai_analysis = {}
                    if detection_result.get("requires_llm", False):
                        ai_analysis = await causal_engine.analyze(log)
                        log["ai_analysis"] = ai_analysis
                    else:
                        log["ai_analysis"] = {"skipped": True, "reason": "Below LLM escalation threshold"}

                    # --- HEALING LAYER ---
                    suggested_action = ai_analysis.get("suggested_action")
                    if suggested_action and suggested_action != "none" and ai_analysis.get("confidence", 0) > 0.8:
                        action = suggested_action
                    else:
                        action = healing_service.decide_healing_action(log)

                    healing_result = await healing_service.execute_healing(action, log)
                    log["healing"] = healing_result

                    enriched_json = json.dumps(log)
                    healing_json = json.dumps(healing_result)

                    # --- REDIS STORAGE (real-time) ---
                    async with r.pipeline(transaction=True) as pipe:
                        await pipe.lpush(REDIS_ANOMALIES_KEY, enriched_json)
                        await pipe.ltrim(REDIS_ANOMALIES_KEY, 0, 999)

                        if action != "none":
                            await pipe.lpush(REDIS_HEALING_KEY, healing_json)
                            await pipe.ltrim(REDIS_HEALING_KEY, 0, 999)
                            await pipe.publish("niramay:healing_events", healing_json)

                        # Update stats
                        endpoint = log.get("endpoint", "unknown")
                        await pipe.hincrby(f"{REDIS_STATS_PREFIX}:endpoint", endpoint, 1)

                        for reason in detection_result.get("anomaly_reasons", []):
                            await pipe.hincrby(f"{REDIS_STATS_PREFIX}:type", reason, 1)

                        await pipe.execute()

                    # --- SQL STORAGE (persistent) ---
                    if db_log:
                        db_anomaly = AnomalyRecord(
                            log_id=db_log.id,
                            is_anomaly=True,
                            anomaly_score=detection_result["anomaly_score"],
                            reasons=detection_result["anomaly_reasons"],
                            ai_analysis=ai_analysis
                        )
                        db.add(db_anomaly)
                        db.commit()
                        db.refresh(db_anomaly)

                        if action != "none":
                            db_healing = HealingActionRecord(
                                anomaly_id=db_anomaly.id,
                                action=action,
                                status=healing_result.get("status"),
                                message=healing_result.get("message"),
                                verification_status=healing_result.get("verification_status", "PENDING")
                            )
                            db.add(db_healing)
                            db.commit()

        except Exception as e:
            logger.error("Error in detection worker loop", error=str(e))
            await asyncio.sleep(2)


def start_detection_worker():
    """Start the detection worker in the background"""
    asyncio.create_task(detection_worker_loop())
