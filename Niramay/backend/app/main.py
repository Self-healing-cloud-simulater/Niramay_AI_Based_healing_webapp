"""
Niramay — FastAPI Application Entry Point
Standalone application containing the unified Observation → Detection → Healing pipeline.

Pipeline: Traffic Generator → Middleware → RabbitMQ → Normalizer → OpenSearch + Detection → Healing
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time

from app.core.config import settings
from app.simulation.failure_middleware import FailureSimulationMiddleware
from app.core.logging import logger, log_request
from app.observation.middleware import ObservationMiddleware
from app.api.v1.endpoints import router as api_router

# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
    ## Niramay — Self-Healing Cloud Infrastructure

    Unified pipeline: **Observation → Detection → Healing**

    ### Pipeline Flow:
    1. **Traffic** → Failure Middleware → Observation Middleware → RabbitMQ
    2. **RabbitMQ Consumer** → Normalizer → OpenSearch + Redis
    3. **Detection Worker** → 4 engines → Anomaly scoring
    4. **Healing Engine** → Strategy execution → Verification

    ### API Endpoints:
    - `GET /api/v1/observation/logs` — Real-time traffic logs (Redis)
    - `GET /api/v1/observation/logs/history` — Historical logs (OpenSearch)
    - `GET /api/v1/detection/anomalies` — Detected anomalies (Redis)
    - `GET /api/v1/detection/anomalies/history` — Historical anomalies (OpenSearch)
    - `GET /api/v1/healing/actions` — Healing actions (Redis)
    - `GET /api/v1/escalations` — Escalation alerts (Redis)
    - `GET /api/v1/failure-simulator/*` — Control failure injection
    """,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add failure simulation middleware (before observation — injects failures)
app.add_middleware(FailureSimulationMiddleware)

# Add Observation Layer middleware (outermost — records all traffic)
app.add_middleware(ObservationMiddleware)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all API requests"""
    start_time = time.time()
    response = await call_next(request)
    duration = (time.time() - start_time) * 1000

    log_request(
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=duration,
        client_ip=request.client.host if request.client else "unknown"
    )
    return response


# Include API router
app.include_router(api_router, prefix="/api/v1")


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "documentation": "/docs",
        "dashboard": "http://localhost:3000",
        "endpoints": {
            "observation": "/api/v1/observation/logs",
            "observation_history": "/api/v1/observation/logs/history",
            "detection": "/api/v1/detection/anomalies",
            "detection_history": "/api/v1/detection/anomalies/history",
            "healing": "/api/v1/healing/actions",
            "escalations": "/api/v1/escalations",
            "failure_simulator": "/api/v1/failure-simulator/status",
        }
    }


# Exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception", error=str(exc), path=request.url.path, method=request.method)
    return JSONResponse(
        status_code=500,
        content={"error": "InternalServerError", "message": "An unexpected error occurred", "path": request.url.path}
    )


# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize application on startup"""
    logger.info("Application starting", app_name=settings.APP_NAME, version=settings.APP_VERSION)

    # ── Initialize RabbitMQ publisher ──
    try:
        from app.ingestion.rabbitmq_publisher import rabbitmq_publisher
        logger.info("RabbitMQ publisher initialized")
    except Exception as e:
        logger.warning("RabbitMQ publisher init failed (non-fatal)", error=str(e))

    # ── Initialize OpenSearch indices ──
    try:
        from app.ingestion.opensearch_client import opensearch_writer
        opensearch_writer.ensure_indices()
        logger.info("OpenSearch indices initialized")
    except Exception as e:
        logger.warning("OpenSearch initialization failed (non-fatal)", error=str(e))

    # ── Start RabbitMQ consumer (ingests logs from middleware + Component C) ──
    try:
        from app.ingestion.rabbitmq_consumer import start_rabbitmq_consumer
        start_rabbitmq_consumer()
        logger.info("RabbitMQ consumer started")
    except Exception as e:
        logger.warning("RabbitMQ consumer start failed (non-fatal)", error=str(e))

    # ── Start silence detection background checker ──
    try:
        from app.detection.engines.silence_detection_engine import start_silence_checker
        start_silence_checker()
        logger.info("Silence detection checker started")
    except Exception as e:
        logger.warning("Silence checker start failed (non-fatal)", error=str(e))

    # ── Start Detection Worker ──
    from app.detection.worker import start_detection_worker
    start_detection_worker()

    # ── Start Traffic Generator (demo mode) ──
    if settings.TRAFFIC_GENERATOR_ENABLED:
        from app.simulation.traffic_generator import start_traffic_generator
        start_traffic_generator(interval_ms=settings.TRAFFIC_GENERATOR_INTERVAL_MS)

    # ── Start Healing Verification Worker ──
    from app.healing.verification_worker import start_verification_worker
    start_verification_worker()

    # ── Enable default failure scenarios for demo ──
    from app.simulation.failure_config import failure_simulator
    failure_simulator.enable_scenario("database_error")
    logger.info("Enabled default failure scenarios for demo: database_error")


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutting down")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )
