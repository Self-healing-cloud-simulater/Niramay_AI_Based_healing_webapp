"""
Niramay — FastAPI Application Entry Point
Standalone application containing only the Observation → Detection → Healing pipeline.
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time

from app.core.config import settings
from app.core.failure_middleware import FailureSimulationMiddleware
from app.core.logging import logger, log_request
from app.middleware.observation import ObservationMiddleware
from app.api.routes import router as api_router

# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
    ## Niramay — Standalone Self-Healing Cloud Infrastructure

    This application extracts the complete **Observation → Detection → Healing** pipeline
    from the CRAVE food delivery failure simulator.

    ### Pipeline Phases:
    1. **Observation** — Captures all API traffic (CCTV for APIs)
    2. **Detection** — Scores anomalies using a weighted rule engine
    3. **Healing** — Automatically decides and executes healing actions

    ### API Endpoints:
    - `GET /api/v1/observation/logs` — Raw traffic logs
    - `GET /api/v1/detection/anomalies` — Detected anomalies with scores
    - `GET /api/v1/healing/actions` — Executed healing actions
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
            "detection": "/api/v1/detection/anomalies",
            "healing": "/api/v1/healing/actions",
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

    # Start the Detection Worker (Observation → Detection → Healing pipeline)
    from app.services.detection_worker import start_detection_worker
    start_detection_worker()

    # Start the Traffic Generator (creates synthetic API traffic for the demo)
    if settings.TRAFFIC_GENERATOR_ENABLED:
        from app.traffic_generator import start_traffic_generator
        start_traffic_generator(interval_ms=settings.TRAFFIC_GENERATOR_INTERVAL_MS)

        # Enable some failure scenarios by default so the dashboard has interesting data
        from app.core.failure_config import failure_simulator
        failure_simulator.enable_scenario("database_error")
        failure_simulator.enable_scenario("service_overload")
        logger.info("Enabled default failure scenarios for demo: database_error, service_overload")


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
