"""
Structured Logging Configuration
"""
import structlog
import logging
import sys

# Configure standard library logging
logging.basicConfig(
    format="%(message)s",
    stream=sys.stdout,
    level=logging.INFO,
)

# Configure structlog
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

# Create logger instance
logger = structlog.get_logger()


def log_request(
    method: str,
    path: str,
    status_code: int,
    duration_ms: float,
    client_ip: str,
    user_id: str = None,
    error: str = None
) -> None:
    """Log an API request with structured data"""
    log_data = {
        "event": "api_request",
        "method": method,
        "path": path,
        "status_code": status_code,
        "duration_ms": round(duration_ms, 2),
        "client_ip": client_ip,
    }

    if user_id:
        log_data["user_id"] = user_id

    if error:
        log_data["error"] = error
        logger.error(**log_data)
    else:
        logger.info(**log_data)
