# Niramay — Autonomous Self-Healing Cloud Infrastructure

Niramay is a production-ready, system-agnostic self-healing middleware that monitors API traffic in real time, detects anomalies using a weighted multi-rule engine, performs AI-powered root cause analysis, and executes autonomous healing strategies — all without human intervention.

> **Branch:** `healing-ui`  
> **Repository:** [self-healing-cloud/healing-layer](https://github.com/self-healing-cloud/healing-layer)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Prerequisites](#prerequisites)
4. [Deployment — Option A: Docker Compose (Recommended)](#deployment--option-a-docker-compose-recommended)
5. [Deployment — Option B: Local (Without Docker)](#deployment--option-b-local-without-docker)
6. [Deployment — Option C: Google Cloud Run](#deployment--option-c-google-cloud-run)
7. [Configuration Reference](#configuration-reference)
8. [API Reference](#api-reference)
9. [Verification & Testing](#verification--testing)
10. [Pipeline Deep Dive](#pipeline-deep-dive)
11. [Troubleshooting](#troubleshooting)
12. [Integration API](#integration-api)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Niramay Pipeline                             │
│                                                                     │
│  ┌──────────┐     ┌──────────────┐     ┌────────────┐              │
│  │ Stage 1  │     │   Stage 2    │     │  Stage 3   │              │
│  │Observa-  │────▶│  Detection   │────▶│  Healing   │              │
│  │  tion    │     │   Engine     │     │  Engine    │              │
│  └────┬─────┘     └──────┬───────┘     └─────┬──────┘              │
│       │                  │                   │                      │
│       ▼                  ▼                   ▼                      │
│  ┌─────────┐      ┌───────────┐       ┌───────────┐               │
│  │  Redis  │      │  SQLite / │       │  Docker / │               │
│  │ Stream  │      │ PostgreSQL│       │  Actions  │               │
│  └─────────┘      └───────────┘       └───────────┘               │
│                                                                     │
│  ┌──────────────────────────────────────────────────┐              │
│  │           React Dashboard (Port 3000)             │              │
│  │  ┌────────────┬──────────────┬───────────────┐   │              │
│  │  │Observation │  Detection   │   Healing     │   │              │
│  │  │   Feed     │   Alerts     │   Actions     │   │              │
│  │  └────────────┴──────────────┴───────────────┘   │              │
│  └──────────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

**Data Flow:**
1. API traffic enters through the **Observation Middleware** (CCTV for APIs)
2. Logs are pushed to **Redis** and persisted to **SQLite**
3. The **Detection Worker** pulls logs from Redis and scores them through 5 rule engines
4. Anomalies exceeding the threshold are classified by severity and persisted
5. The **Healing Engine** executes corrective actions (throttle, restart, fallback)
6. The **React Dashboard** displays everything in real time

---

## Project Structure

```
Niramay/
├── backend/                          # FastAPI Backend (Port 8000)
│   ├── app/
│   │   ├── main.py                   # Application entry point
│   │   ├── core/
│   │   │   ├── config.py             # Environment settings (Pydantic)
│   │   │   ├── failure_config.py     # Failure scenario definitions
│   │   │   ├── failure_middleware.py  # Failure injection middleware
│   │   │   └── logging.py            # Structured logging (structlog)
│   │   ├── observation/
│   │   │   ├── middleware.py          # Traffic capture middleware
│   │   │   ├── store.py              # Redis + SQLite persistence
│   │   │   └── schemas.py            # Pydantic validation schemas
│   │   ├── detection/
│   │   │   ├── engine.py             # 5-rule weighted scoring engine
│   │   │   ├── worker.py             # Background detection loop
│   │   │   └── rules/                # Individual rule implementations
│   │   │       ├── latency.py        # Response time threshold rule
│   │   │       ├── status.py         # HTTP status code rule
│   │   │       ├── failure.py        # Failure type tag rule
│   │   │       ├── rate.py           # Traffic rate anomaly rule
│   │   │       └── silence.py        # Traffic silence detection rule
│   │   ├── healing/
│   │   │   ├── index.py              # Healing action executor
│   │   │   └── verification_worker.py# Post-healing verification
│   │   ├── causal_engine/            # LLM-powered root cause analysis
│   │   ├── api/v1/
│   │   │   ├── endpoints.py          # All REST endpoints
│   │   │   └── schemas.py            # Response models
│   │   ├── db/
│   │   │   ├── models.py             # SQLAlchemy ORM models
│   │   │   └── session.py            # Database connection
│   │   └── traffic_generator.py      # Synthetic traffic for demo
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env                          # Environment configuration
│
├── frontend/                         # React + Vite Frontend (Port 3000)
│   ├── src/
│   │   ├── App.tsx                   # Router configuration
│   │   ├── main.tsx                  # React entry point
│   │   ├── designSystem.ts           # Theme, types, utilities
│   │   ├── index.css                 # Global styles
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx       # Landing / marketing page
│   │   │   ├── HealingDashboard.tsx  # Main dashboard (4-panel grid)
│   │   │   └── LiveVisualizer.tsx    # Real-time pipeline visualizer
│   │   ├── components/
│   │   │   ├── DetectionAlerts.tsx    # Anomaly list + Chart.js
│   │   │   ├── HealingActions.tsx    # Healing action feed
│   │   │   ├── ObservationFeed.tsx   # Live log stream
│   │   │   ├── AICopilot.tsx         # AI chat + RCA panel
│   │   │   ├── StatCard.tsx          # Metric tile
│   │   │   └── ...                   # Other UI components
│   │   └── hooks/
│   │       └── useNiramayData.ts     # Shared data fetching hook
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts                # Vite dev server + API proxy
│
├── docker-compose.yml                # One-command orchestration
├── Makefile                          # Dev shortcuts
├── COMPONENT_B_README.md             # Detection layer documentation
└── HEALING_LAYER_REPORT.md           # Full academic report
```

---

## Prerequisites

### For Docker Compose Deployment (Option A)
| Tool | Version | Install Command |
|------|---------|-----------------|
| Docker Desktop | 4.0+ | [Download](https://www.docker.com/products/docker-desktop/) |
| Git | 2.30+ | `brew install git` |

### For Local Deployment (Option B)
| Tool | Version | Install Command |
|------|---------|-----------------|
| Python | 3.9+ | `brew install python@3.11` |
| Node.js | 18+ | `brew install node` |
| Redis | 7+ | `brew install redis` |
| Git | 2.30+ | `brew install git` |

### For Cloud Deployment (Option C)
| Tool | Version | Install Command |
|------|---------|-----------------|
| Google Cloud SDK | Latest | `brew install google-cloud-sdk` |
| Docker | 4.0+ | Required for `gcloud run deploy --source` |

---

## Deployment — Option A: Docker Compose (Recommended)

This is the simplest and most reliable deployment method. A single command starts all 3 services (Redis, Backend, Frontend) with proper health checks and networking.

### Step 1: Clone the Repository

```bash
git clone https://github.com/self-healing-cloud/healing-layer.git
cd healing-layer/Niramay
```

If you already have the repo:

```bash
cd /Users/ananyakarn/Desktop/dev_ananya/healing-layer/healing-layer/Niramay
git checkout healing-ui
git pull origin healing-ui
```

### Step 2: Create Environment File

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with the following values:

```env
# Redis (Docker Compose uses the service name "redis")
REDIS_HOST=redis
REDIS_PORT=6379

# Detection Thresholds
DETECTION_LATENCY_THRESHOLD_MS=300.0
DETECTION_ANOMALY_THRESHOLD=0.4

# Traffic Generator (generates synthetic API calls for demo)
TRAFFIC_GENERATOR_ENABLED=true
TRAFFIC_GENERATOR_INTERVAL_MS=2000

# CORS — allow the frontend to call the backend
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]
```

### Step 3: Build and Start All Services

```bash
# Build images and start in detached mode
docker compose up --build -d
```

This starts:
- **niramay-redis** — Redis 7 on port `6379`
- **niramay-backend** — FastAPI on port `8000`
- **niramay-frontend** — Vite dev server on port `3000`

### Step 4: Watch Startup Logs

```bash
# Watch all services
docker compose logs -f

# Or watch a specific service
docker compose logs -f backend
```

You should see:
```
niramay-backend  | Application starting
niramay-backend  | SQL Database initialized successfully
niramay-backend  | Starting Detection Worker Loop...
niramay-backend  | Starting Traffic Generator (interval: 2000ms)
niramay-backend  | Enabled default failure scenarios for demo: database_error
```

### Step 5: Verify Deployment

Open these URLs in your browser:

| Page | URL | What You Should See |
|------|-----|---------------------|
| **Dashboard** | http://localhost:3000/dashboard | 4-panel healing dashboard with live data |
| **Visualizer** | http://localhost:3000/visualizer | Real-time pipeline animation |
| **API Docs** | http://localhost:8000/docs | Swagger interactive documentation |
| **Health** | http://localhost:8000/health | `{"status": "healthy"}` |

> **Note:** Allow 30–60 seconds for the traffic generator to produce enough data for anomalies to appear on the dashboard.

### Step 6: Stop Services

```bash
# Stop all services
docker compose down

# Stop and remove volumes (clears Redis data)
docker compose down -v
```

---

## Deployment — Option B: Local (Without Docker)

Use this when you want to develop and debug directly on your machine.

### Step 1: Start Redis

```bash
# Install Redis if not already installed
brew install redis

# Start Redis as a background service
brew services start redis

# Verify Redis is running
redis-cli ping
# Expected output: PONG
```

### Step 2: Set Up the Backend

```bash
cd backend

# Create a Python virtual environment
python3 -m venv venv

# Activate the virtual environment
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

### Step 3: Configure Environment Variables

```bash
# Create the environment file
cp .env.example .env
```

Edit `backend/.env`:

```env
# Redis (localhost for local development)
REDIS_HOST=localhost
REDIS_PORT=6379

# Detection Thresholds
DETECTION_LATENCY_THRESHOLD_MS=300.0
DETECTION_ANOMALY_THRESHOLD=0.4

# Traffic Generator
TRAFFIC_GENERATOR_ENABLED=true
TRAFFIC_GENERATOR_INTERVAL_MS=2000

# CORS
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]
```

### Step 4: Start the Backend Server

```bash
# From the backend/ directory, with venv activated:
uvicorn app.main:app --port 8000 --reload
```

You should see:
```
INFO:     Application starting
INFO:     SQL Database initialized successfully
INFO:     Starting Detection Worker Loop...
INFO:     Starting Traffic Generator (interval: 2000ms)
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### Step 5: Set Up and Start the Frontend

Open a **new terminal**:

```bash
cd frontend

# Install Node.js dependencies
npm install

# Start the Vite development server
npm run dev
```

You should see:
```
  VITE v5.0.4  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.x.x:3000/
```

### Step 6: Verify

Open http://localhost:3000/dashboard in your browser.

### Shortcut: Using the Makefile

```bash
# First time — install all dependencies
make setup

# Every time — start backend + frontend together
make run
```

---

## Deployment — Option C: Google Cloud Run

For deploying to a public URL (e.g., for a hackathon submission or demo).

### Step 1: Authenticate with Google Cloud

```bash
# Login to your Google account
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  containerregistry.googleapis.com \
  cloudbuild.googleapis.com
```

### Step 2: Deploy the Backend

```bash
cd backend

# Deploy directly from source (Cloud Build handles the Dockerfile)
gcloud run deploy niramay-backend \
  --source=. \
  --port=8000 \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-env-vars="REDIS_HOST=localhost,REDIS_PORT=6379,TRAFFIC_GENERATOR_ENABLED=true,DETECTION_ANOMALY_THRESHOLD=0.4,CORS_ORIGINS=[\"*\"]" \
  --min-instances=1 \
  --memory=512Mi
```

> **Important:** `--min-instances=1` keeps the backend always running so the traffic generator and detection worker don't get killed by Cloud Run's scale-to-zero behavior.

### Step 3: Get the Backend URL

```bash
BACKEND_URL=$(gcloud run services describe niramay-backend \
  --region=us-central1 \
  --format="value(status.url)")

echo "Backend URL: $BACKEND_URL"
```

### Step 4: Deploy the Frontend

```bash
cd frontend

# Build the production bundle with the Cloud Run backend URL
VITE_API_URL=$BACKEND_URL npm run build
```

Now create a simple Dockerfile for serving the built frontend:

```dockerfile
# frontend/Dockerfile.prod
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
```

Create `frontend/nginx.conf`:

```nginx
server {
    listen 3000;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass BACKEND_URL_HERE;
    }
}
```

Deploy:

```bash
gcloud run deploy niramay-frontend \
  --source=. \
  --port=3000 \
  --region=us-central1 \
  --allow-unauthenticated \
  --memory=256Mi
```

### Step 5: Get the Frontend URL

```bash
FRONTEND_URL=$(gcloud run services describe niramay-frontend \
  --region=us-central1 \
  --format="value(status.url)")

echo "Dashboard: $FRONTEND_URL/dashboard"
```

### Step 6: Update Backend CORS

```bash
gcloud run services update niramay-backend \
  --region=us-central1 \
  --set-env-vars="CORS_ORIGINS=[\"$FRONTEND_URL\",\"http://localhost:3000\"]"
```

---

## Configuration Reference

All settings are in `backend/.env` and loaded via Pydantic Settings.

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_HOST` | `localhost` | Redis server hostname |
| `REDIS_PORT` | `6379` | Redis server port |
| `DETECTION_LATENCY_THRESHOLD_MS` | `300.0` | Latency threshold in milliseconds |
| `DETECTION_ANOMALY_THRESHOLD` | `0.4` | Minimum score (0.0–1.0) to flag as anomaly |
| `DETECTION_WEIGHT_LATENCY` | `0.25` | Weight for latency rule |
| `DETECTION_WEIGHT_STATUS` | `0.25` | Weight for status code rule |
| `DETECTION_WEIGHT_FAILURE` | `0.20` | Weight for failure type rule |
| `DETECTION_WEIGHT_RATE` | `0.15` | Weight for traffic rate rule |
| `DETECTION_WEIGHT_SILENCE` | `0.15` | Weight for silence detection rule |
| `TRAFFIC_GENERATOR_ENABLED` | `true` | Enable synthetic traffic for demo |
| `TRAFFIC_GENERATOR_INTERVAL_MS` | `2000` | Traffic generation interval |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | Allowed frontend origins |
| `FAILURE_SIMULATOR_ENABLED` | `true` | Enable failure injection |

---

## API Reference

Base URL: `http://localhost:8000`

### Observation Layer

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/observation/logs?limit=50` | Retrieve observation logs |
| `POST` | `/api/v1/observe` | Ingest external log (integration API) |

### Detection Layer

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/detection/anomalies?limit=30` | Retrieve detected anomalies |
| `GET` | `/api/v1/stats` | System health stats and aggregations |

### Healing Layer

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/healing/actions?limit=30` | Retrieve healing actions |

### Failure Simulator

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/failure-simulator/status` | Current simulator state |
| `GET` | `/api/v1/failure-simulator/scenarios` | List all failure scenarios |
| `POST` | `/api/v1/failure-simulator/scenarios/{name}/enable` | Enable a failure scenario |
| `POST` | `/api/v1/failure-simulator/scenarios/{name}/disable` | Disable a failure scenario |

### Utility

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/docs` | Swagger UI documentation |
| `GET` | `/redoc` | ReDoc documentation |

---

## Verification & Testing

### Quick Sanity Script

Run this after any deployment to verify the full pipeline:

```bash
#!/bin/bash
# Save as: verify.sh
# Usage: ./verify.sh [BASE_URL]

BASE_URL="${1:-http://localhost:8000}"

echo "╔══════════════════════════════════════════════╗"
echo "║   Niramay Pipeline Verification              ║"
echo "║   Target: $BASE_URL"
echo "╚══════════════════════════════════════════════╝"
echo ""

echo "1. Health Check..."
HEALTH=$(curl -s "$BASE_URL/health")
echo "   $HEALTH"
echo ""

echo "2. Observation Logs (last 3)..."
LOGS=$(curl -s "$BASE_URL/api/v1/observation/logs?limit=3" | python3 -m json.tool 2>/dev/null)
LOG_COUNT=$(echo "$LOGS" | grep -c '"id"')
echo "   Found $LOG_COUNT logs ✓"
echo ""

echo "3. Detection Anomalies..."
ANOMALIES=$(curl -s "$BASE_URL/api/v1/detection/anomalies?limit=5" | python3 -m json.tool 2>/dev/null)
ANO_COUNT=$(echo "$ANOMALIES" | grep -c '"anomaly_score"')
echo "   Found $ANO_COUNT anomalies ✓"
echo ""

echo "4. System Stats..."
curl -s "$BASE_URL/api/v1/stats" | python3 -m json.tool
echo ""

echo "5. Healing Actions..."
ACTIONS=$(curl -s "$BASE_URL/api/v1/healing/actions?limit=5" | python3 -m json.tool 2>/dev/null)
ACT_COUNT=$(echo "$ACTIONS" | grep -c '"action"')
echo "   Found $ACT_COUNT healing actions ✓"
echo ""

echo "═══════════════════════════════════════════════"
echo "Verification complete!"
```

```bash
# Run it
chmod +x verify.sh
./verify.sh http://localhost:8000
```

### Manual Browser Checks

1. Open **http://localhost:3000/dashboard** — verify stat tiles show real numbers
2. Open **http://localhost:3000/visualizer** — verify the 3-stage pipeline animation is running
3. Open **http://localhost:8000/docs** — verify Swagger UI loads with all endpoints listed

---

## Pipeline Deep Dive

### Detection Engine: 5-Rule Weighted Scoring

Each incoming log is evaluated by 5 independent rules. Each rule outputs a binary signal (0 or 1), which is multiplied by its weight:

| Rule | Weight | Trigger Condition |
|------|--------|-------------------|
| **Latency** | 0.25 | Response time > 300ms |
| **Status Code** | 0.25 | HTTP 5xx or 429 |
| **Failure Tag** | 0.20 | Middleware-injected failure |
| **Rate** | 0.15 | > 50 requests/minute to same endpoint |
| **Silence** | 0.15 | No traffic for > 30 seconds |

**Formula:** `anomaly_score = Σ(weight_i × trigger_i)` where `0 ≤ score ≤ 1.0`

### Severity Classification

| Score Range | Severity | LLM Escalation |
|-------------|----------|-----------------|
| 0.00 – 0.39 | Low | Never |
| 0.40 – 0.59 | Medium | Only if ≥2 rules fired |
| 0.60 – 0.79 | High | Always |
| 0.80 – 1.00 | Critical | Always |

### Healing Actions

| Action | Trigger | Effect |
|--------|---------|--------|
| `throttle_requests` | Rate anomaly | Reduces request throughput |
| `restart_service` | Server error | Attempts Docker container restart |
| `fallback_response` | Dependency failure | Returns cached/default response |

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Dashboard shows "—" for all stats | Backend unreachable | Check backend is running on port 8000 |
| Anomaly list is empty | Threshold too high | Set `DETECTION_ANOMALY_THRESHOLD=0.4` in `.env` |
| `503` errors on dashboard API calls | Failure simulator injecting on mgmt endpoints | Already fixed — `/api/v1/stats` is excluded |
| `redis.exceptions.ConnectionError` | Redis not running | Run `brew services start redis` or `docker compose up redis` |
| Frontend shows blank page | Build/TypeScript error | Check terminal for Vite errors, run `npm run build` to diagnose |
| SQLite `database is locked` | Multiple write connections | Restart backend (single-worker mode) |
| Cloud Run: worker stops randomly | Instance scaled to zero | Add `--min-instances=1` |
| Docker: `Cannot connect to Redis` | Backend started before Redis | Already handled by health check in `docker-compose.yml` |
| Port 8000 already in use | Previous process not killed | Run `lsof -i :8000 -t \| xargs kill -9` |
| Port 3000 already in use | Previous process not killed | Run `lsof -i :3000 -t \| xargs kill -9` |

---

## Integration API

External systems can push logs to Niramay for monitoring:

**Endpoint:** `POST /api/v1/observe`

```json
{
  "service": "order-service",
  "endpoint": "/v1/checkout",
  "method": "POST",
  "status_code": 500,
  "response_time": 450.5,
  "failure_type": "database_error",
  "request_id": "uuid-v4-string"
}
```

**Python Example:**

```python
import httpx

NIRAMAY_URL = "http://localhost:8000"

response = httpx.post(f"{NIRAMAY_URL}/api/v1/observe", json={
    "service": "payment-gateway",
    "endpoint": "/v1/charge",
    "method": "POST",
    "status_code": 504,
    "response_time": 12000.0,
    "failure_type": "timeout",
    "request_id": "pay-001-abc"
})

print(response.json())
# {"status": "accepted", "request_id": "pay-001-abc"}
```

---

## License

Part of the self-healing-cloud research project.
