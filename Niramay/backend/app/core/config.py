"""
Application Configuration Settings
Simplified for standalone Niramay (Redis-only, no PostgreSQL)
"""
from typing import List, Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # App Info
    APP_NAME: str = "Niramay"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = None
    DATABASE_URL: str = "postgresql://user:password@localhost/niramay"


    @property
    def REDIS_URL(self) -> str:
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    # Failure Simulator Settings
    FAILURE_SIMULATOR_ENABLED: bool = True

    # Detection Layer Thresholds
    DETECTION_LATENCY_THRESHOLD_MS: float = 300.0

    # Rate Rule Settings
    DETECTION_RATE_WINDOW_SECONDS: float = 60.0   # Sliding window size (seconds)
    DETECTION_RATE_THRESHOLD: int = 50             # Max requests per endpoint per window

    # Silence Rule Settings
    DETECTION_SILENCE_THRESHOLD_SECONDS: float = 30.0  # Silence gap to trigger (seconds)

    # Weights for different anomaly indicators (must sum to 1.0)
    DETECTION_WEIGHT_LATENCY: float = 0.25
    DETECTION_WEIGHT_STATUS: float = 0.25
    DETECTION_WEIGHT_FAILURE: float = 0.20
    DETECTION_WEIGHT_RATE: float = 0.15
    DETECTION_WEIGHT_SILENCE: float = 0.15

    # Normalized Anomaly Threshold (0.0 to 1.0)
    DETECTION_ANOMALY_THRESHOLD: float = 0.4

    # Traffic Generator
    TRAFFIC_GENERATOR_ENABLED: bool = True
    TRAFFIC_GENERATOR_INTERVAL_MS: int = 2000  # Generate a request every 2 seconds

    # Ollama / LLM Settings
    OLLAMA_URL: str = "http://localhost:11434/api/generate"
    OLLAMA_MODEL: str = "llama3"
    ENABLE_AI_CAUSAL: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()
