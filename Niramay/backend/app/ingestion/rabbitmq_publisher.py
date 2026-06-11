"""
RabbitMQ Publisher for Niramay
Allows the API to push logs into the ingestion queue (pure architecture).
"""
import pika
import structlog
from app.core.config import settings

logger = structlog.get_logger(__name__)

def publish_to_rabbitmq(message: str) -> bool:
    """
    Publish a raw log message to the RabbitMQ queue.
    """
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

        channel.basic_publish(
            exchange="",
            routing_key=queue_name,
            body=message.encode("utf-8"),
            properties=pika.BasicProperties(
                delivery_mode=2,  # make message persistent
            ),
        )

        connection.close()
        return True
    except Exception as e:
        logger.error("Failed to publish to RabbitMQ", error=str(e))
        return False
