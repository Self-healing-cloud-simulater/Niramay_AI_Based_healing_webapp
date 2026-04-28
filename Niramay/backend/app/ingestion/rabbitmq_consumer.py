"""
Stage 1 — RabbitMQ Consumer

Consumes log messages from the RabbitMQ queue (component-c-logs),
normalizes them via normalizer.py, then fans out:

    1. Write to OpenSearch b-normalized-logs (permanent storage)
    2. Push to Redis observation:logs (real-time dashboard feed, capped 1000)
    3. Push to Redis observation:pending_detection (detection worker queue)

The Detection Worker picks up from step 3 and runs the full
detection → healing pipeline.

Runs in a daemon thread with automatic reconnection
and exponential backoff.
"""
import json
import time
import threading
import structlog
import pika
from datetime import datetime, timezone
from app.core.config import settings
from app.core.redis_client import get_sync_redis
from app.ingestion.normalizer import normalize_log
from app.ingestion.opensearch_client import opensearch_writer

logger = structlog.get_logger(__name__)

# Redis key names
REDIS_OBSERVATION_LOGS = "observation:logs"
REDIS_PENDING_DETECTION = "observation:pending_detection"
REDIS_LOGS_CAP = 1000


def _on_message(channel, method_frame, header_frame, body):
    """
    Callback for each consumed message.

    Flow: Normalize → OpenSearch → Redis (logs + detection queue)
    """
    try:
        raw_message = body.decode("utf-8")
    except Exception:
        raw_message = str(body)

    # ── Step 0: Write raw message to OpenSearch before normalization ──
    # This stores exactly what CRAVE sent for debugging
    try:
        opensearch_writer.write_raw_log(
            raw_message=raw_message,
            queue="component-c-logs"
        )
    except Exception as e:
        logger.warning(
            "Failed to write raw log to OpenSearch",
            error=str(e)
        )
    # Continue with normalization regardless

    # ── Step 1: Normalize ──
    normalized = normalize_log(raw_message)

    # ── Step 2: Write to OpenSearch (non-blocking) ──
    try:
        opensearch_writer.write_normalized_log(normalized)
    except Exception as e:
        logger.warning("Failed to write to OpenSearch", error=str(e))

    # ── Step 3: Push to Redis ──
    try:
        r = get_sync_redis()
        log_json = json.dumps(normalized)

        # Push to observation:logs (real-time feed for frontend API)
        r.lpush(REDIS_OBSERVATION_LOGS, log_json)
        r.ltrim(REDIS_OBSERVATION_LOGS, 0, REDIS_LOGS_CAP - 1)

        # Push to observation:pending_detection (detection worker queue)
        r.rpush(REDIS_PENDING_DETECTION, log_json)

        # Update pipeline stage key (never block on failure)
        try:
            r.set(
                settings.PIPELINE_STAGE_KEY,
                json.dumps({
                    "stage": "stage_1_complete",
                    "timestamp": datetime.now(
                        timezone.utc).isoformat(),
                    "message": "Log ingested and normalized"
                })
            )
        except Exception:
            pass  # Never block pipeline for UI updates

    except Exception as e:
        logger.warning("Failed to push to Redis", error=str(e))

    # Acknowledge the message
    try:
        channel.basic_ack(delivery_tag=method_frame.delivery_tag)
    except Exception as e:
        logger.warning("Failed to ack message", error=str(e))


def _consumer_loop():
    """
    Main consumer loop with automatic reconnection.
    Runs in a daemon thread.
    """
    retry_delay = 1

    while True:
        try:
            credentials = None
            if settings.RABBITMQ_USER and settings.RABBITMQ_PASSWORD:
                credentials = pika.PlainCredentials(
                    settings.RABBITMQ_USER,
                    settings.RABBITMQ_PASSWORD,
                )

            params = pika.ConnectionParameters(
                host=settings.RABBITMQ_HOST,
                port=settings.RABBITMQ_PORT,
                credentials=credentials,
                heartbeat=600,
                blocked_connection_timeout=300,
            )

            connection = pika.BlockingConnection(params)
            channel = connection.channel()

            queue_name = settings.RABBITMQ_QUEUE_NAME
            channel.queue_declare(queue=queue_name, durable=True)
            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue=queue_name, on_message_callback=_on_message)

            logger.info(
                "RabbitMQ consumer started",
                host=settings.RABBITMQ_HOST,
                queue=queue_name,
            )
            retry_delay = 1  # reset backoff

            channel.start_consuming()

        except pika.exceptions.AMQPConnectionError as e:
            logger.warning(
                "RabbitMQ connection failed, retrying...",
                error=str(e),
                retry_in=retry_delay,
            )
        except Exception as e:
            logger.error(
                "RabbitMQ consumer error, retrying...",
                error=str(e),
                retry_in=retry_delay,
            )

        time.sleep(retry_delay)
        retry_delay = min(retry_delay * 2, 60)


def start_rabbitmq_consumer():
    """Start the RabbitMQ consumer in a background daemon thread."""
    thread = threading.Thread(
        target=_consumer_loop,
        name="rabbitmq-consumer",
        daemon=True,
    )
    thread.start()
    logger.info("RabbitMQ consumer thread launched")
