# Healing Layer — Standalone Application

A self-contained application that extracts the complete **Observation → Detection → Healing** pipeline from the CRAVE food delivery failure simulator.

## What This Does

This application implements a three-phase self-healing cloud infrastructure pipeline:

1. **Observation Layer** — Middleware that captures all API traffic as structured logs (like a CCTV camera for your APIs)
2. **Detection Layer** — A weighted rule engine that scores anomalies from observation logs using latency, status code, and failure tag rules
3. **Healing Layer** — An automated service that decides on healing actions (restart service, retry request, throttle requests) based on detected anomaly severity

### Dashboard
A real-time monitoring dashboard built with React that visualizes all three phases in a 2×2 grid layout, plus an AI Copilot preview panel for future predictive healing capabilities.

## Quick Start

### Using Docker (Recommended)

```bash
# Windows
start.bat

# Or manually:
docker-compose up --build
```

Then open **http://localhost:3000**

### Manual Setup

#### Backend
```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Start Redis (required)
# Option A: Docker
docker run -d -p 6379:6379 redis:7-alpine

# Run the server
uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

Then open **http://localhost:3000**

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│ Traffic Generator├────►│ Failure Simulator     ├────►│ Demo Endpoints  │
│ (synthetic reqs) │     │ (injects failures)    │     │ (restaurants,   │
└─────────────────┘     └──────────────────────┘     │  orders, etc.)  │
                                                      └────────┬────────┘
                                                               │
                         ┌─────────────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │ Observation          │  Phase 1: Captures all traffic
              │ Middleware (CCTV)    │  → Redis: observation:logs
              └──────────┬──────────┘
                         │ pushes to queue
                         ▼
              ┌─────────────────────┐
              │ Detection Worker     │  Phase 2: Scores anomalies
              │ (background loop)   │  → Redis: observation:anomalies
              └──────────┬──────────┘
                         │ if anomaly detected
                         ▼
              ┌─────────────────────┐
              │ Healing Service      │  Phase 3: Decides + executes
              │ (automated actions) │  → Redis: healing:actions
              └─────────────────────┘
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/observation/logs` | Raw observation traffic logs |
| `GET /api/v1/detection/anomalies` | Detected anomalies with scores and stats |
| `GET /api/v1/healing/actions` | Executed healing action history |
| `GET /api/v1/failure-simulator/status` | Failure simulator status |
| `POST /api/v1/failure-simulator/scenarios/{name}/enable` | Enable a failure scenario |
| `POST /api/v1/failure-simulator/scenarios/{name}/disable` | Disable a failure scenario |
| `POST /api/v1/failure-simulator/reset` | Reset all scenarios |

## Tech Stack

- **Backend**: FastAPI (Python) + Redis
- **Frontend**: React 18 + TypeScript + Vite + Recharts + Framer Motion
- **Infrastructure**: Docker + Docker Compose

## Detection Rules

| Rule | Trigger | Score |
|------|---------|-------|
| **LatencyRule** | Response time > 300ms | +2 |
| **StatusCodeRule** | Status ≥ 500 (server error) | +3 |
| **StatusCodeRule** | Status = 429 (rate limit) | +2 |
| **FailureTagRule** | Failure injected by simulator | +3 |

Anomaly threshold: **Score ≥ 3**

## Healing Actions

| Anomaly Reason | Healing Action | Priority |
|---------------|----------------|----------|
| `database_error` | Restart Service | 3 (highest) |
| `server_error` | Restart Service | 3 |
| `rate_limit` | Throttle Requests | 2 |
| `high_latency` | Retry Request | 1 |
