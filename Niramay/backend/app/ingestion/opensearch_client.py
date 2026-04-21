"""
OpenSearch Async Writer

Provides non-blocking writes to OpenSearch for the detection pipeline.
All writes are dispatched to a background thread pool so the main
detection pipeline is never blocked by storage latency or failures.

Three indices are managed:
    - b-normalized-logs   : All normalized log entries (Stage 1 output)
    - b-anomaly-records   : Full enriched anomaly detections (Stage 2)
    - b-healthy-logs      : Lightweight healthy log records (Stage 2)
"""
import structlog
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any
from opensearchpy import OpenSearch, exceptions as os_exceptions
from app.core.config import settings

logger = structlog.get_logger(__name__)

# Index names
INDEX_NORMALIZED_LOGS = "b-normalized-logs"
INDEX_ANOMALY_RECORDS = "b-anomaly-records"
INDEX_HEALTHY_LOGS = "b-healthy-logs"

# Index mappings
_INDEX_MAPPINGS = {
    INDEX_NORMALIZED_LOGS: {
        "mappings": {
            "properties": {
                "timestamp": {"type": "date"},
                "service": {"type": "keyword"},
                "endpoint": {"type": "keyword"},
                "status_code": {"type": "integer"},
                "response_time_ms": {"type": "float"},
                "failure_tag": {"type": "keyword"},
                "request_id": {"type": "keyword"},
                "raw": {"type": "text"},
                "is_malformed": {"type": "boolean"},
                "incomplete_fields": {"type": "keyword"},
            }
        }
    },
    INDEX_ANOMALY_RECORDS: {
        "mappings": {
            "properties": {
                "detection_id": {"type": "keyword"},
                "timestamp": {"type": "date"},
                "service": {"type": "keyword"},
                "endpoint": {"type": "keyword"},
                "status_code": {"type": "integer"},
                "response_time_ms": {"type": "float"},
                "failure_tag": {"type": "keyword"},
                "engines_triggered": {"type": "keyword"},
                "anomaly_reasons": {"type": "keyword"},
                "anomaly_score": {"type": "integer"},
                "severity": {"type": "keyword"},
                "is_anomaly": {"type": "boolean"},
                "requires_llm": {"type": "boolean"},
            }
        }
    },
    INDEX_HEALTHY_LOGS: {
        "mappings": {
            "properties": {
                "timestamp": {"type": "date"},
                "service": {"type": "keyword"},
                "endpoint": {"type": "keyword"},
                "status_code": {"type": "integer"},
                "response_time_ms": {"type": "float"},
            }
        }
    },
}


class OpenSearchWriter:
    """
    Non-blocking OpenSearch writer.

    Uses a thread pool to dispatch index operations so the detection
    pipeline is never blocked. All failures are logged and swallowed.
    """

    def __init__(self):
        self._client = None
        self._connected = False
        # Thread pool for async writes — max 4 workers to avoid overwhelming OS
        self._executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="opensearch")

    def _get_client(self) -> OpenSearch:
        """Lazy-initialize the OpenSearch client."""
        if self._client is not None and self._connected:
            return self._client

        try:
            self._client = OpenSearch(
                hosts=[{
                    "host": settings.OPENSEARCH_HOST,
                    "port": settings.OPENSEARCH_PORT,
                }],
                http_auth=(settings.OPENSEARCH_USER, settings.OPENSEARCH_PASSWORD),
                use_ssl=False,
                verify_certs=False,
                ssl_show_warn=False,
                timeout=10,
            )
            # Test connection
            info = self._client.info()
            self._connected = True
            logger.info(
                "OpenSearch connected",
                version=info.get("version", {}).get("number", "unknown"),
            )
            return self._client
        except Exception as e:
            self._connected = False
            logger.warning("OpenSearch connection failed", error=str(e))
            return None

    def ensure_indices(self) -> None:
        """
        Create all required indices if they don't already exist.
        Called once at application startup.
        """
        client = self._get_client()
        if not client:
            logger.warning("Cannot create indices — OpenSearch not available")
            return

        for index_name, body in _INDEX_MAPPINGS.items():
            try:
                if not client.indices.exists(index=index_name):
                    client.indices.create(index=index_name, body=body)
                    logger.info("Created OpenSearch index", index=index_name)
                else:
                    logger.info("OpenSearch index already exists", index=index_name)
            except Exception as e:
                logger.error(
                    "Failed to create OpenSearch index",
                    index=index_name,
                    error=str(e),
                )

    def _write_document(self, index: str, document: Dict[str, Any]) -> None:
        """
        Synchronous write — runs inside the thread pool.
        Never raises; all errors are logged and swallowed.
        """
        client = self._get_client()
        if not client:
            return

        try:
            client.index(index=index, body=document)
        except Exception as e:
            logger.error(
                "OpenSearch write failed",
                index=index,
                error=str(e),
                doc_keys=list(document.keys()),
            )

    def write_normalized_log(self, document: Dict[str, Any]) -> None:
        """
        Async write a normalized log to b-normalized-logs.
        Non-blocking — dispatches to thread pool.
        """
        self._executor.submit(self._write_document, INDEX_NORMALIZED_LOGS, document)

    def write_anomaly_record(self, document: Dict[str, Any]) -> None:
        """
        Async write a full enriched anomaly record to b-anomaly-records.
        Non-blocking — dispatches to thread pool.
        """
        self._executor.submit(self._write_document, INDEX_ANOMALY_RECORDS, document)

    def write_healthy_log(self, document: Dict[str, Any]) -> None:
        """
        Async write a lightweight healthy log to b-healthy-logs.
        Non-blocking — dispatches to thread pool.
        """
        self._executor.submit(self._write_document, INDEX_HEALTHY_LOGS, document)


# Singleton instance
opensearch_writer = OpenSearchWriter()
