import json
import logging
from collections import deque
from typing import List, Dict, Any, Optional
import redis.asyncio as redis
from app.core.config import settings
from app.db.session import SessionLocal
from app.db.models import AuditLog
from app.observation.schemas import ObservationLog, NormalizationStatus
import datetime

logger = logging.getLogger(__name__)

# Constants
REDIS_KEY = "observation:logs"
REDIS_ANOMALIES_KEY = "observation:anomalies"
REDIS_STATS_PREFIX = "anomaly_stats"
DETECTION_QUEUE_KEY = "observation:pending_detection"
REDIS_HEALING_KEY = "healing:actions"
REDIS_DEADLETTER_KEY = "observation:deadletter"
MAX_LOGS = 1000

class ObservationStore:
    """
    Storage layer for API observation logs.
    Uses Redis as primary store and an in-memory deque as fallback.
    """
    def __init__(self):
        self._redis: Optional[redis.Redis] = None
        self._fallback_store: deque = deque(maxlen=MAX_LOGS)
        self._redis_connected = False

    async def _get_redis(self) -> Optional[redis.Redis]:
        """Lazy initialization of Redis connection"""
        if self._redis_connected:
            return self._redis

        try:
            self._redis = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
            # Test connection
            await self._redis.ping()
            self._redis_connected = True
            logger.info("ObservationStore connected to Redis")
            return self._redis
        except Exception as e:
            self._redis_connected = False
            self._redis = None
            logger.warning(f"ObservationStore failed to connect to Redis, using in-memory fallback: {e}")
            return None

    async def get_redis(self) -> Optional[redis.Redis]:
        """Public accessor for the lazy Redis client"""
        return await self._get_redis()

    def _normalize_log(self, entry: Dict[str, Any]) -> Optional[ObservationLog]:
        """
        Data Normalization Checkpoint.

        Validates and normalizes the raw log dictionary through the
        ObservationLog Pydantic schema. Returns None if the log is
        completely unrecoverable (malformed beyond defaults).
        """
        try:
            normalized = ObservationLog.model_validate(entry)

            if normalized.normalization_status == NormalizationStatus.PARTIAL:
                logger.warning(
                    f"Log normalized with missing fields: {normalized.missing_fields}",
                    extra={"request_id": normalized.request_id}
                )
            elif normalized.normalization_status == NormalizationStatus.INCOMPLETE:
                logger.warning(
                    f"Log heavily incomplete, missing: {normalized.missing_fields}",
                    extra={"request_id": normalized.request_id}
                )

            return normalized
        except Exception as e:
            logger.error(f"Log failed Pydantic normalization entirely: {e}")
            return None

    async def _push_to_deadletter(self, entry: Dict[str, Any], error: str) -> None:
        """
        Push malformed logs that fail normalization to a dead letter queue
        in Redis for later debugging and inspection.
        """
        r = await self._get_redis()
        if r:
            try:
                dead_entry = {
                    "original_payload": entry,
                    "error": str(error),
                    "received_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
                }
                async with r.pipeline(transaction=True) as pipe:
                    await pipe.lpush(REDIS_DEADLETTER_KEY, json.dumps(dead_entry, default=str))
                    await pipe.ltrim(REDIS_DEADLETTER_KEY, 0, 499)  # Keep last 500 dead letters
                    await pipe.execute()
            except Exception as e:
                logger.error(f"Failed to push to dead letter queue: {e}")

    async def push_log(self, entry: Dict[str, Any]) -> None:
        """
        Add a new log entry to the store.

        Pipeline:
          1. Normalize through Pydantic schema (Data Normalization Checkpoint)
          2. If normalization fails → dead letter queue
          3. If normalization succeeds → Redis + PostgreSQL + in-memory fallback
        """
        # ── Step 1: Data Normalization Checkpoint ──
        normalized = self._normalize_log(entry)

        if normalized is None:
            # Completely malformed — route to dead letter queue
            await self._push_to_deadletter(entry, "Failed Pydantic validation")
            return

        # Convert validated model to a clean dictionary for storage
        clean_entry = normalized.model_dump(mode="json")
        json_entry = json.dumps(clean_entry)

        # ── Step 2: PostgreSQL (long-term historical storage and ML learning) ──
        try:
            with SessionLocal() as db:
                # Timestamp is already a proper datetime from Pydantic
                ts = normalized.timestamp
                if ts.tzinfo is not None:
                    ts = ts.replace(tzinfo=None)  # SQLAlchemy expects naive datetimes

                db_log = AuditLog(
                    timestamp=ts,
                    service=normalized.service,
                    endpoint=normalized.endpoint,
                    method=normalized.method,
                    status_code=normalized.status_code,
                    response_time=normalized.response_time,
                    failure_type=normalized.failure_type,
                    request_id=normalized.request_id,
                    metadata_json=normalized.metadata
                )
                db.add(db_log)
                db.commit()
                db.refresh(db_log)
        except Exception as e:
            logger.error(f"Error pushing log to PostgreSQL: {e}")

        # ── Step 3: Redis (real-time triggers and monitoring) ──
        r = await self._get_redis()
        if r:
            try:
                # LPUSH and LTRIM to maintain a capped list
                async with r.pipeline(transaction=True) as pipe:
                    await pipe.lpush(REDIS_KEY, json_entry)  # Main log
                    await pipe.ltrim(REDIS_KEY, 0, MAX_LOGS - 1)  # Keep only 1000

                    # ENQUEUE for async detection worker
                    await pipe.lpush(DETECTION_QUEUE_KEY, json_entry)

                    await pipe.execute()
            except Exception as e:
                logger.error(f"Error pushing log to Redis: {e}")
                self._redis_connected = False

        # ── Step 4: Failsafe (in-memory redundancy) ──
        self._fallback_store.appendleft(clean_entry)

    async def get_logs(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Retrieve the last N log entries"""
        limit = min(limit, MAX_LOGS)

        # Try Redis first
        r = await self._get_redis()
        if r:
            try:
                raw_logs = await r.lrange(REDIS_KEY, 0, limit - 1)
                return [json.loads(log) for log in raw_logs]
            except Exception as e:
                logger.error(f"Error retrieving logs from Redis: {e}")
                self._redis_connected = False

        # Fallback to in-memory
        return list(self._fallback_store)[:limit]

# Global singleton instance
observation_store = ObservationStore()
