# Niramay

AI-powered self-healing cloud monitoring system.
Detects failures in a simulated cloud environment
and automatically remediates them with minimal
human intervention.

---

## What It Does

Niramay monitors a food delivery demo application
that simulates a cloud environment. When failures
occur, the system detects them, classifies the root
cause and executes automated healing actions.

The pipeline has three main components:

**Component C** is the demo application. A food
delivery app that simulates cloud failures including
API errors, latency spikes and service outages.

**Component B** is the detection and analysis layer.
It ingests logs from Component C, runs them through
a multi-engine detection system and produces
structured failure alerts.

**Component A** is the self-healing layer. It
receives alerts from Component B and executes
the appropriate remediation action automatically.

---

## Architecture

```
Traffic Generator
      |
      v
Failure Middleware (injects simulated failures)
      |
      v
Observation Middleware
      |
      v (publish)
RabbitMQ (component-c-logs)
      |
      v (consume)
Normalizer
      |
      |---> OpenSearch: b-normalized-logs (permanent)
      |---> Redis: observation:logs (real-time, capped 1000)
      |---> Redis: observation:pending_detection (queue)
                          |
                          v
              Detection Worker
              (4 engines in parallel)
                          |
              +-----------+-----------+
              |                       |
           Anomaly               Healthy
              |                       |
              v                       v
   Redis: observation:anomalies   OpenSearch: b-healthy-logs
   Redis: healing:actions
   OpenSearch: b-anomaly-records
   OpenSearch: b-healing-records
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Demo application | Python FastAPI |
| Message queue | RabbitMQ |
| Real-time storage | Redis |
| Permanent storage | OpenSearch |
| AI analysis | Ollama with LLaMA3 |
| Frontend | React TypeScript |
| Infrastructure | Docker Compose |

---

## Detection Engines

| Engine | What it detects | State |
|---|---|---|
| Feature Rule Engine | Status codes, latency, failure tags | Stateless |
| Rate Based Engine | Sustained error rate over time window | Redis |
| Silence Detection Engine | Service stops producing logs | Redis |
| Baseline Anomaly Engine | Deviation from historical average | Redis |

---

## Redis Keys

| Key | Type | Written by | Read by |
|---|---|---|---|
| observation:logs | List capped 1000 | Consumer | API |
| observation:pending_detection | Queue | Consumer | Worker |
| observation:anomalies | List capped 1000 | Worker | API |
| healing:actions | List capped 1000 | Worker | API |
| escalation:alerts | List capped 100 | Verification | API |
| anomaly_stats:type | Hash | Worker | API |
| anomaly_stats:endpoint | Hash | Worker | API |
| rate:{service}:{endpoint}:errors | Counter TTL | Rate engine | Rate engine |
| last_seen:{service} | String | Silence engine | Silence checker |
| baseline:{service}:{endpoint} | Hash | Baseline engine | Baseline engine |

---

## Project Structure

```
Niramay/
├── backend/
│   └── app/
│       ├── simulation/          # Demo traffic and failure injection
│       │   ├── traffic_generator.py
│       │   ├── failure_config.py
│       │   └── failure_middleware.py
│       ├── observation/         # HTTP traffic capture
│       │   └── middleware.py
│       ├── ingestion/           # Log ingestion pipeline
│       │   ├── rabbitmq_consumer.py
│       │   ├── rabbitmq_publisher.py
│       │   ├── normalizer.py
│       │   └── opensearch_client.py
│       ├── detection/           # Anomaly detection
│       │   ├── index.py         # Pure detection function
│       │   ├── worker.py        # Async detection loop
│       │   └── engines/         # Individual detection engines
│       │       ├── feature_rule_engine.py
│       │       ├── rate_based_engine.py
│       │       ├── silence_detection_engine.py
│       │       └── baseline_anomaly_engine.py
│       ├── healing/             # Automated remediation
│       │   ├── index.py
│       │   └── verification_worker.py
│       ├── api/v1/              # REST API
│       │   ├── endpoints.py
│       │   └── schemas.py
│       └── core/                # Config and shared clients
│           ├── config.py
│           └── redis_client.py
├── frontend/                    # React TypeScript dashboard
│   └── src/
│       ├── pages/
│       ├── components/
│       └── hooks/
├── docker-compose.yml
└── README.md
```

---

## Getting Started

### Prerequisites

- Docker Desktop
- Python 3.11 or higher
- Node 18 or higher

### Run with Docker

```bash
docker-compose up -d
```

Wait for all services to be healthy then open:
- Frontend dashboard: http://localhost:3000
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs
- RabbitMQ management: http://localhost:15672
- OpenSearch: http://localhost:9200

### Run traffic simulation

```bash
cd backend
python simulation/traffic_generator.py
```

### Run tests

```bash
cd backend
pytest tests/ -v
```

---

## API Endpoints

| Method | Endpoint | Source | Description |
|---|---|---|---|
| GET | /api/v1/observation/logs | Redis | Real-time log feed |
| GET | /api/v1/observation/logs/history | OpenSearch | Historical logs |
| GET | /api/v1/detection/anomalies | Redis | Real-time anomaly feed |
| GET | /api/v1/detection/anomalies/history | OpenSearch | Historical anomalies |
| GET | /api/v1/healing/actions | Redis | Healing action results |
| GET | /api/v1/escalations | Redis | Escalation alerts |
| GET | /api/v1/stats | Redis | System statistics |
| POST | /api/v1/observe | RabbitMQ | Ingest a log entry |

---

## Current Implementation Status

| Component | Status |
|---|---|
| Component C: Demo application | In progress |
| Component B Stage 1: Log ingestion | Complete |
| Component B Stage 2: Rule based detection | Complete |
| Component B Stage 3: LLM classification | Planned |
| Component B Stage 4: Alert generation | Planned |
| Component A: Self healing | Planned |

---

## Team

[Add team member names here]
