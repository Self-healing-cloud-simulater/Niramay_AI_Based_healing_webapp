"""
RabbitMQ Publisher — Non-blocking message publisher

Provides a thread-pool-backed publisher that the Observation
Middleware uses to send captured log entries to RabbitMQ.
Never blocks the HTTP request cycle.

If RabbitMQ is unavailable, logs a warning and continues
without crashing. Retries connection with exponential backoff.
"""
import json
import time
import threading
import structlog
import pika
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any
from app.core.config import settings

logger = structlog.get_logger(__name__)


class RabbitMQPublisher:
    """
    Thread-safe, non-blocking RabbitMQ publisher.

    Uses a ThreadPoolExecutor so publish() returns immediately.
    Maintains a persistent connection with automatic reconnect.
    """

    def __init__(self):
        self._connection = None
        self._channel = None
        self._lock = threading.Lock()
        self._executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="rmq-pub")
        self._queue_name = settings.RABBITMQ_QUEUE_NAME
        self._retry_delay = 1  # exponential backoff start

    def _connect(self):
        """Establish connection to RabbitMQ. Called lazily."""
        try:
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
            self._connection = pika.BlockingConnection(params)
            self._channel = self._connection.channel()
            self._channel.queue_declare(queue=self._queue_name, durable=True)
            self._retry_delay = 1  # reset backoff
            logger.info(
                "RabbitMQ publisher connected",
                host=settings.RABBITMQ_HOST,
                queue=self._queue_name,
            )
        except Exception as e:
            self._connection = None
            self._channel = None
            logger.warning(
                "RabbitMQ publisher connection failed",
                error=str(e),
                retry_in=self._retry_delay,
            )

    def _ensure_channel(self):
        """Ensure we have a live channel, reconnecting if needed."""
        if self._channel is not None:
            try:
                if self._connection and self._connection.is_open:
                    return True
            except Exception:
                pass

        self._connect()
        return self._channel is not None

    def _do_publish(self, message: str):
        """Synchronous publish — runs inside thread pool."""
        with self._lock:
            try:
                if not self._ensure_channel():
                    # Exponential backoff
                    time.sleep(min(self._retry_delay, 30))
                    self._retry_delay = min(self._retry_delay * 2, 60)
                    return

                self._channel.basic_publish(
                    exchange="",
                    routing_key=self._queue_name,
                    body=message,
                    properties=pika.BasicProperties(
                        delivery_mode=2,  # persistent
                        content_type="application/json",
                    ),
                )
            except Exception as e:
                logger.warning("RabbitMQ publish failed", error=str(e))
                self._connection = None
                self._channel = None
                self._retry_delay = min(self._retry_delay * 2, 60)

    def publish(self, log_entry: Dict[str, Any]) -> None:
        """
        Non-blocking publish. Dispatches to thread pool immediately.
        Never raises — all errors are logged and swallowed.
        """
        try:
            message = json.dumps(log_entry)
            self._executor.submit(self._do_publish, message)
        except Exception as e:
            logger.warning("RabbitMQ publish dispatch failed", error=str(e))

    def close(self):
        """Clean shutdown."""
        self._executor.shutdown(wait=False)
        try:
            if self._connection and self._connection.is_open:
                self._connection.close()
        except Exception:
            pass


# Singleton instance
rabbitmq_publisher = RabbitMQPublisher()
