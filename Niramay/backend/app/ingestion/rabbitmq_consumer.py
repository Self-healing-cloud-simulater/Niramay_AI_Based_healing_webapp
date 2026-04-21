"""
Stage 1 — RabbitMQ Consumer

Connects to RabbitMQ and continuously consumes log messages published
by Component C. Each message is:
    1. Normalized via the Stage 1 normalizer
    2. Written to OpenSearch (b-normalized-logs) asynchronously
    3. Passed in-memory to the Stage 2 DetectionService

Connection resilience:
    - Automatic reconnection with exponential backoff (1s → 2s → 4s → … → 60s max)
    - Never crashes the pipeline on transient RabbitMQ failures
"""
import json
import time
import threading
import structlog
import pika
from pika.exceptions import AMQPConnectionError, AMQPChannelError
from app.core.config import settings
from app.ingestion.normalizer import normalize_log
from app.ingestion.opensearch_client import opensearch_writer

logger = structlog.get_logger(__name__)

# Maximum backoff ceiling (seconds)
_MAX_BACKOFF = 60


def _get_connection_params() -> pika.ConnectionParameters:
    """Build pika connection parameters from settings."""
    credentials = pika.PlainCredentials(
        settings.RABBITMQ_USER,
        settings.RABBITMQ_PASSWORD,
    )
    return pika.ConnectionParameters(
        host=settings.RABBITMQ_HOST,
        port=settings.RABBITMQ_PORT,
        credentials=credentials,
        heartbeat=600,
        blocked_connection_timeout=300,
    )


def _on_message(channel, method_frame, header_frame, body):
    """
    Callback invoked for each message consumed from the queue.

    Pipeline:
        raw bytes → normalize → OpenSearch write (async) → Stage 2 detection
    """
    try:
        raw_message = body.decode("utf-8")
    except UnicodeDecodeError:
        raw_message = str(body)

    # ── Stage 1: Normalize ──
    normalized = normalize_log(raw_message)

    logger.debug(
        "Log ingested and normalized",
        service=normalized.get("service"),
        endpoint=normalized.get("endpoint"),
        is_malformed=normalized.get("is_malformed"),
    )

    # ── Stage 1: Write to OpenSearch (async, non-blocking) ──
    opensearch_writer.write_normalized_log(normalized)

    # ── Stage 2: Run detection pipeline ──
    try:
        from app.detection.index import detection_service
        detection_service.detect_anomaly(normalized)
    except Exception as e:
        logger.error("Stage 2 detection failed for ingested log", error=str(e))

    # Acknowledge the message so RabbitMQ removes it from the queue
    try:
        channel.basic_ack(delivery_tag=method_frame.delivery_tag)
    except Exception as e:
        logger.error("Failed to ACK message", error=str(e))


def _consumer_loop():
    """
    Main consumer loop with exponential backoff reconnection.

    Runs in a dedicated daemon thread so it doesn't block the
    FastAPI event loop.
    """
    backoff = 1

    while True:
        try:
            logger.info(
                "Connecting to RabbitMQ",
                host=settings.RABBITMQ_HOST,
                port=settings.RABBITMQ_PORT,
                queue=settings.RABBITMQ_QUEUE,
            )

            params = _get_connection_params()
            connection = pika.BlockingConnection(params)
            channel = connection.channel()

            # Declare the queue (idempotent — creates if not exists)
            channel.queue_declare(queue=settings.RABBITMQ_QUEUE, durable=True)

            # Prefetch 1 message at a time for fair dispatch
            channel.basic_qos(prefetch_count=1)

            # Start consuming
            channel.basic_consume(
                queue=settings.RABBITMQ_QUEUE,
                on_message_callback=_on_message,
                auto_ack=False,
            )

            logger.info(
                "RabbitMQ consumer started — listening for messages",
                queue=settings.RABBITMQ_QUEUE,
            )

            # Reset backoff on successful connection
            backoff = 1

            # Blocks here, processing messages until connection drops
            channel.start_consuming()

        except AMQPConnectionError as e:
            logger.warning(
                "RabbitMQ connection failed — retrying",
                error=str(e),
                backoff_seconds=backoff,
            )
        except AMQPChannelError as e:
            logger.warning(
                "RabbitMQ channel error — retrying",
                error=str(e),
                backoff_seconds=backoff,
            )
        except Exception as e:
            logger.error(
                "Unexpected error in RabbitMQ consumer — retrying",
                error=str(e),
                backoff_seconds=backoff,
            )

        # Exponential backoff with ceiling
        time.sleep(backoff)
        backoff = min(backoff * 2, _MAX_BACKOFF)


def start_rabbitmq_consumer():
    """
    Start the RabbitMQ consumer in a background daemon thread.

    This is called from main.py on application startup. The thread
    is marked as daemon so it doesn't prevent graceful shutdown.
    """
    thread = threading.Thread(
        target=_consumer_loop,
        name="rabbitmq-consumer",
        daemon=True,
    )
    thread.start()
    logger.info("RabbitMQ consumer thread started")
