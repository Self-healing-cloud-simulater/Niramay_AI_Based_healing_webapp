
import os
import sys
from unittest.mock import patch, MagicMock

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "Niramay/backend"))

def test_config_handles_none_credentials():
    # Force environment variables to None for this test
    with patch.dict(os.environ, {
        "OPENSEARCH_USER": "",
        "OPENSEARCH_PASSWORD": "",
        "RABBITMQ_USER": "",
        "RABBITMQ_PASSWORD": ""
    }, clear=False):
        # Reload settings or import inside
        from app.core.config import Settings
        settings = Settings()

        assert settings.OPENSEARCH_USER is None or settings.OPENSEARCH_USER == ""
        assert settings.OPENSEARCH_PASSWORD is None or settings.OPENSEARCH_PASSWORD == ""
        assert settings.RABBITMQ_USER is None or settings.RABBITMQ_USER == ""
        assert settings.RABBITMQ_PASSWORD is None or settings.RABBITMQ_PASSWORD == ""

def test_opensearch_client_auth_logic():
    from app.ingestion.opensearch_client import OpenSearchWriter
    from app.core.config import settings

    writer = OpenSearchWriter()

    with patch("app.ingestion.opensearch_client.OpenSearch") as mock_os:
        with patch.object(settings, "OPENSEARCH_USER", None):
            with patch.object(settings, "OPENSEARCH_PASSWORD", None):
                writer._get_client()
                # Check that OpenSearch was called with http_auth=None
                args, kwargs = mock_os.call_args
                assert kwargs["http_auth"] is None

def test_rabbitmq_publisher_auth_logic():
    from app.ingestion.rabbitmq_publisher import RabbitMQPublisher
    from app.core.config import settings

    publisher = RabbitMQPublisher()

    with patch("app.ingestion.rabbitmq_publisher.pika.BlockingConnection"):
        with patch("app.ingestion.rabbitmq_publisher.pika.ConnectionParameters") as mock_params:
            with patch.object(settings, "RABBITMQ_USER", None):
                with patch.object(settings, "RABBITMQ_PASSWORD", None):
                    publisher._connect()
                    args, kwargs = mock_params.call_args
                    assert kwargs["credentials"] is None

if __name__ == "__main__":
    # Simple manual test runner since pytest is missing dependencies
    try:
        test_config_handles_none_credentials()
        print("test_config_handles_none_credentials passed")
        test_opensearch_client_auth_logic()
        print("test_opensearch_client_auth_logic passed")
        test_rabbitmq_publisher_auth_logic()
        print("test_rabbitmq_publisher_auth_logic passed")
        print("All security config tests passed!")
    except Exception as e:
        print(f"Tests failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
