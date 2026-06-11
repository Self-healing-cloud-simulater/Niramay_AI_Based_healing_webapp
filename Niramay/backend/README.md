# Niramay Backend

> FastAPI-based self-healing pipeline backend with multi-stage anomaly detection, AI-powered root cause analysis, and autonomous healing execution.

---

## Overview

The Niramay backend is the core of the self-healing platform. It consumes observation logs from CRAVE via RabbitMQ, processes them through a multi-stage pipeline, and executes healing actions when anomalies are detected.

---

## Pipeline Architecture

```
RabbitMQ (component-c-logs)
    │
    ▼
Stage 1: Ingestion
├── RabbitMQ Consumer → Normalizer
├── Write: OpenSearch (b-normalized-logs)
├── Write: Redis (observation:logs, capped 1000)
└── Queue: Redis (observation:pending_detection)
    │
    ▼
Stage 2: Detection (4 engines in parallel)
├── Feature Rule Engine (stateless)
├── Rate Based Engine (Redis state)
├── Silence Detection Engine (Redis state)
├── Baseline Anomaly Engine (Redis state)
├── Write: Redis (observation:anomalies)
├── Write: OpenSearch (b-anomaly-records / b-healthy-logs)
└── Queue: Redis (analyser:pending)
    │
    ▼
Stage 3: Analysis
├── Causal Engine (Ollama LLaMA3 or rule fallback)
├── Incident Report Generation
├── Write: Redis (incident:reports)
├── Write: OpenSearch (b-incident-reports)
└── Queue: Redis (dispatcher:pending)
    │
    ▼
Stage 4: Dispatch + Healing
├── Strategy Selection & Execution
├── Write: Redis (healing:actions)
└── Verification Worker
    ├── SUCCESS → OpenSearch update
    ├── RETRY → dispatcher:pending
    └── ESCALATE → Redis (escalation:alerts)
```

---

## Project Structure

```
backend/
├── app/
│   ├── ingestion/              # Stage 1: Log ingestion
│   │   ├── rabbitmq_consumer.py    # RabbitMQ consumer thread
│   │   ├── rabbitmq_publisher.py   # Publish to RabbitMQ
│   │   ├── normalizer.py          # Log normalization
│   │   └── opensearch_client.py   # OpenSearch write client
│   ├── detection/              # Stage 2: Anomaly detection
│   │   ├── index.py               # Pure detection scoring function
│   │   ├── worker.py              # Async detection pipeline loop
│   │   └── engines/               # Individual detection engines
│   │       ├── feature_rule_engine.py
│   │       ├── rate_based_engine.py
│   │       ├── silence_detection_engine.py
│   │       └── baseline_anomaly_engine.py
│   ├── causal_engine/          # AI root cause analysis
│   │   └── client.py              # Ollama LLaMA3 + rule-based fallback
│   ├── analyser/               # Stage 3: Classification + reporting
│   │   └── worker.py              # Causal analysis + incident reports
│   ├── dispatcher/             # Stage 4: Alert dispatch
│   │   └── worker.py              # Component A communication
│   ├── healing/                # Healing strategy orchestration
│   │   ├── index.py               # Strategy selection + execution
│   │   └── verification_worker.py # Verify healing outcomes
│   ├── healing_action_executor/ # Concrete healing strategies
│   │   ├── executor.py            # Strategy executor
│   │   └── strategies/
│   │       ├── base.py            # Base strategy interface
│   │       ├── restart.py         # Docker container restart
│   │       ├── k3s_restart.py     # K3s pod restart
│   │       ├── k3s_scale_up.py    # K3s horizontal scaling
│   │       ├── k3s_rollback.py    # K3s deployment rollback
│   │       ├── k3s_circuit_breaker.py # K3s circuit breaker
│   │       ├── k3s_flush_cache.py # K3s cache flush
│   │       ├── k3s_throttle.py    # K3s request throttling
│   │       ├── escalate.py        # Escalation to human operator
│   │       ├── noop.py            # No-op (dry run)
│   │       └── stub.py            # Stub for testing
│   ├── reporting/              # Incident report generation
│   │   ├── report_generator.py
│   │   └── templates/
│   ├── observation/            # Observation data layer
│   ├── middleware/             # HTTP middleware
│   ├── shared/                 # Shared utilities
│   ├── api/v1/                 # REST API
│   │   ├── endpoints.py           # All route handlers
│   │   └── schemas.py             # Pydantic schemas
│   ├── core/                   # Configuration & clients
│   │   ├── config.py              # Environment-based settings
│   │   └── redis_client.py        # Redis connection
│   └── main.py                 # FastAPI app factory
├── tests/                      # Comprehensive test suite (17 test files)
├── requirements.txt            # Python dependencies
├── Dockerfile                  # Container image definition
└── .env.example                # Environment variable template
```

