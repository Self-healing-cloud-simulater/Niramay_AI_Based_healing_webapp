import asyncio
import json
import structlog
from app.services.detection_service import detection_service
from app.services.healing_service import healing_service
from app.core.observation_store import observation_store, REDIS_ANOMALIES_KEY, REDIS_STATS_PREFIX, REDIS_HEALING_KEY
from app.core.config import settings

logger = structlog.get_logger(__name__)

# Key for the pending detection queue
DETECTION_QUEUE_KEY = "observation:pending_detection"

#infinite loop is a part of detection layer to ensure API stays fast.
#infinite detection loop- when worker pops a log out of a redis queue and detection layer says that it is a 
#due to this loop the backend wont be waiting for a crash, then calc anomaly score and then restart the server.
async def detection_worker_loop():
    """
    Background loop that pops logs from Redis and processes them
    """
    logger.info("Starting Detection Worker Loop...")
    
    while True:
        try:
            # Connect to Redis via observation_store's lazy client
            r = await observation_store.get_redis()
            if not r:
                await asyncio.sleep(5)
                continue
                
            # Pop a log from the queue (blocking)
            # Timeout of 5 seconds to allow for graceful shutdown check if needed
            result = await r.brpop(DETECTION_QUEUE_KEY, timeout=5)
            
            if not result:
                continue
                
            _, log_json = result
            log = json.loads(log_json)
            
            # 1. Run Detection
            detection_result = detection_service.detect_anomaly(log)
            
            # 2. Enrich Log
            log.update(detection_result)
            enriched_json = json.dumps(log)
            
            # 3. Handle Healing & Store Anomalies
            if detection_result["is_anomaly"]:
                # --- HEALING LAYER ---
                action = healing_service.decide_healing_action(log)
                healing_result = await healing_service.execute_healing(action, log)
                log["healing"] = healing_result
                enriched_json = json.dumps(log)
                healing_json = json.dumps(healing_result)

                async with r.pipeline(transaction=True) as pipe:
                    # Append to anomalies list
                    await pipe.lpush(REDIS_ANOMALIES_KEY, enriched_json)
                    await pipe.ltrim(REDIS_ANOMALIES_KEY, 0, 999) # Keep last 1000
                    
                    # Store Healing Audit Record
                    if action != "none":
                        await pipe.lpush(REDIS_HEALING_KEY, healing_json)
                        await pipe.ltrim(REDIS_HEALING_KEY, 0, 999)
                    
                    # Update Stats
                    endpoint = log.get("endpoint", "unknown")
                    await pipe.hincrby(f"{REDIS_STATS_PREFIX}:endpoint", endpoint, 1)
                    
                    for reason in detection_result["anomaly_reasons"]:
                        await pipe.hincrby(f"{REDIS_STATS_PREFIX}:type", reason, 1)
                        
                    await pipe.execute()
                    
            # Note: We don't overwrite the original observation log here 
            # to keep the Observation Layer immutable as requested.
            # But the 'anomalies' key now contains the enriched ones.

        except Exception as e:
            logger.error("Error in detection worker loop", error=str(e))
            await asyncio.sleep(2)

def start_detection_worker():
    """Start the detection worker in the background"""
    asyncio.create_task(detection_worker_loop())
