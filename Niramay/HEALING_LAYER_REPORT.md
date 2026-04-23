# Niramay — Complete Technical Reference

> **Version:** 1.0.0  
> **Last Updated:** 2026-03-29  
> **Application Type:** Standalone Self-Healing Cloud Infrastructure Pipeline  
> **Source:** Extracted from the CRAVE Food Delivery API Failure Simulator

---

## Table of Contents

1. [Project Overview](#section-1--project-overview)
2. [Technology Stack](#section-2--technology-stack)
3. [Folder and File Structure](#section-3--folder-and-file-structure)
4. [Data: Origins, Shape, and Flow](#section-4--data-origins-shape-and-flow)
5. [Component Architecture](#section-5--component-architecture)
6. [Hooks and Logic Layer](#section-6--hooks-and-logic-layer)
7. [API and External Communication](#section-7--api-and-external-communication)
8. [Styling and Visual Design](#section-8--styling-and-visual-design)
9. [Configuration and Environment](#section-9--configuration-and-environment)
10. [How the Healing System Works End-to-End](#section-10--how-the-healing-system-works-end-to-end)
11. [Known Assumptions and Limitations](#section-11--known-assumptions-and-limitations)
12. [Developer Guide](#section-12--developer-guide)

---

## Section 1 — Project Overview

### What This Application Is

The Healing Layer Dashboard is a standalone, self-contained application that implements a three-phase self-healing cloud infrastructure pipeline. It continuously monitors API traffic, detects anomalous behavior using a weighted rule engine, and automatically executes corrective healing actions — all without human intervention. The entire system operates in real time, and every phase of the pipeline is visualized in a purpose-built dashboard that updates live via polling.

The three phases of the pipeline are:

1. **Observation** — Every API request that passes through the backend is captured by a middleware layer that records structured telemetry data. This is conceptually equivalent to a CCTV camera for APIs: it records what happened, when, how long it took, and whether it succeeded or failed. These logs are stored in Redis and surfaced in the dashboard's "Observation Feed" panel.

2. **Detection** — A background worker continuously pulls fresh observation logs from a Redis queue and evaluates them against a set of anomaly detection rules. Each rule can contribute a weighted score. If the cumulative score for a given log entry exceeds a configurable threshold (default: 3), the log is classified as an anomaly. The anomaly is enriched with its score and the reasons that triggered it, then stored in a separate Redis list. The dashboard's "Detection Alerts" panel visualizes these anomalies with severity coloring and statistical breakdowns.

3. **Healing** — When an anomaly is detected, the system immediately consults a healing decision engine that maps anomaly reasons to corrective actions. It selects the highest-priority action (e.g., "restart service" outranks "retry request") and simulates its execution. The result — including the action taken, its status, and a descriptive message — is stored in Redis and displayed in the dashboard's "Healing Actions" panel.

### What "Healing" Means in This System

In the context of this application, "healing" refers to the automated remediation of detected API failures. When the detection layer identifies that an API endpoint is exhibiting anomalous behavior — such as returning 500-series errors, responding with excessive latency, or being rate-limited — the healing layer makes an autonomous decision about what corrective action to take.

The healing actions are currently simulated rather than executed against real infrastructure. A "restart service" action, for example, does not actually restart a running process; instead, it waits 2 seconds (simulating the restart time) and returns a success message. This simulation layer exists because the application is designed as a demonstration of the healing architecture and decision-making logic, not as a production operations tool. However, the architecture is designed so that the simulated healing methods (`_sim_restart_service`, `_sim_retry_request`, `_sim_throttle_requests`) can be replaced with real infrastructure calls (e.g., Kubernetes pod restarts, circuit breaker toggles, rate limiter adjustments) without changing any other part of the system.

### What Problem It Solves

Traditional cloud infrastructure monitoring requires human operators to observe dashboards, interpret anomalies, and manually execute remediation steps. This application demonstrates an end-to-end automated alternative: the system observes its own behavior, detects problems, and heals itself — all within seconds of a failure occurring. The user-facing dashboard exists not for manual operation, but for visibility into what the automation is doing.

### Relationship to the Original Application

This application was extracted from a significantly larger codebase called **CRAVE** — a food delivery API failure simulator. The original CRAVE application is a full-stack web application with approximately 50+ files spanning restaurant management, order placement and tracking, payment processing, user authentication (JWT-based), driver dashboards, admin panels, a chaos engineering interface, and developer tools. It uses PostgreSQL with SQLAlchemy, Tailwind CSS, React Router, Zustand state management, React Query, and many other libraries.

The healing pipeline was one subsystem within CRAVE. It existed alongside — and was tightly coupled to — the food delivery business logic. For example, the observation middleware in CRAVE captured real API traffic from restaurant, order, and payment endpoints. The detection rules were tuned to catch failures in those specific business flows. The healing dashboard was one tab within a multi-panel application that included order management, restaurant browsing, and chaos engineering controls.

This standalone application surgically extracts only the observation, detection, and healing infrastructure. It removes all dependencies on the food delivery domain (restaurants, orders, users, payments, drivers) and replaces the real API traffic with a built-in synthetic traffic generator. The result is a self-contained system that demonstrates the healing pipeline architecture without requiring any of the original business logic.

### What Is Intentionally Excluded

The following components from the original CRAVE application are deliberately absent from this standalone extraction:

- **All business domain models** — Restaurant, Order, User, Payment, Driver, CartItem, and all associated SQLAlchemy models, Pydantic schemas, and CRUD operations.
- **PostgreSQL** — The original application used PostgreSQL as its primary database. The healing pipeline operates exclusively through Redis, so PostgreSQL was removed entirely.
- **Authentication and authorization** — JWT-based auth, login/register flows, token middleware, and all related infrastructure. All endpoints in the standalone app are public.
- **React Router** — The original app had multiple routes (`/`, `/orders`, `/admin`, `/developer`, `/chaos`, `/healing`). The standalone app renders only the healing dashboard, so routing is unnecessary.
- **Zustand stores** — The original app used Zustand for state management across multiple features (cart, user session, failure simulator, theme). The standalone dashboard manages its own state internally with React's `useState` and `useEffect`.
- **Tailwind CSS** — The original frontend was styled with Tailwind. The standalone dashboard uses vanilla CSS and inline React styles for zero-dependency rendering.
- **React Query** — The original app used `@tanstack/react-query` for server state management. The standalone dashboard uses a simpler `setInterval` + `axios` polling approach.
- **All other dashboards** — Chaos Engineer dashboard, Developer dashboard, Admin panel, API Tracker.
- **All UI chrome** — Navbar, footer, sidebar, custom cursor, layout wrappers, theme toggle.

---

## Section 2 — Technology Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| **Python** | 3.11+ | Runtime language |
| **FastAPI** | 0.104.1 | Async web framework — handles HTTP routing, middleware, and OpenAPI doc generation |
| **Uvicorn** | 0.24.0 (standard) | ASGI server — runs the FastAPI application with async event loop |
| **Redis** | 5.0.1 (python client) | Primary data store — all observation logs, anomalies, healing records, and the detection queue are stored in Redis lists and hashes |
| **Pydantic** | 2.5.0 | Data validation and settings management — used for request/response models, failure scenario configuration, and rule results |
| **Pydantic-Settings** | 2.1.0 | Environment variable loading — reads `.env` files and maps them to typed Python settings |
| **Structlog** | 23.2.0 | Structured JSON logging — all backend logs are emitted as machine-parseable JSON with timestamps |
| **HTTPX** | 0.25.2 | Async HTTP client — used by the traffic generator to make requests to the backend's own demo endpoints |

**Why FastAPI:** FastAPI was chosen because the healing pipeline is fundamentally asynchronous. The detection worker runs as a background `asyncio` task, the traffic generator runs as another background task, and the observation middleware must capture request timing without blocking. FastAPI's native async support and Starlette middleware system make this architecture natural. Additionally, FastAPI auto-generates interactive API documentation at `/docs`, which serves as a built-in reference for all healing layer endpoints.

**Why Redis:** The healing pipeline is a queue-based architecture. Observation logs are pushed onto a Redis list, the detection worker pops them off for processing, and results are pushed onto separate lists. Redis's `LPUSH`/`BRPOP` operations provide exactly the producer-consumer pattern needed. Redis also serves as the state backend — all anomaly statistics are stored in Redis hashes, and all data is automatically capped using `LTRIM` to prevent unbounded memory growth.

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| **React** | 18.2.0 | UI framework |
| **TypeScript** | 5.3.2 | Type-safe JavaScript with compile-time checking |
| **Vite** | 5.0.4 | Build tool and dev server with hot module replacement |
| **Recharts** | 2.10.3 | Charting library — renders the latency sparkline in Observation and the anomaly-by-type bar chart in Detection |
| **Framer Motion** | 12.34.3 | Animation library — provides `AnimatePresence` and `motion.div` for smooth list entry/exit animations |
| **Axios** | 1.6.2 | HTTP client — used for all API calls from the dashboard to the backend |

**Why no Tailwind:** The original CRAVE app used Tailwind CSS extensively. The standalone dashboard was deliberately built without Tailwind to eliminate the dependency and reduce build complexity. All styling is achieved through a combination of a minimal `index.css` global reset and inline `React.CSSProperties` objects defined in the `HealingDashboard.tsx` file. This makes the dashboard entirely self-contained — every style is co-located with the component that uses it.

**Why no React Router:** The standalone application has exactly one page — the healing dashboard. There is no navigation, no route transitions, and no URL-based state. Adding React Router would be unnecessary complexity.

**Why no Zustand/Redux/React Query:** The dashboard's state requirements are minimal: three arrays of data (logs, anomalies, healing actions), a boolean for live/paused mode, and a timestamp for last refresh. React's built-in `useState` and `useEffect` hooks handle this cleanly without external state management. The polling mechanism is a simple `setInterval` that calls three API endpoints every 3 seconds — far simpler than setting up React Query's cache invalidation and refetch policies.

### Build System

The frontend uses Vite as its build system. The `vite.config.ts` configures a development server on port 3000 with `strictPort: true` (the server will fail rather than auto-increment to 3001 if port 3000 is taken). File watching uses polling (`usePolling: true`) for Docker compatibility. A proxy rule forwards all `/api` requests to `http://localhost:8000` during development, eliminating CORS issues between the frontend dev server and the FastAPI backend.

TypeScript is configured with `"moduleResolution": "bundler"` and `"jsx": "react-jsx"`. The `noUnusedLocals` and `noUnusedParameters` checks are disabled to allow utility functions that may not be referenced in every build configuration.

### Infrastructure

| Technology | Purpose |
|---|---|
| **Docker** | Containerizes the backend (Python 3.11-slim) and frontend (Node 20-alpine) |
| **Docker Compose** | Orchestrates three services: Redis, Backend, and Frontend with health checks and dependency ordering |
| **Redis 7 Alpine** | In-memory data store container |

---

## Section 3 — Folder and File Structure

```
healing-layer-app/
│
├── docker-compose.yml          # Orchestrates Redis + Backend + Frontend containers
├── start.bat                   # Windows quick-start script (builds + runs + opens browser)
├── README.md                   # Project documentation with architecture diagrams
├── HEALING_LAYER_REPORT.md     # This file
│
├── backend/
│   ├── Dockerfile              # Python 3.11-slim container with uvicorn CMD
│   ├── requirements.txt        # 7 Python dependencies (pinned versions)
│   ├── .env.example            # Template for environment variables
│   │
│   └── app/
│       ├── __init__.py         # Package marker: "Healing Layer Application"
│       ├── main.py             # FastAPI entry point — middleware stack, startup events, routes
│       ├── traffic_generator.py # Background task: sends synthetic HTTP requests to demo endpoints
│       │
│       ├── api/
│       │   ├── __init__.py     # Package marker
│       │   └── routes.py       # All HTTP endpoints: observation, detection, healing, failure sim, demo
│       │
│       ├── core/
│       │   ├── __init__.py     # Package marker
│       │   ├── config.py       # Pydantic Settings: all app configuration from env vars
│       │   ├── logging.py      # Structlog JSON logging setup + log_request helper
│       │   ├── observation_store.py  # Redis client wrapper with in-memory fallback
│       │   ├── failure_config.py     # FailureSimulator engine: scenarios, probability, matching
│       │   └── failure_middleware.py  # Starlette middleware: intercepts requests to inject failures
│       │
│       ├── middleware/
│       │   ├── __init__.py     # Package marker
│       │   └── observation.py  # Starlette middleware: captures request/response telemetry → Redis
│       │
│       └── services/
│           ├── __init__.py     # Package marker
│           ├── detection_service.py  # Orchestrates all detection rules, computes anomaly score
│           ├── detection_worker.py   # Background asyncio loop: queue consumer → detection → healing
│           ├── healing_service.py    # Decision engine: maps reasons to actions, simulates execution
│           │
│           └── rules/
│               ├── __init__.py  # Package marker
│               ├── base.py      # Abstract BaseRule class + RuleResult Pydantic model
│               ├── latency.py   # LatencyRule: triggers when response_time_ms > threshold
│               ├── status.py    # StatusCodeRule: triggers on 5xx (score 3) or 429 (score 2)
│               └── failure.py   # FailureTagRule: triggers when failure_type != "none"
│
└── frontend/
    ├── Dockerfile              # Node 20-alpine container with npm run dev
    ├── package.json            # 5 runtime deps, 4 dev deps
    ├── tsconfig.json           # TypeScript compiler configuration
    ├── vite.config.ts          # Vite dev server config with API proxy
    ├── index.html              # HTML entry point with Inter font import
    │
    └── src/
        ├── vite-env.d.ts       # TypeScript reference for Vite's import.meta.env types
        ├── main.tsx            # React DOM root mount
        ├── App.tsx             # Root component — renders HealingDashboard directly
        ├── index.css           # Global CSS reset (scrollbar, selection, font)
        │
        └── pages/
            └── HealingDashboard.tsx  # 848-line monolithic dashboard: all panels, styles, logic
```

### File Criticality Analysis

| File | What Breaks If Removed |
|---|---|
| `main.py` | Application cannot start. This is the FastAPI entry point. |
| `config.py` | Every module that imports `settings` fails. All configuration ceases to load. |
| `observation_store.py` | All data storage breaks. No logs can be written or read. The observation middleware, detection worker, and all API routes depend on this. |
| `observation.py` (middleware) | No traffic is recorded. The pipeline has nothing to process. The dashboard shows empty panels. |
| `failure_config.py` | No failure scenarios exist. The failure middleware cannot inject failures. The pipeline has nothing anomalous to detect. |
| `failure_middleware.py` | Failures are never injected into requests. All traffic appears healthy. Detection and healing never trigger. |
| `detection_service.py` | Anomaly scoring breaks. The detection worker cannot evaluate logs. |
| `detection_worker.py` | The entire backend pipeline stops. Logs accumulate in the Redis queue but are never processed. No anomalies are detected, no healing actions are executed. |
| `healing_service.py` | No healing decisions are made. Anomalies are detected but never acted upon. |
| `rules/base.py` | All detection rules fail to import. The abstract base class and RuleResult model are required. |
| `rules/latency.py` | High-latency anomalies go undetected. |
| `rules/status.py` | Server errors (5xx) and rate limits (429) go undetected. |
| `rules/failure.py` | Failure-injected requests go undetected even though they have a `failure_type` tag. |
| `routes.py` | All API endpoints return 404. The dashboard cannot fetch any data. |
| `traffic_generator.py` | No synthetic traffic is generated. Without real user traffic, the pipeline has no data to process. The dashboard shows empty panels. |
| `HealingDashboard.tsx` | The entire UI disappears. This single file contains all four panels and all dashboard logic. |
| `main.tsx` | React never mounts. The page shows a blank white screen. |
| `App.tsx` | The HealingDashboard component is never rendered. |
| `index.css` | The page loses its dark background, font smoothing, scrollbar styling, and CSS reset. Elements render with browser defaults. |
| `vite-env.d.ts` | TypeScript compilation fails because `import.meta.env` is unrecognized. |
| `docker-compose.yml` | The one-command Docker deployment breaks. Each service must be started manually. |

---

## Section 4 — Data: Origins, Shape, and Flow

### 4.1 — Where Does the Data Come From?

The healing layer application has exactly **five distinct data sources**. Unlike many web applications that pull data from external APIs or databases with pre-existing records, this application generates all of its own data through an internal feedback loop.

#### Source 1: The Traffic Generator (`traffic_generator.py`)

The traffic generator is a background `asyncio` task that starts automatically when the FastAPI server boots (controlled by `TRAFFIC_GENERATOR_ENABLED`). It uses the `httpx` async HTTP client to send requests to the backend's own demo endpoints at a configurable interval (default: every 2 seconds with ±50% random jitter).

The generator maintains an array of six demo endpoint targets:

```python
DEMO_ENDPOINTS = [
    ("GET",  "/api/v1/demo/restaurants"),
    ("GET",  "/api/v1/demo/orders"),
    ("POST", "/api/v1/demo/orders"),
    ("GET",  "/api/v1/demo/payments"),
    ("POST", "/api/v1/demo/payments/process"),
    ("GET",  "/api/v1/demo/delivery/status"),
]
```

Endpoints are selected using weighted random choice with weights `[3, 2, 2, 1, 1, 1]`, meaning restaurant and order endpoints are hit more frequently than payment and delivery endpoints. The traffic generator does not interpret the responses; its sole purpose is to create HTTP traffic that flows through the middleware stack.

#### Source 2: The Failure Simulator (`failure_config.py` + `failure_middleware.py`)

The failure simulator is a stateful engine that decides, for each incoming request, whether to inject a failure. It contains nine pre-configured failure scenarios (rate limiting, auth expiration, payment timeout, database error, validation error, Stripe dependency, maps dependency, config error, and service overload). Each scenario has a `probability` field (0.0–1.0) that determines how often it fires when active.

On application startup, two scenarios are automatically enabled: `database_error` (probability 0.2, targets `/api/v1/restaurants/*` and `/api/v1/orders/*`) and `service_overload` (probability 0.3, targets all endpoints). This means roughly 20-30% of traffic generator requests will be intercepted and failed before reaching the demo endpoint handler.

When a failure is injected, the middleware sets `request.state.observation_failure_type` to the scenario name (e.g., `"database_error"`, `"service_overload"`). This tag is later read by the observation middleware and embedded in the log entry, providing the detection layer with a direct signal that the failure was intentional.

#### Source 3: The Observation Middleware (`middleware/observation.py`)

The observation middleware sits in the Starlette middleware stack and intercepts every HTTP request/response cycle. For each non-excluded request, it constructs a structured log entry containing:

- `timestamp` — ISO 8601 UTC timestamp captured before request processing
- `endpoint` — The URL path
- `method` — HTTP method (GET, POST, etc.)
- `status_code` — The response status code (200, 500, 503, etc.)
- `response_time_ms` — Wall-clock duration in milliseconds, measured with `time.monotonic()`
- `request_id` — A UUID v4 generated per-request for tracing
- `service_name` — Hardcoded to `"healing-layer"`
- `failure_type` — Read from `request.state.observation_failure_type`, defaults to `"none"`

Excluded paths (`/api/v1/observation/logs`, `/api/v1/detection/anomalies`, `/api/v1/healing/actions`, `/health`, `/`, `/docs`, `/redoc`, `/openapi.json`) are skipped to prevent recursive observation of the dashboard's own polling requests.

#### Source 4: The Detection Worker (`detection_worker.py`)

The detection worker does not originate data — it transforms it. It pops raw observation logs from the `observation:pending_detection` Redis queue, runs them through the `DetectionService` rule engine, and enriches them with anomaly scores and reasons. If a log is classified as an anomaly, the worker also invokes the `HealingService` to decide and execute a healing action. The enriched log (now including `is_anomaly`, `anomaly_score`, `anomaly_reasons`, and optionally `healing`) is stored in the `observation:anomalies` Redis list. Healing action records are stored separately in the `healing:actions` list.

#### Source 5: Hardcoded / Static Data

The frontend contains one source of hardcoded data: the `AI_RECOMMENDATIONS` array in `HealingDashboard.tsx`. This is a static list of three simulated AI recommendations displayed in the AI Copilot panel. These recommendations do not change at runtime and are not fetched from any API. They exist as a preview of future AI-powered predictive healing capabilities.

```typescript
const AI_RECOMMENDATIONS = [
  { id: 1, severity: 'high',   title: 'Predicted: Database connection pool exhaustion in ~12 min', ... },
  { id: 2, severity: 'medium', title: 'Anomaly cluster detected on /api/v1/orders', ... },
  { id: 3, severity: 'low',    title: 'Optimization: 34% of retry_request actions are redundant', ... },
];
```

### 4.2 — Data Shapes and Types

#### Observation Log (Backend → Frontend)

Produced by `ObservationMiddleware`, stored in Redis key `observation:logs`, served by `GET /api/v1/observation/logs`.

```typescript
interface ObservationLog {
  timestamp: string;        // ISO 8601 UTC, e.g. "2026-03-29T14:09:36.379486+00:00"
  endpoint: string;         // URL path, e.g. "/api/v1/demo/restaurants"
  method: string;           // HTTP method: "GET", "POST", etc.
  status_code: number;      // HTTP status: 200, 500, 503, 429, etc.
  response_time_ms: number; // Duration in milliseconds, e.g. 2.3
  request_id: string;       // UUID v4, e.g. "a1b2c3d4-e5f6-..."
  service_name: string;     // Always "healing-layer" (backend field, not in TS interface)
  failure_type: string;     // "none" for healthy, or scenario name like "database_error"
}
```

#### Anomaly Data (Backend → Frontend)

Produced by the detection worker, stored in Redis key `observation:anomalies`, served by `GET /api/v1/detection/anomalies`.

```typescript
interface AnomalyData {
  total: number;            // Total anomalies in Redis
  filtered: number;         // Count after applying query filters
  anomalies: Array<{
    // All fields from ObservationLog, plus:
    anomaly_score: number;    // Cumulative score from all triggered rules (e.g., 6)
    anomaly_reasons: string[];// Which rules triggered: ["server_error", "database_error"]
    is_anomaly: boolean;      // Always true (only anomalies are stored)
    healing?: {               // Present if a healing action was executed
      healing_action: string; // "restart_service", "retry_request", "throttle_requests"
      status: string;         // "success" or "skipped"
      message: string;        // Human-readable result description
      timestamp: string;      // ISO 8601 when healing was executed
    };
  }>;
  stats: {
    by_endpoint: Record<string, number>;  // e.g., {"/api/v1/demo/restaurants": 15}
    by_type: Record<string, number>;      // e.g., {"server_error": 23, "database_error": 12}
  };
}
```

#### Healing Action (Backend → Frontend)

Produced by `HealingService`, stored in Redis key `healing:actions`, served by `GET /api/v1/healing/actions`.

```typescript
interface HealingAction {
  healing_action: string;  // "restart_service", "retry_request", "throttle_requests", "none"
  status: string;          // "success" or "skipped"
  timestamp: string;       // ISO 8601 UTC
  message: string;         // e.g., "Service successfully restarted. Healthy traffic resumed."
}
```

#### Rule Result (Internal Backend)

Produced by each detection rule, consumed by `DetectionService`. Never exposed via API directly.

```python
class RuleResult(BaseModel):
    triggered: bool           # Whether this rule flagged the log
    reason: Optional[str]     # Human identifier: "high_latency", "server_error", "rate_limit", etc.
    score: int = 0            # Weighted contribution to total anomaly score
```

#### Failure Scenario (Backend Configuration)

Defined in `failure_config.py`, served by `GET /api/v1/failure-simulator/scenarios`.

```python
class FailureScenario(BaseModel):
    enabled: bool = False                 # Whether this scenario is active
    failure_type: FailureType             # Enum: rate_limit, timeout, server_error, etc.
    probability: float                    # 0.0–1.0 chance of triggering per matching request
    endpoints: List[str] = ["*"]          # Glob patterns for URL matching
    methods: List[str] = ["GET", "POST", "PUT", "PATCH", "DELETE"]
    rate_limit_requests: int = 10         # For rate_limit type: max requests per window
    rate_limit_window: int = 60           # For rate_limit type: window in seconds
    timeout_seconds: float = 5.0          # For timeout type: simulated delay
    error_message: Optional[str] = None   # Custom error message
    status_code: Optional[int] = None     # Custom status code override
```

### 4.3 — Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (FastAPI on port 8000)                       │
│                                                                             │
│  ┌──────────────────┐                                                       │
│  │ Traffic Generator │──── HTTP requests ────┐                              │
│  │ (asyncio task)    │   every ~2s (jittered) │                              │
│  └──────────────────┘                        │                              │
│                                              ▼                              │
│                                   ┌────────────────────┐                    │
│                                   │ ObservationMiddleware│                   │
│                                   │ (captures telemetry) │                   │
│                                   └─────────┬──────────┘                    │
│                                             │                               │
│                                   ┌─────────▼──────────┐                    │
│                                   │ FailureMiddleware    │                   │
│                                   │ (may inject failure) │                   │
│                                   └─────────┬──────────┘                    │
│                                             │                               │
│                                   ┌─────────▼──────────┐                    │
│                                   │ Demo Endpoint        │                   │
│                                   │ (returns mock JSON)  │                   │
│                                   └─────────┬──────────┘                    │
│                                             │                               │
│                    ┌────────────────────────┘                               │
│                    │ Response flows back through middleware stack            │
│                    ▼                                                        │
│         ObservationMiddleware captures status_code + response_time_ms       │
│                    │                                                        │
│                    ▼                                                        │
│         ┌──────────────────────────────────┐                                │
│         │ ObservationStore.push_log()       │                                │
│         │ Redis LPUSH to:                  │                                │
│         │  • observation:logs              │ ◄── main storage               │
│         │  • observation:pending_detection  │ ◄── queue for worker           │
│         └──────────────────────────────────┘                                │
│                                                                             │
│         ┌──────────────────────────────────┐                                │
│         │ Detection Worker (asyncio loop)   │                                │
│         │ Redis BRPOP from:                │                                │
│         │  observation:pending_detection    │                                │
│         │                                  │                                │
│         │ 1. DetectionService.detect()     │                                │
│         │    ├─ LatencyRule.evaluate()      │  score +2 if latency > 300ms  │
│         │    ├─ StatusCodeRule.evaluate()   │  score +3 if 5xx, +2 if 429   │
│         │    └─ FailureTagRule.evaluate()   │  score +3 if failure_type set │
│         │                                  │                                │
│         │ 2. If score >= 3 → IS ANOMALY    │                                │
│         │    └─ HealingService.decide()     │                                │
│         │       └─ HealingService.execute() │                                │
│         │                                  │                                │
│         │ 3. Redis LPUSH results to:       │                                │
│         │    • observation:anomalies       │                                │
│         │    • healing:actions             │                                │
│         │    • anomaly_stats:endpoint      │                                │
│         │    • anomaly_stats:type          │                                │
│         └──────────────────────────────────┘                                │
│                                                                             │
│         ┌──────────────────────────────────┐                                │
│         │ API Routes (GET endpoints)        │                                │
│         │ /api/v1/observation/logs          │ Redis LRANGE observation:logs  │
│         │ /api/v1/detection/anomalies       │ Redis LRANGE + HGETALL stats  │
│         │ /api/v1/healing/actions            │ Redis LRANGE healing:actions   │
│         └──────────────────────────────────┘                                │
└─────────────────────────────────────────────────────────────────────────────┘
         │   │   │
         │   │   │  HTTP responses (JSON)
         ▼   ▼   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FRONTEND (React on port 3000)                        │
│                                                                             │
│  ┌──────────────────────────────────────────────┐                           │
│  │ HealingDashboard (root component)             │                           │
│  │                                               │                           │
│  │ fetchData() called every 3s via setInterval   │                           │
│  │ └─ Promise.allSettled([                       │                           │
│  │      axios.get("/api/v1/observation/logs"),   │                           │
│  │      axios.get("/api/v1/detection/anomalies"),│                           │
│  │      axios.get("/api/v1/healing/actions"),    │                           │
│  │    ])                                         │                           │
│  │                                               │                           │
│  │ State:                                        │                           │
│  │  logs: ObservationLog[]    → ObservationFeed  │                           │
│  │  anomalyData: AnomalyData → DetectionAlerts   │                           │
│  │  healingActions: []        → HealingActions    │                           │
│  │  isLive: boolean           → Toggle control   │                           │
│  │  lastRefresh: Date         → Timestamp display │                           │
│  │                                               │                           │
│  │ Derived:                                      │                           │
│  │  totalRequests = logs.length                  │                           │
│  │  failureCount = logs.filter(≥400).length      │                           │
│  │  avgLatency = mean(logs.response_time_ms)     │                           │
│  │  successRate = (1 - failures/total) * 100     │                           │
│  └──────────────────────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.4 — State Management

The frontend uses **React's built-in state primitives exclusively** — no external state management library.

#### Primary State (in `HealingDashboard` component)

| State Variable | Type | Initial Value | Setter | Updated By | Consumed By |
|---|---|---|---|---|---|
| `logs` | `ObservationLog[]` | `[]` | `setLogs` | `fetchData()` on API response | `ObservationFeed`, stat cards |
| `anomalyData` | `AnomalyData \| null` | `null` | `setAnomalyData` | `fetchData()` on API response | `DetectionAlerts`, stat cards |
| `healingActions` | `HealingAction[]` | `[]` | `setHealingActions` | `fetchData()` on API response | `HealingActions`, stat cards |
| `isLive` | `boolean` | `true` | `setIsLive` | User clicking the Live toggle | `useEffect` polling setup |
| `lastRefresh` | `Date` | `new Date()` | `setLastRefresh` | `fetchData()` after every poll | Header timestamp display |

#### Local State (in `AICopilot` component)

| State Variable | Type | Initial Value |
|---|---|---|
| `features` | `{ predictive: boolean, rootCause: boolean, smartPriority: boolean }` | All `false` |
| `chatInput` | `string` | `''` |
| `chatMessages` | `Array<{ role: 'user' \| 'ai', text: string }>` | Contains one initial AI greeting |

#### Derived State (computed inline, not stored)

| Derived Value | Computation | Location |
|---|---|---|
| `totalRequests` | `logs.length` | `HealingDashboard` body |
| `failureCount` | `logs.filter(l => l.status_code >= 400).length` | `HealingDashboard` body |
| `avgLatency` | `sum(logs.response_time_ms) / totalRequests` | `HealingDashboard` body |
| `successRate` | `(1 - failureCount / totalRequests) * 100` | `HealingDashboard` body |
| `sparkData` | `logs.slice(0, 20).reverse().map(...)` | `ObservationFeed` body |
| `chartData` | `Object.entries(anomalyData.stats.by_type).map(...)` | `DetectionAlerts` body |
| `byType` | `actions.reduce(...)` — counts actions by type | `HealingActions` body |

#### Refs

| Ref | Type | Purpose |
|---|---|---|
| `timerRef` | `ReturnType<typeof setInterval>` | Stores the polling interval ID so it can be cleared on pause or unmount |
| `chatEndRef` | `HTMLDivElement` | Auto-scrolls the AI chat window to the bottom when new messages appear |

#### Backend State (in-memory singletons)

The backend maintains state through four global singleton objects:

1. **`observation_store`** (ObservationStore) — Holds the Redis client connection and an in-memory `deque(maxlen=1000)` fallback. State: `_redis`, `_redis_connected`, `_fallback_store`.
2. **`failure_simulator`** (FailureSimulator) — Holds all failure scenario configurations, request/failure counters, and rate limit tracking. State: `state` (FailureSimulatorState), `_request_counters`, `_lock`.
3. **`detection_service`** (DetectionService) — Holds the list of rule instances and the score threshold. Stateless per-evaluation.
4. **`healing_service`** (HealingService) — Holds the reason-to-action mapping. Stateless per-evaluation.

---

## Section 5 — Component Architecture

The frontend is structured as a single-file component hierarchy within `HealingDashboard.tsx`. There are no separate component files — all components are defined in this one 848-line file. This was a deliberate design choice: the dashboard is a self-contained monitoring view with no shared components, no routing, and no reuse scenarios. Co-locating everything eliminates import chains and makes the entire UI graspable in a single reading.

### Component Hierarchy

```
ReactDOM.createRoot (main.tsx)
└── App (App.tsx)
    └── HealingDashboard (HealingDashboard.tsx) ← root dashboard component
        ├── PulsingDot × 2 (header + observation feed)
        ├── Toggle (live/paused control)
        ├── StatCard × 5 (Total Requests, Success Rate, Avg Latency, Anomalies, Healing Actions)
        ├── ObservationFeed (Panel 1 — top-left)
        │   ├── PulsingDot (header live indicator)
        │   ├── Recharts AreaChart (latency sparkline)
        │   ├── EmptyState (if no logs)
        │   └── motion.div × N (animated log rows)
        ├── DetectionAlerts (Panel 2 — top-right)
        │   ├── Recharts BarChart (anomalies by type)
        │   ├── EmptyState (if no anomalies)
        │   └── motion.div × N (animated anomaly cards)
        ├── HealingActions (Panel 3 — bottom-left)
        │   ├── Badge summary (action type counts)
        │   ├── EmptyState (if no actions)
        │   └── motion.div × N (animated action items)
        └── AICopilot (Panel 4 — bottom-right)
            ├── Toggle × 3 (feature toggles)
            ├── motion.div × 3 (AI recommendation cards)
            └── Chat interface (input + message list)
```

### Component Specifications

#### `HealingDashboard` (Root)

- **Renders:** Page wrapper, header with title and controls, five stat cards, and a 2×2 grid of panels.
- **Props:** None. This is the root component.
- **Internal State:** `logs`, `anomalyData`, `healingActions`, `isLive`, `lastRefresh` (see Section 4.4).
- **Side Effects:** Three `useEffect` hooks: (1) initial data fetch, (2) polling interval setup/teardown controlled by `isLive`, (3) keyframe stylesheet injection/cleanup.
- **Dependencies:** All four panel components, `StatCard`, `PulsingDot`, `Toggle`.

#### `ObservationFeed`

- **Renders:** Panel with header, latency sparkline chart, table header, and animated list of observation log rows.
- **Props:** `{ logs: ObservationLog[] }`.
- **Internal State:** None.
- **Derived Data:** `sparkData` — the 20 most recent logs reversed and mapped to `{i, v}` objects for the Recharts AreaChart.
- **Conditional Rendering:** If `logs.length === 0`, renders `EmptyState`. If `sparkData.length > 2`, renders the latency sparkline. Each row shows: method badge (color-coded), endpoint path (truncated with `text-overflow: ellipsis`), status code (color-coded: green for 2xx, amber for 4xx, red for 5xx), latency (amber if >300ms), and relative timestamp.

#### `DetectionAlerts`

- **Renders:** Panel with header, anomaly-by-type bar chart, and animated list of anomaly cards.
- **Props:** `{ data: AnomalyData | null }`.
- **Internal State:** None.
- **Derived Data:** `chartData` — transforms `data.stats.by_type` Record into an array of `{name, count}` objects for the Recharts BarChart.
- **Conditional Rendering:** If `data` is null or `data.anomalies.length === 0`, renders `EmptyState`. Each anomaly card shows: severity score badge (color varies by score: blue <3, amber 3-4, red ≥5), HTTP method badge, endpoint path, relative timestamp, and a row of reason badges (e.g., "server error", "database error").

#### `HealingActions`

- **Renders:** Panel with header, action type summary badges, and animated list of healing action items.
- **Props:** `{ actions: HealingAction[] }`.
- **Internal State:** None.
- **Derived Data:** `byType` — a `Record<string, number>` counting how many times each action type has been executed, computed via `actions.reduce()`.
- **Conditional Rendering:** If `actions.length === 0`, renders `EmptyState`. Each action item shows: emoji icon (🔄 for restart, ↩️ for retry, 🛑 for throttle), action name (capitalized, underscores replaced with spaces), status badge (green for "success", amber otherwise), message text, and relative timestamp.

#### `AICopilot`

- **Renders:** Panel with feature toggles, AI recommendation cards, and a chat interface.
- **Props:** None. This component is entirely self-contained.
- **Internal State:** `features` (three boolean toggles), `chatInput` (string), `chatMessages` (array of `{role, text}` objects).
- **Side Effects:** One `useEffect` that auto-scrolls the chat container when `chatMessages` changes.
- **Behavior:** The chat interface is a mockup. When the user types a message and presses Enter or clicks Send, the message is added to `chatMessages` as a user message. After a 1200ms `setTimeout`, a randomly selected canned response is added as an AI message. The feature toggles and recommendation action buttons are functional UI elements that do not connect to any backend — they exist as a preview of planned AI capabilities.

#### `StatCard`

- **Renders:** A compact card showing a label, a large numeric value, and an optional subtitle.
- **Props:** `{ label: string, value: string | number, sub?: string, color?: string }`.
- **Internal State:** None.

#### `PulsingDot`

- **Renders:** An 8×8 pixel circle with a CSS animation that pulses its opacity and scale.
- **Props:** None.
- **Internal State:** None.

#### `Toggle`

- **Renders:** A 36×20 pixel toggle switch track with a 16×16 pixel knob.
- **Props:** `{ on: boolean, onToggle: () => void }`.
- **Internal State:** None. State is lifted to the parent.

#### `EmptyState`

- **Renders:** A centered column with a large emoji icon, a descriptive text, and "Waiting for traffic data..." subtitle.
- **Props:** `{ icon: string, text: string }`.
- **Internal State:** None.

### Communication Patterns

All communication between components uses **props drilling** from `HealingDashboard` to its children. There is no React Context, no event bus, and no shared state outside the root component. The data flow is strictly unidirectional:

1. `HealingDashboard` fetches data via `fetchData()`.
2. Data is stored in local state (`logs`, `anomalyData`, `healingActions`).
3. State is passed down as props to `ObservationFeed`, `DetectionAlerts`, and `HealingActions`.
4. Child components render the data. They never modify it.

The `AICopilot` component is an exception — it manages its own state entirely and does not receive or emit any data to/from `HealingDashboard`.

---

## Section 6 — Hooks and Logic Layer

### React Hooks Used

The application uses five standard React hooks across two components:

#### In `HealingDashboard`:

**`useCallback(fetchData, [])`**

Creates a stable reference to the `fetchData` function. This function calls `Promise.allSettled()` with three concurrent `axios.get()` requests. `allSettled` is used instead of `Promise.all()` so that a failure in one endpoint (e.g., detection anomalies) does not prevent the other two from updating. Each settled result is checked individually: if fulfilled, the corresponding state setter is called. The empty dependency array `[]` means this function reference never changes across re-renders.

**`useEffect(() => { fetchData() }, [fetchData])`**

Triggers the initial data fetch when the component mounts. Because `fetchData` is memoized with `useCallback`, this effect runs exactly once.

**`useEffect(() => { if (isLive) { timerRef.current = setInterval(fetchData, POLL_INTERVAL) } return () => { clearInterval(timerRef.current) } }, [isLive, fetchData])`**

Sets up polling. When `isLive` is `true`, a `setInterval` is created that calls `fetchData` every 3000ms (configured via the `POLL_INTERVAL` constant). When `isLive` changes to `false`, the cleanup function clears the interval. When the component unmounts, the cleanup also fires, preventing memory leaks.

**`useEffect(() => { /* inject keyframes */ return () => { /* remove keyframes */ } }, [])`**

On mount, creates a `<style>` element with id `hl-dashboard-styles` and appends it to `document.head`. The style contains CSS keyframe animations (`pulse-live`, `shimmer`, `float-in`), scrollbar styling, hover effects, glow effects, toggle track styling, and a responsive media query. On unmount, the style element is removed. This pattern is used because the animations are defined as a template literal string that references the `C` color palette constants, making them impossible to express in a static CSS file without a preprocessor.

#### In `AICopilot`:

**`useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])`**

Scrolls the chat container to the bottom whenever a new message is added. The `chatEndRef` points to an empty `<div>` rendered at the bottom of the message list.

### Utility Functions

All utility functions are defined at the module scope in `HealingDashboard.tsx`:

**`timeAgo(ts: string): string`**

Converts an ISO 8601 timestamp to a human-readable relative time string. Computes the difference between `Date.now()` and the parsed timestamp in milliseconds. Returns `"just now"` for <1s, `"Ns ago"` for <60s, `"Nm ago"` for <60m, `"Nh ago"` for anything larger. Used by every panel to display timestamps in a compact format.

**`statusColor(code: number): string`**

Maps an HTTP status code to a hex color string. ≥500 returns red (`#ef4444`), ≥400 returns amber (`#f59e0b`), 200-299 returns cyan (`#22d3ee`), anything else returns muted blue (`#6b86b8`). Used in ObservationFeed for status code coloring and in DetectionAlerts for badge theming.

**`methodColor(method: string): string`**

Maps an HTTP method string to a hex color. GET → blue, POST → cyan, PUT/PATCH → amber, DELETE → red. Falls back to muted blue. Used for method badges in ObservationFeed and DetectionAlerts.

**`severityColor(score: number): string`**

Maps an anomaly score to a severity color. ≥5 → red (critical), ≥3 → amber (warning), <3 → blue (informational). Used in DetectionAlerts to color the score badges and left borders of anomaly cards.

**`actionIcon(action: string): string`**

Maps a healing action type to an emoji icon. `restart_service` → 🔄, `retry_request` → ↩️, `throttle_requests` → 🛑, `none` → ⏭️. Falls back to ⚙️. Used in HealingActions panel for the icon column.

### Backend Business Logic

#### Detection Rule Evaluation (`DetectionService.detect_anomaly`)

The detection service iterates through its ordered list of rules (`[LatencyRule, StatusCodeRule, FailureTagRule]`), calling `evaluate(log)` on each. Each rule returns a `RuleResult` with `triggered`, `reason`, and `score`. If triggered, the reason is appended to `anomaly_reasons` and the score is added to `total_score`. After all rules evaluate, if `total_score >= self.score_threshold` (default 3), the log is classified as an anomaly.

A single log can trigger multiple rules simultaneously. For example, a request that returned a 503 status code (score +3 from StatusCodeRule with reason `"server_error"`) and was injected by the `service_overload` failure scenario (score +3 from FailureTagRule with reason `"service_overload"`) would receive a total score of 6 with reasons `["server_error", "service_overload"]`.

#### Healing Decision Logic (`HealingService.decide_healing_action`)

The healing service uses a priority-based action selection algorithm. It maintains a mapping from anomaly reasons to healing actions:

```python
self.rules = {
    "database_error":  "restart_service",
    "server_error":    "restart_service",
    "high_latency":    "retry_request",
    "rate_limit":      "throttle_requests"
}
```

And a priority ranking:

```python
action_priority = {
    "restart_service":   3,  # highest
    "throttle_requests": 2,
    "retry_request":     1,
    "none":              0   # lowest
}
```

When multiple anomaly reasons are present (e.g., `["server_error", "high_latency"]`), the service maps each reason to its action, looks up the action's priority, and selects the action with the highest priority. In this example, `server_error` → `restart_service` (priority 3) beats `high_latency` → `retry_request` (priority 1), so `restart_service` is chosen.

#### Healing Execution (Simulated)

Each healing action calls a simulated async method:

- `_sim_restart_service()` — Sleeps for 2.0 seconds, returns `"Service successfully restarted. Healthy traffic resumed."`
- `_sim_retry_request()` — Sleeps for 0.5 seconds, returns `"Failed request successfully retried and bypassed degraded node."`
- `_sim_throttle_requests()` — Sleeps for 0.1 seconds, returns `"API Gateway rate-limits temporarily tightened to shed excess load."`

The sleep durations are intentional — they simulate the real-world time cost of each action type. A service restart takes longer than adjusting a rate limiter.

---

## Section 7 — API and External Communication

### API Architecture

All endpoints are consolidated in `app/api/routes.py` under a single `APIRouter` instance mounted at `/api/v1`. The API is organized into five logical groups, each marked with FastAPI tags for OpenAPI documentation.

### Endpoint Catalog

#### Observation Endpoints

| Method | Path | Request | Response | Purpose |
|---|---|---|---|---|
| `GET` | `/api/v1/observation/logs` | `?limit=100` (1–1000) | `ObservationLog[]` | Returns the most recent observation logs from Redis (`observation:logs`) or in-memory fallback |

**Implementation:** Calls `observation_store.get_logs(limit)`. If Redis is available, executes `LRANGE observation:logs 0 {limit-1}` and deserializes each entry from JSON. If Redis is unavailable, returns entries from the in-memory `deque` fallback.

#### Detection Endpoints

| Method | Path | Request | Response | Purpose |
|---|---|---|---|---|
| `GET` | `/api/v1/detection/anomalies` | `?limit=50&min_score=0&type=&endpoint=` | `AnomalyData` | Returns detected anomalies with filtering and aggregate statistics |

**Implementation:** Fetches all entries from `observation:anomalies` via `LRANGE`. Applies in-memory filtering based on query parameters: `min_score` filters by minimum anomaly score, `type` filters by anomaly reason string, `endpoint` filters by exact endpoint path match. Also fetches aggregate statistics from Redis hashes `anomaly_stats:endpoint` and `anomaly_stats:type` via `HGETALL`. Returns the combined structure with `total`, `filtered`, `anomalies`, and `stats`.

#### Healing Endpoints

| Method | Path | Request | Response | Purpose |
|---|---|---|---|---|
| `GET` | `/api/v1/healing/actions` | `?limit=50` (1–1000) | `HealingAction[]` | Returns the history of executed healing actions |

**Implementation:** Calls `LRANGE healing:actions 0 {limit-1}` on Redis. If Redis is unavailable, returns an empty array.

#### Failure Simulator Endpoints

| Method | Path | Request | Response | Purpose |
|---|---|---|---|---|
| `GET` | `/api/v1/failure-simulator/status` | None | Simulator metrics | Returns enabled state, active/total scenarios, request/failure counts, success/failure rates |
| `GET` | `/api/v1/failure-simulator/scenarios` | None | Scenario map | Lists all 9 failure scenarios with their configuration |
| `POST` | `/api/v1/failure-simulator/scenarios/{name}/enable` | Path: `name` | Confirmation | Enables a named failure scenario |
| `POST` | `/api/v1/failure-simulator/scenarios/{name}/disable` | Path: `name` | Confirmation | Disables a named failure scenario |
| `POST` | `/api/v1/failure-simulator/reset` | None | Confirmation | Disables all scenarios and resets global failure rate to 0 |
| `POST` | `/api/v1/failure-simulator/toggle` | `?enabled=true/false` | Confirmation | Enables or disables the entire failure simulator |
| `POST` | `/api/v1/failure-simulator/global-rate` | `?rate=0.0–1.0` | Confirmation | Sets a global failure rate applied to all requests regardless of scenarios |

#### Demo Traffic Endpoints

| Method | Path | Response | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/demo/restaurants` | Static JSON with 3 restaurants | Target for traffic generator — provides realistic endpoint paths |
| `GET` | `/api/v1/demo/orders` | Static JSON with 2 orders | Target for traffic generator |
| `POST` | `/api/v1/demo/orders` | Static JSON confirmation | Target for traffic generator |
| `GET` | `/api/v1/demo/payments` | Static JSON payment record | Target for traffic generator |
| `POST` | `/api/v1/demo/payments/process` | Static JSON transaction | Target for traffic generator |
| `GET` | `/api/v1/demo/delivery/status` | Static JSON delivery status | Target for traffic generator |

The demo endpoints return hardcoded JSON. They do not connect to a database, do not validate input, and do not maintain state. Their sole purpose is to exist as realistic API paths that the traffic generator can hit, causing the request to flow through the middleware stack (ObservationMiddleware → FailureSimulationMiddleware → endpoint handler) and into the pipeline.

### Authentication

None. All endpoints are public. The original CRAVE application used JWT bearer tokens for authentication. This was removed during extraction because the standalone healing layer has no user concept and no sensitive data to protect.

### Error Handling

The frontend uses `Promise.allSettled()` for all API calls, which means individual endpoint failures do not cascade. If the anomalies endpoint returns a 500 error but logs and healing actions succeed, only the anomalies panel shows stale data — the other two panels update normally.

The backend has a global exception handler registered via `@app.exception_handler(Exception)` that catches all unhandled exceptions, logs them with structlog, and returns a generic 500 response with `{"error": "InternalServerError", "message": "An unexpected error occurred"}`.

### Loading and Empty States

There are no explicit "loading" spinners. The frontend renders immediately with empty arrays and `null` anomaly data. Each panel checks its data:

- `ObservationFeed`: `logs.length === 0` → renders `EmptyState` with 📡 icon and "No observation logs yet"
- `DetectionAlerts`: `!data || data.anomalies.length === 0` → renders `EmptyState` with 🔍 icon and "No anomalies detected"
- `HealingActions`: `actions.length === 0` → renders `EmptyState` with ⚕️ icon and "No healing actions executed"

All empty states include the subtitle "Waiting for traffic data..." because, with the traffic generator active, data will appear automatically within seconds.

---

## Section 8 — Styling and Visual Design

### Styling Approach

The application uses a hybrid styling approach:

1. **Global CSS Reset** (`index.css`) — A 65-line file that resets box-sizing, margins, and paddings; sets the body background to `#070d1a` (deep navy), font to Inter, and scrollbar styling; applies smooth scrolling and font smoothing.

2. **Inline React Styles** (`HealingDashboard.tsx`) — A `styles` object containing `React.CSSProperties` definitions for page layout, panels, headers, cards, badges, table rows, and empty states. These are applied via the `style` prop on React elements.

3. **Injected CSS Keyframes** — A `KEYFRAMES` template literal string containing CSS animations and utility classes that cannot be expressed as inline styles (pseudo-elements, hover states, keyframes, media queries). This string is injected into the DOM as a `<style>` element on mount and removed on unmount.

### Color System

The entire dashboard uses a monochrome blue palette with accent colors for semantic meaning. All colors are defined in the `C` constant object:

| Token | Hex | Usage |
|---|---|---|
| `bg` | `#070d1a` | Page background |
| `bgPanel` | `#0c1527` | Panel backgrounds |
| `bgCard` | `#101d35` | Card and row backgrounds |
| `bgElevated` | `#142342` | Elevated elements (tooltips, inputs) |
| `border` | `#1a2d50` | Default borders |
| `borderLight` | `#223a63` | Hover state borders |
| `blue50`–`blue900` | Standard blue scale | Various UI elements |
| `textMuted` | `#6b86b8` | Secondary text |
| `textDim` | `#3d5a8a` | Tertiary text, timestamps |
| `success` | `#22d3ee` | Cyan — healthy status, 2xx codes |
| `warning` | `#f59e0b` | Amber — anomalies, 4xx codes, high latency |
| `critical` | `#ef4444` | Red — 5xx errors, high severity scores |
| `aiPurple` | `#8b5cf6` | AI Copilot panel accents |
| `aiPurpleGlow` | `rgba(139,92,246,0.25)` | AI Copilot panel glow effect |

### Typography

The dashboard uses **Inter** (loaded from Google Fonts via the HTML `<link>` tag) with a fallback chain of `-apple-system, BlinkMacSystemFont, sans-serif`. Font sizes are expressed in `rem` units throughout, ranging from `0.55rem` (smallest badge text) to `1.6rem` (stat card values) to `1.5rem` (page title).

Font weights used: 400 (body), 500 (not used), 600 (labels, badges), 700 (titles, headers), 800 (stat values, score badges), 900 (not used).

### Layout

The page is a full-viewport dark background with 24px horizontal padding and 40px bottom padding. Content is constrained to `maxWidth: 1440px` and centered with `margin: 0 auto`.

The main content area is a CSS Grid with `grid-template-columns: repeat(2, 1fr)` creating a 2×2 panel layout with 20px gaps. On screens narrower than 960px, a media query (`.hl-grid-responsive`) overrides the grid to `grid-template-columns: 1fr`, stacking panels vertically.

The stat cards row uses `display: flex` with `flex-wrap: wrap` and `gap: 16px`, allowing cards to flow naturally across the available width.

### Animations

| Animation | Type | Where Used | Behavior |
|---|---|---|---|
| `pulse-live` | CSS keyframe | `PulsingDot` component | 2s ease-in-out infinite loop: scale 1→0.85→1, opacity 1→0.5→1 |
| Entry slide | Framer Motion | `ObservationFeed` rows | `initial: {opacity: 0, x: -12}` → `animate: {opacity: 1, x: 0}` with staggered delay |
| Entry fade-up | Framer Motion | `DetectionAlerts` cards | `initial: {opacity: 0, y: 8}` → `animate: {opacity: 1, y: 0}` with staggered delay |
| Entry scale | Framer Motion | `HealingActions` items | `initial: {opacity: 0, scale: 0.97}` → `animate: {opacity: 1, scale: 1}` with staggered delay |
| Entry fade | Framer Motion | `AICopilot` recommendations | `initial: {opacity: 0}` → `animate: {opacity: 1}` |
| Row hover | CSS transition | All list rows | `background` transitions on hover to `C.bgCard` over 0.15s |
| Button hover | Inline JS | Refresh, Send, action buttons | `onMouseEnter`/`onMouseLeave` handlers directly set `style.background` |

### Panel Glow Effects

Each of the four panels has a box-shadow glow effect applied via CSS classes:

- `.hl-glow-blue` — `box-shadow: 0 0 30px ${C.blue700}20, 0 4px 20px rgba(0,0,0,0.3)` — used on Observation, Detection, and Healing panels.
- `.hl-glow-purple` — `box-shadow: 0 0 30px ${C.aiPurpleGlow}, 0 4px 20px rgba(0,0,0,0.3)` — used on the AI Copilot panel.

### Badge System

Badges are generated by the `styles.badge(color)` function, which returns a `React.CSSProperties` object with:
- Pill shape (`borderRadius: 20`)
- Transparent tinted background (`${color}18` — color at 9% opacity)
- Colored border (`${color}40` — color at 25% opacity)
- Small text (`0.65rem`, weight 600, `letterSpacing: 0.5`)

This creates a consistent visual language where badges inherit their semantic color (blue for methods, amber for warnings, red for critical, cyan for success) while maintaining readability against the dark panel backgrounds.

---

## Section 9 — Configuration and Environment

### Backend Environment Variables

All backend configuration is managed through the `Settings` class in `app/core/config.py`, which extends `pydantic_settings.BaseSettings`. Variables are loaded from a `.env` file in the `backend/` directory or from actual environment variables (environment variables take precedence over `.env` values).

| Variable | Type | Default | Purpose | Effect If Missing |
|---|---|---|---|---|
| `APP_NAME` | `str` | `"Healing Layer Dashboard"` | Application title shown in API docs and health endpoint | Uses default — purely cosmetic |
| `APP_VERSION` | `str` | `"1.0.0"` | Version string | Uses default — cosmetic |
| `DEBUG` | `bool` | `True` | Enables uvicorn reload mode | Uses default — hot-reload stays active |
| `HOST` | `str` | `"0.0.0.0"` | Server bind address | Uses default — binds to all interfaces |
| `PORT` | `int` | `8000` | Server port | Uses default |
| `REDIS_HOST` | `str` | `"localhost"` | Redis server hostname | Uses default — connects to localhost. If Redis is not running, the app falls back to in-memory storage |
| `REDIS_PORT` | `int` | `6379` | Redis server port | Uses default |
| `REDIS_DB` | `int` | `0` | Redis database number | Uses default |
| `REDIS_PASSWORD` | `str \| None` | `None` | Redis authentication password | Uses default (no auth). If Redis requires a password and this is not set, connection fails and in-memory fallback activates |
| `CORS_ORIGINS` | `List[str]` | `["http://localhost:3000", "http://localhost:5173"]` | Allowed CORS origins for the frontend | Uses default — both Vite's default port and our configured port are allowed |
| `FAILURE_SIMULATOR_ENABLED` | `bool` | `True` | Master switch for the failure simulator | Uses default — simulator is on. If set to `False`, the failure middleware still intercepts requests but `should_fail_request()` always returns `None` |
| `DETECTION_LATENCY_THRESHOLD_MS` | `float` | `300.0` | Latency threshold for the LatencyRule | Uses default — requests slower than 300ms trigger the latency rule |
| `DETECTION_ANOMALY_SCORE_THRESHOLD` | `int` | `3` | Minimum cumulative score for a log to be classified as anomalous | Uses default. Lowering this (e.g., to 1) catches more anomalies. Raising it (e.g., to 5) only catches severe multi-rule violations |
| `TRAFFIC_GENERATOR_ENABLED` | `bool` | `True` | Whether to start the traffic generator on boot | Uses default — generator runs. Set to `False` to stop automatic traffic (useful when pointing the system at real traffic sources) |
| `TRAFFIC_GENERATOR_INTERVAL_MS` | `int` | `2000` | Base interval between generated requests (subject to ±50% jitter) | Uses default — one request every ~1-3 seconds |

### Frontend Environment Variables

| Variable | Type | Default | Purpose |
|---|---|---|---|
| `VITE_API_URL` | `string` | `''` (empty) | Base URL for API calls. When empty, axios sends requests to the same origin, which Vite proxies to the backend |

In development, the Vite proxy (`vite.config.ts`) forwards `/api` requests to `http://localhost:8000`. In Docker, `VITE_API_URL` is set to `http://backend:8000` so the frontend container can reach the backend container by service name.

### Redis Keys

The application uses a fixed set of Redis keys:

| Redis Key | Type | Max Size | Producer | Consumer |
|---|---|---|---|---|
| `observation:logs` | List | 1000 entries | `ObservationStore.push_log()` | `GET /api/v1/observation/logs` |
| `observation:pending_detection` | List | Unbounded (drained by worker) | `ObservationStore.push_log()` | `detection_worker_loop()` via `BRPOP` |
| `observation:anomalies` | List | 1000 entries | `detection_worker_loop()` | `GET /api/v1/detection/anomalies` |
| `healing:actions` | List | 1000 entries | `detection_worker_loop()` | `GET /api/v1/healing/actions` |
| `anomaly_stats:endpoint` | Hash | Unbounded | `detection_worker_loop()` via `HINCRBY` | `GET /api/v1/detection/anomalies` |
| `anomaly_stats:type` | Hash | Unbounded | `detection_worker_loop()` via `HINCRBY` | `GET /api/v1/detection/anomalies` |

### Docker Compose Configuration

The `docker-compose.yml` defines three services with health checks and dependency ordering:

1. **redis** — `redis:7-alpine`, health-checked with `redis-cli ping` every 5s.
2. **backend** — Builds from `./backend/Dockerfile`, depends on Redis being healthy. Environment variables are passed directly in the `environment` block. The `./backend` directory is mounted as a volume for hot-reload.
3. **frontend** — Builds from `./frontend/Dockerfile`, depends on backend being healthy. Source files are mounted as volumes for hot-reload.

---

## Section 10 — How the Healing System Works End-to-End

This section traces the complete lifecycle of the healing system from cold start to a healing action being executed and displayed on the dashboard.

### Phase 0: Application Startup

When the user runs `python -m uvicorn app.main:app --reload`, the following sequence occurs:

1. **Uvicorn boots** the ASGI server and loads `app.main:app`.
2. **FastAPI initializes** the application with its metadata (title, version, description).
3. **Middleware stack is assembled** (bottom to top in execution order):
   - `CORSMiddleware` — handles preflight requests
   - `FailureSimulationMiddleware` — may intercept and fail requests
   - `ObservationMiddleware` — captures all request/response telemetry
   - `log_requests` — logs request metadata to structlog
4. **The `startup` event fires**, triggering `startup_event()`:
   - The `DetectionWorker` is started as a background `asyncio` task. It immediately begins polling the Redis queue `observation:pending_detection` with `BRPOP` (5-second timeout). If Redis is unavailable, it retries every 5 seconds.
   - If `TRAFFIC_GENERATOR_ENABLED` is `True` (default), the `TrafficGenerator` is started as another background task. It waits 3 seconds for the server to stabilize, then begins sending requests.
   - The failure simulator enables two default scenarios: `database_error` (probability 0.2) and `service_overload` (probability 0.3).
5. **The server is ready** to accept requests on port 8000.

Separately, when the user runs `npm run dev` in the frontend directory, Vite starts a dev server on port 3000 and serves the React application. The browser loads `index.html`, which loads `main.tsx`, which mounts `App` → `HealingDashboard`.

### Phase 1: Traffic Generation

After the 3-second warm-up delay, the traffic generator begins its infinite loop:

1. It selects a random demo endpoint using weighted random choice (restaurants and orders are favored 3:2:2:1:1:1).
2. It calculates a jittered interval: `base_interval * random(0.5, 1.5)`. For the default 2000ms interval, this means requests are spaced 1000–3000ms apart.
3. It sends an HTTP request (GET or POST) to `http://localhost:8000{path}` using the `httpx` async client.
4. The request enters the FastAPI middleware stack.

### Phase 2: Failure Injection (or Pass-through)

When the request reaches `FailureSimulationMiddleware`:

1. The middleware calls `failure_simulator.should_fail_request(endpoint, method, client_ip)`.
2. The simulator first checks the global failure rate. If `global_failure_rate > 0` and `random() < global_failure_rate`, it creates an ad-hoc `SERVER_ERROR` scenario and returns it.
3. Then it iterates through all scenarios. For each enabled scenario, it checks: (a) does the endpoint match the scenario's endpoint patterns? (b) does the HTTP method match? (c) does `random() < scenario.probability`?
4. **If a scenario matches:** The middleware sets `request.state.observation_failure_type` to the scenario name, records the request as failed in the simulator's counters, and calls `_inject_failure()` which returns an appropriate HTTP error response (e.g., 500, 503, 429, 504).
5. **If no scenario matches:** The request passes through to the next middleware/handler.

### Phase 3: Observation Recording

After the response is generated (either by the failure middleware or the demo endpoint handler), the `ObservationMiddleware` captures the result:

1. It computes `duration_ms` using `time.monotonic()` (high-resolution clock).
2. It reads `failure_type` from `request.state.observation_failure_type` (set by failure middleware, or `"none"` if the request was not failed).
3. It constructs a log entry dictionary with all 8 fields (timestamp, endpoint, method, status_code, response_time_ms, request_id, service_name, failure_type).
4. It calls `observation_store.push_log(entry)`.
5. Inside `push_log()`, the entry is JSON-serialized and atomically pushed to two Redis lists in a pipeline: `observation:logs` (for the API to read) and `observation:pending_detection` (for the detection worker to consume). Both lists are trimmed to 1000 entries.

### Phase 4: Detection

The detection worker is running concurrently as a background task:

1. It calls `BRPOP observation:pending_detection` with a 5-second timeout. This is a blocking pop — it waits until a new entry appears in the queue.
2. When a log arrives, it JSON-deserializes it and passes it to `detection_service.detect_anomaly(log)`.
3. The detection service evaluates three rules in order:
   - **LatencyRule**: If `response_time_ms > 300.0` → `triggered=True, reason="high_latency", score=2`
   - **StatusCodeRule**: If `status_code >= 500` → `triggered=True, reason="server_error", score=3`. Else if `status_code == 429` → `triggered=True, reason="rate_limit", score=2`
   - **FailureTagRule**: If `failure_type != "none"` → `triggered=True, reason={failure_type}, score=3`
4. The total score is computed. For a request that was failed by the `database_error` scenario with a 500 status code, the scoring would be: `StatusCodeRule` contributes +3 (`server_error`), `FailureTagRule` contributes +3 (`database_error`), total = 6. Since 6 ≥ 3 (threshold), `is_anomaly = True`.
5. The log is enriched with `is_anomaly`, `anomaly_score`, and `anomaly_reasons`.

### Phase 5: Healing

If the log is classified as an anomaly:

1. The worker calls `healing_service.decide_healing_action(log)`. Given reasons `["server_error", "database_error"]`, the service maps: `server_error` → `restart_service` (priority 3), `database_error` → `restart_service` (priority 3). The winning action is `restart_service`.
2. The worker calls `healing_service.execute_healing("restart_service")`. This calls `_sim_restart_service()`, which sleeps for 2 seconds and returns a success message.
3. The healing result (`{healing_action, status, timestamp, message}`) is attached to the enriched log and stored in Redis.
4. A Redis pipeline atomically executes:
   - `LPUSH observation:anomalies` — stores the enriched log with healing info
   - `LTRIM observation:anomalies 0 999` — caps at 1000 entries
   - `LPUSH healing:actions` — stores the healing action record
   - `LTRIM healing:actions 0 999`
   - `HINCRBY anomaly_stats:endpoint {endpoint} 1` — increments endpoint counter
   - `HINCRBY anomaly_stats:type {reason} 1` — increments reason counter (for each reason)

### Phase 6: Dashboard Display

Meanwhile, the React dashboard is polling every 3 seconds:

1. `fetchData()` fires via `setInterval`.
2. Three concurrent requests are sent: `/api/v1/observation/logs?limit=50`, `/api/v1/detection/anomalies?limit=30`, `/api/v1/healing/actions?limit=30`.
3. Each response updates its corresponding state variable.
4. React re-renders the component tree:
   - `ObservationFeed` shows the new log entry (with animated slide-in).
   - `DetectionAlerts` shows the new anomaly card with its score badge and reasons.
   - `HealingActions` shows the new healing action with its icon, status badge, and message.
   - Stat cards update: total requests increments, success rate adjusts, anomaly count increases, healing action count increases.

### What Happens When Healing "Completes"

The healing action is a one-shot operation. Once `execute_healing()` returns, the healing is considered complete. There is no follow-up check to verify whether the healing actually fixed the problem (because in this simulation, there is no real problem to fix). The system continues running: more traffic is generated, more failures are injected, more anomalies are detected, and more healing actions are executed. The dashboard accumulates a history of all three phases.

### What Happens When Redis Is Unavailable

If Redis is not running (e.g., if Docker is not available):

1. `ObservationStore._get_redis()` catches the connection error and sets `_redis_connected = False`.
2. Observation logs are stored in the in-memory `deque(maxlen=1000)` fallback.
3. The detection worker loop calls `observation_store.get_redis()`, gets `None`, sleeps for 5 seconds, and retries.
4. No logs are ever pushed to the detection queue, so no anomalies are detected and no healing actions are executed.
5. The dashboard's Observation Feed panel works (showing logs from the in-memory fallback), but Detection Alerts and Healing Actions panels show empty states.

---

## Section 11 — Known Assumptions and Limitations

### Assumptions Made During Extraction

1. **Redis is the only external dependency.** The original app needed PostgreSQL, Redis, and a Stripe-compatible payment gateway. This extraction assumes Redis alone is sufficient for the healing pipeline. This is valid because the pipeline is entirely queue/log-based and does not require relational data.

2. **Traffic can be synthetic.** The original app had real user-driven traffic from restaurant browsing, order placement, and payment processing. This extraction assumes that synthetic traffic is an adequate substitute for demonstrating the pipeline. The traffic generator mimics realistic endpoint patterns but does not simulate realistic payload sizes, authentication headers, or user session behavior.

3. **Authentication is unnecessary.** The original app protected all API endpoints behind JWT tokens. This extraction assumes a zero-trust model is not required for a self-contained demo application. If deployed to a shared network, all endpoints would be publicly accessible.

4. **Healing actions can be simulated.** The original app's healing actions were also simulated (the CRAVE app was never deployed to real infrastructure). This extraction maintains the same simulation approach: `asyncio.sleep()` to simulate processing time, and hardcoded success messages. No real Kubernetes, Docker, or cloud infrastructure is affected.

### Simplifications

1. **Single-file dashboard.** The 848-line `HealingDashboard.tsx` contains all components, styles, types, constants, and utilities. In a production application, this would be split into separate files for maintainability. It was kept as a single file to simplify the extraction and ensure the dashboard is fully self-contained.

2. **In-memory rate limiting.** The failure simulator's rate limit tracking uses an in-process dictionary with timestamp-based window tracking. This does not survive server restarts and does not work across multiple server instances.

3. **No persistent state.** Both Redis and the in-memory fallback are ephemeral. Restarting the backend clears all observation logs, anomalies, and healing action history. There is no database, no file-based persistence, and no export capability.

4. **No real failure injection.** The failure middleware returns error HTTP responses, but the underlying service is never actually degraded. A 503 response from the failure middleware does not mean the server is overloaded — it means the middleware intercepted the request and returned a fake 503.

5. **Detection rules are not adaptive.** The latency threshold (300ms), score weights (2 and 3), and anomaly threshold (3) are all static. They do not adjust based on observed traffic patterns, time of day, or historical baselines. The AI Copilot panel includes recommendations for adaptive threshold adjustment, but this functionality is not implemented.

### Known Gaps

1. **No real AI backend.** The AI Copilot panel is entirely frontend-only. The chat responses are randomly selected from three canned strings. The feature toggles (predictive healing, root cause analysis, smart prioritization) do not affect any backend behavior. The three AI recommendations are hardcoded static data.

2. **No WebSocket/SSE for real-time updates.** The dashboard uses HTTP polling (every 3 seconds) rather than WebSocket or Server-Sent Events. This means there is up to a 3-second delay between a healing action being executed and it appearing on the dashboard.

3. **No anomaly clearing or resolution tracking.** Once an anomaly is recorded, it stays in the `observation:anomalies` list until it is pushed out by newer entries (the list is capped at 1000). There is no concept of "resolving" an anomaly or marking it as handled.

4. **Detection worker is single-threaded.** The detection worker processes logs sequentially. If a healing action takes 2 seconds (the `restart_service` simulation sleep), the queue backs up during that time. In a high-traffic production system, this could result in detection lag.

5. **Failure simulator endpoint patterns are from the original app.** Several scenarios use endpoint patterns like `/api/restaurants`, `/api/orders/*`, `/api/payments/*` from the original CRAVE app. These patterns do not match the standalone app's `/api/v1/demo/*` endpoints exactly. The `service_overload` scenario uses `"*"` (matches everything) and `database_error` uses `/api/v1/restaurants/*` and `/api/v1/orders/*` which partially match via prefix.

---

## Section 12 — Developer Guide

### Installation and Setup (From Scratch)

#### Option A: Docker (Recommended)

```bash
# 1. Ensure Docker Desktop is running

# 2. Navigate to the project root
cd healing-layer-app

# 3. Build and start all services
docker-compose up --build

# 4. Open the dashboard
# http://localhost:3000
```

The `start.bat` script automates steps 2–4 on Windows.

#### Option B: Manual Setup

```bash
# 1. Start Redis
docker run -d --name healing-redis -p 6379:6379 redis:7-alpine

# 2. Install and start the backend
cd healing-layer-app/backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 3. In a new terminal: Install and start the frontend
cd healing-layer-app/frontend
npm install
npm run dev

# 4. Open http://localhost:3000
```

**Note:** If Redis is not available, the backend still starts and serves the Observation Feed (via in-memory fallback), but Detection and Healing panels will remain empty because the detection worker requires Redis for its queue.

### Adding a New Detection Rule

1. Create a new file in `backend/app/services/rules/`, e.g., `payload_size.py`:

```python
from typing import Dict, Any
from .base import BaseRule, RuleResult

class PayloadSizeRule(BaseRule):
    def __init__(self, max_bytes: int = 1_000_000, weight: int = 2):
        super().__init__(name="large_payload", weight=weight)
        self.max_bytes = max_bytes

    def evaluate(self, log: Dict[str, Any]) -> RuleResult:
        size = log.get("response_size_bytes", 0)
        if size > self.max_bytes:
            return RuleResult(triggered=True, reason=self.name, score=self.weight)
        return RuleResult(triggered=False)
```

2. Register the rule in `backend/app/services/detection_service.py`:

```python
from .rules.payload_size import PayloadSizeRule

class DetectionService:
    def __init__(self):
        self.rules = [
            LatencyRule(),
            StatusCodeRule(),
            FailureTagRule(),
            PayloadSizeRule(),  # Add new rule here
        ]
```

3. If needed, add a corresponding healing action mapping in `backend/app/services/healing_service.py`:

```python
self.rules = {
    "database_error":  "restart_service",
    "server_error":    "restart_service",
    "high_latency":    "retry_request",
    "rate_limit":      "throttle_requests",
    "large_payload":   "throttle_requests",  # New mapping
}
```

4. If the rule needs additional data in the observation log, modify `ObservationMiddleware` in `backend/app/middleware/observation.py` to capture the additional field.

### Adding a New Healing Action

1. Add the action method to `backend/app/services/healing_service.py`:

```python
async def _sim_scale_up(self) -> str:
    await asyncio.sleep(3.0)
    return "Auto-scaling triggered. New instances are spinning up."
```

2. Register it in the `execute_healing` method's routing logic:

```python
elif action == "scale_up":
    message = await self._sim_scale_up()
```

3. Add the action to the priority mapping:

```python
action_priority = {
    "restart_service":   3,
    "scale_up":          3,  # Same priority as restart
    "throttle_requests": 2,
    "retry_request":     1,
    "none":              0,
}
```

4. Add an icon mapping in the frontend (`HealingDashboard.tsx`):

```typescript
function actionIcon(action: string): string {
  const icons: Record<string, string> = {
    restart_service: '🔄',
    retry_request: '↩️',
    throttle_requests: '🛑',
    scale_up: '📈',     // New icon
    none: '⏭️',
  };
  return icons[action] || '⚙️';
}
```

### Changing the Data Source

To point the healing layer at real API traffic instead of the synthetic generator:

1. Set `TRAFFIC_GENERATOR_ENABLED=false` in `.env` to stop the built-in generator.
2. Remove or disable the demo endpoints in `routes.py` (they are no longer needed).
3. Deploy the backend as a reverse proxy or sidecar alongside your real API server.
4. Configure your real API to route through the healing layer backend, or modify `ObservationMiddleware` to accept forwarded telemetry data via a dedicated ingestion endpoint.
5. Update the failure scenario endpoint patterns in `failure_config.py` to match your real API's URL structure.

### Running Tests

No automated test suite is currently included. The application was verified through:

- TypeScript compilation: `npx tsc --noEmit` (passes clean)
- Vite production build: `npx vite build` (succeeds)
- Python import check: `python -c "from app.main import app; print(app.title)"`
- Manual verification: Dashboard shows live data with traffic generator active

To add tests, consider:
- **Backend:** `pytest` with `httpx.AsyncClient` for API endpoint testing, and unit tests for `DetectionService` and `HealingService`.
- **Frontend:** `vitest` with `@testing-library/react` for component rendering tests.

### Common Pitfalls

1. **Port 3000 in use.** The Vite dev server uses `strictPort: true`, so if port 3000 is occupied (e.g., by the original CRAVE app), it will fail to start. Kill the process using port 3000 before starting.

2. **Redis not running.** The Detection and Healing panels require Redis. The Observation panel works via the in-memory fallback, but the full pipeline does not run without Redis.

3. **Frontend proxy misconfiguration.** In development, the Vite proxy forwards `/api` to `http://localhost:8000`. If you change the backend port, update `vite.config.ts` accordingly.

4. **Stale detection queue.** If the backend crashes while logs are in the `observation:pending_detection` queue, they will be reprocessed on restart. This is by design (at-least-once delivery), but can result in duplicate anomaly entries.

5. **Middleware ordering.** The order of `app.add_middleware()` calls in `main.py` matters. Starlette processes middleware in reverse declaration order. `ObservationMiddleware` is declared last (line 54) so it executes first (outermost), ensuring it captures the final status code after `FailureSimulationMiddleware` may have modified the response.

---

*End of report.*