---

## Detection Engines

| Engine | What It Detects | State |
|--------|----------------|-------|
| **Feature Rule Engine** | HTTP status codes ≥ 400, high latency, known failure tags | Stateless |
| **Rate Based Engine** | Sustained error rate exceeding threshold over time window | Redis counters |
| **Silence Detection Engine** | Service stops producing logs (service gone silent) | Redis timestamps |
| **Baseline Anomaly Engine** | Deviation from historical average response time/error rate | Redis baselines |

---

## Causal Engine

Two modes of operation:

1. **LLM Mode** — Queries a local Ollama instance (LLaMA 3.2) with enriched anomaly context. Produces root cause analysis with confidence scoring.
2. **Rule Fallback** — When LLM is disabled or unavailable, maps anomaly reasons to known root causes using a deterministic rule set.

Output: `{ root_cause, confidence, suggested_action, analysis_type }`

---

## Healing Strategies

| Strategy | Environment | Description |
|----------|-------------|-------------|
| `RestartServiceStrategy` | Docker | Restart crave-backend container via Docker socket |
| `K3sRestartStrategy` | K3s | Rolling restart of K3s deployment |
| `K3sScaleUpStrategy` | K3s | Horizontal pod auto-scaling |
| `K3sRollbackStrategy` | K3s | Rollback to previous deployment revision |
| `K3sCircuitBreakerStrategy` | K3s | Circuit breaker pattern implementation |
| `K3sFlushCacheStrategy` | K3s | Cache invalidation via pod annotation |
| `K3sThrottleStrategy` | K3s | Request rate throttling |
| `EscalateStrategy` | Any | Escalate to human operator |
| `NoopStrategy` | Any | Dry run — logs but takes no action |

---

## Setup

### With Docker (recommended)

```bash
docker-compose up -d
# Backend: http://localhost:8000
# API docs: http://localhost:8000/docs
```

### Local development

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Running tests

```bash
pytest tests/ -v
```

---

## Environment Variables

See [`.env.example`](.env.example) for the full list. Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_HOST` | `niramay-redis` | Redis hostname |
| `RABBITMQ_HOST` | `niramay-rabbitmq` | RabbitMQ hostname |
| `RABBITMQ_QUEUE` | `component-c-logs` | Queue name for CRAVE logs |
| `OPENSEARCH_HOST` | `niramay-opensearch` | OpenSearch hostname |
| `OLLAMA_URL` | `http://niramay-ollama:11434/api/generate` | Ollama API endpoint |
| `OLLAMA_MODEL` | `llama3.2` | LLM model name |
| `ENABLE_AI_CAUSAL` | `true` | Enable LLM-based root cause analysis |
| `TRAFFIC_GENERATOR_ENABLED` | `false` | Enable built-in traffic generator |

---

## API Endpoints

| Method | Endpoint | Source | Description |
|--------|----------|--------|-------------|
| GET | `/api/v1/observation/logs` | Redis | Real-time log feed |
| GET | `/api/v1/observation/logs/history` | OpenSearch | Historical logs |
| GET | `/api/v1/detection/anomalies` | Redis | Real-time anomaly feed |
| GET | `/api/v1/detection/anomalies/history` | OpenSearch | Historical anomalies |
| GET | `/api/v1/healing/actions` | Redis | Healing action results |
| GET | `/api/v1/escalations` | Redis | Escalation alerts |
| GET | `/api/v1/incident/reports` | Redis | Incident reports |
| GET | `/api/v1/incident/reports/history` | OpenSearch | Historical reports |
| GET | `/api/v1/stats` | Redis | System statistics |
