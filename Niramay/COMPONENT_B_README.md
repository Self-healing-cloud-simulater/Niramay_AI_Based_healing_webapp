# Component B — Implementation Walkthrough

This document provides a complete technical walkthrough of **Component B** of the Niramay self-healing infrastructure, covering **Stage 1 (Log/Input Ingestion)** and **Stage 2 (Detection Phase 1)**.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Stage 1: Log/Input Ingestion](#stage-1-loginput-ingestion)
  - [Step-by-Step Flow](#step-by-step-flow)
  - [Data Normalization Checkpoint](#data-normalization-checkpoint)
  - [Multi-Tier Storage Strategy](#multi-tier-storage-strategy)
  - [Dead Letter Queue](#dead-letter-queue)
  - [Files Involved](#stage-1-files-involved)
- [Stage 2: Detection (Phase 1)](#stage-2-detection-phase-1)
  - [Rule Engines](#rule-engines)
  - [Weighted Scoring](#weighted-scoring)
  - [Severity Classification](#severity-classification)
  - [LLM Escalation Policy](#llm-escalation-policy)
  - [Structured Output](#structured-output)
  - [Files Involved](#stage-2-files-involved)
- [Configuration Reference](#configuration-reference)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        COMPONENT B PIPELINE                        │
│                                                                     │
│  ┌──────────────┐    ┌───────────────────┐    ┌──────────────────┐  │
│  │   STAGE 1    │    │     STAGE 2       │    │    STAGE 3       │  │
│  │  Ingestion   │───▶│   Detection       │───▶│  LLM / Healing  │  │
│  │              │    │   (Phase 1)       │    │  (Conditional)   │  │
│  └──────────────┘    └───────────────────┘    └──────────────────┘  │
│         │                     │                        │            │
│    Middleware            5 Rule Engines          Causal Engine      │
│    Pydantic Schema       Severity Score          Healing Actions   │
│    Redis + PostgreSQL    LLM Flag                Verification      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Stage 1: Log/Input Ingestion

### Step-by-Step Flow

The ingestion process does **not** rely on services actively pushing logs to an endpoint. Instead, it uses a Starlette **Middleware** wrapped around the entire FastAPI application, acting as a "CCTV camera" for all API traffic.

#### Step 1 — Request Interception
Every HTTP request to `/api/v1/*` endpoints (excluding system endpoints like `/health`, `/docs`) is intercepted by `ObservationMiddleware`.

Before passing the request downstream, the middleware captures:
- A precise `start_time` counter via `time.monotonic()`
- A unique `request_id` (UUID4)
- An ISO-8601 UTC `timestamp`

#### Step 2 — Request Execution
The middleware calls `await call_next(request)`, letting the actual API route execute its logic normally.

#### Step 3 — Log Extraction & Assembly
Once the application responds (or throws an exception), the middleware resumes and constructs a raw Python dictionary:

```json
{
    "timestamp": "2026-04-18T10:00:00.000Z",
    "endpoint": "/api/v1/orders/123",
    "method": "GET",
    "status_code": 200,
    "response_time": 142.5,
    "request_id": "8f14e45f-...",
    "service": "niramay",
    "failure_type": "none"
}
```

This dictionary is forwarded to the **Observation Store** via `await observation_store.push_log(log_entry)`.

#### Step 4 — Data Normalization Checkpoint
Inside `ObservationStore.push_log()`, the raw dictionary passes through a **Pydantic validation checkpoint** before touching any database.

### Data Normalization Checkpoint

The `ObservationLog` Pydantic schema (`backend/app/observation/schemas.py`) performs two layers of validation:

**Layer 1 — Field Name Alignment (Pre-Validation)**

A `model_validator(mode="before")` transparently remaps incoming field aliases to canonical names. This handles data from external systems that may use different naming conventions:

| Incoming Key       | Canonical Key     |
|--------------------|-------------------|
| `response_time_ms` | `response_time`   |
| `service_name`     | `service`         |

**Layer 2 — Missing Field Detection (Post-Validation)**

A `model_validator(mode="after")` inspects which critical fields fell back to their default values and records:
- A `normalization_status` enum:
  - `complete` — All fields present and valid
  - `partial` — Some fields were missing, filled with defaults
  - `incomplete` — 3+ critical fields missing (heavily degraded data)
- A `missing_fields` list naming exactly which fields were absent

### Multi-Tier Storage Strategy

After normalization, the validated log is stored across three tiers:

| Tier | Technology | Purpose |
|------|-----------|---------|
| **Tier 1** | Redis (`observation:logs`) | Real-time cache & monitoring. Also enqueued into `observation:pending_detection` for the Stage 2 background worker. Capped at 1000 entries via `LTRIM`. |
| **Tier 2** | PostgreSQL (`audit_logs` table) | Long-term persistent storage for historical queries and ML training. |
| **Tier 3** | In-Memory Deque | Application-level failsafe if Redis is unavailable. |

### Dead Letter Queue

Logs that **completely fail** Pydantic validation (e.g., entirely malformed payloads) are **not silently dropped**. They are routed to a Redis dead letter queue:

- **Key:** `observation:deadletter`
- **Contents:** Original payload + error message + received timestamp
- **Capped at:** 500 entries

This allows developers to inspect and debug ingestion failures without losing data.

### Stage 1 Files Involved

| File | Role |
|------|------|
| `backend/app/observation/middleware.py` | Intercepts all HTTP traffic and assembles log dictionaries |
| `backend/app/observation/schemas.py` | Pydantic schema with field alias normalization and missing field tracking |
| `backend/app/observation/store.py` | Validation checkpoint, multi-tier storage, dead letter queue |

---

## Stage 2: Detection (Phase 1)

The detection phase runs as a **background async worker** (`backend/app/detection/worker.py`) that continuously pops logs from the `observation:pending_detection` Redis queue and processes them through a modular rule engine system.

### Rule Engines

The detection engine runs **5 independent rule engines** sequentially on each log:

| Rule | File | What it Detects | Trigger Condition |
|------|------|----------------|-------------------|
| **LatencyRule** | `rules/latency.py` | High response times | `response_time > DETECTION_LATENCY_THRESHOLD_MS` (default: 300ms) |
| **StatusCodeRule** | `rules/status.py` | Server errors & rate limits | `status_code >= 500` or `status_code == 429` |
| **FailureTagRule** | `rules/failure.py` | Injected failure simulator tags | `failure_type != "none"` |
| **RateRule** | `rules/rate.py` | Abnormal traffic spikes (DDoS/spam) | Request count per endpoint exceeds threshold within sliding window |
| **SilenceRule** | `rules/silence.py` | Endpoint going silent (crash/hang) | Gap between consecutive requests to same endpoint exceeds threshold |

All rules extend the `BaseRule` abstract class and return a `RuleResult(triggered, reason, score)`.

### Weighted Scoring

Each rule maps to a **weight** (configured in `backend/app/core/config.py`). When a rule fires, it contributes its weight to the total anomaly score:

```
anomaly_score = Σ (weight_i × trigger_i)
```

Since all weights sum to **1.0**, the anomaly score is naturally bounded in `[0.0, 1.0]`.

**Default Weight Distribution:**

| Rule | Weight |
|------|--------|
| Latency | 0.25 |
| Status Code | 0.25 |
| Failure Tag | 0.20 |
| Rate Spike | 0.15 |
| Silence | 0.15 |
| **Total** | **1.00** |

A log is classified as an **anomaly** when `anomaly_score >= DETECTION_ANOMALY_THRESHOLD` (default: `0.5`).

### Severity Classification

Once an anomaly is detected, the continuous score is mapped to a **discrete severity level**:

| Score Range | Severity |
|------------|----------|
| 0.00 – 0.39 | `low` |
| 0.40 – 0.59 | `medium` |
| 0.60 – 0.79 | `high` |
| 0.80 – 1.00 | `critical` |

### LLM Escalation Policy

Not all anomalies need expensive LLM-based causal analysis. The `requires_llm_analysis` flag is set based on:

| Severity | Escalated to LLM? | Rationale |
|----------|-------------------|-----------|
| `critical` | ✅ Always | High-impact, needs root cause analysis |
| `high` | ✅ Always | Significant issue, AI reasoning valuable |
| `medium` | ⚠️ Only if 2+ rules fired | Multi-signal anomaly suggests complex cause |
| `low` | ❌ Never | Low-impact, rule-based healing sufficient |

When `requires_llm_analysis` is `false`, the detection worker **skips** the Ollama/LLM causal engine call entirely and goes straight to rule-based healing — saving significant compute.

### Structured Output

The detection engine produces a consistent structured output for every log:

```json
{
    "is_anomaly": true,
    "anomaly_score": 0.65,
    "anomaly_reasons": ["server_error", "high_latency"],
    "severity": "high",
    "requires_llm_analysis": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `is_anomaly` | `bool` | Whether the log crossed the anomaly threshold |
| `anomaly_score` | `float` | Normalized score between 0.0 and 1.0 |
| `anomaly_reasons` | `list[str]` | Names of the rule engines that fired |
| `severity` | `str` | Discrete severity: `low`, `medium`, `high`, `critical` |
| `requires_llm_analysis` | `bool` | Whether this anomaly should be escalated to Stage 3 |

### Stage 2 Files Involved

| File | Role |
|------|------|
| `backend/app/detection/engine.py` | Core detection engine — runs all rules, calculates score, severity, LLM flag |
| `backend/app/detection/worker.py` | Background async worker — pops from Redis queue, orchestrates Detection → Healing |
| `backend/app/detection/rules/base.py` | Abstract base class for all rule engines |
| `backend/app/detection/rules/latency.py` | High latency detection |
| `backend/app/detection/rules/status.py` | HTTP status code anomaly detection |
| `backend/app/detection/rules/failure.py` | Failure simulator tag detection |
| `backend/app/detection/rules/rate.py` | Traffic spike detection (sliding window) |
| `backend/app/detection/rules/silence.py` | Endpoint silence/crash detection |

---

## Configuration Reference

All detection parameters are configurable via environment variables or `backend/app/core/config.py`:

| Setting | Default | Description |
|---------|---------|-------------|
| `DETECTION_LATENCY_THRESHOLD_MS` | `300.0` | Latency above this (ms) triggers LatencyRule |
| `DETECTION_RATE_WINDOW_SECONDS` | `60.0` | Sliding window size for RateRule |
| `DETECTION_RATE_THRESHOLD` | `50` | Max requests per endpoint per window |
| `DETECTION_SILENCE_THRESHOLD_SECONDS` | `30.0` | Silence gap (seconds) to trigger SilenceRule |
| `DETECTION_ANOMALY_THRESHOLD` | `0.5` | Minimum score to classify as anomaly |
| `DETECTION_WEIGHT_LATENCY` | `0.25` | Weight for latency rule |
| `DETECTION_WEIGHT_STATUS` | `0.25` | Weight for status code rule |
| `DETECTION_WEIGHT_FAILURE` | `0.20` | Weight for failure tag rule |
| `DETECTION_WEIGHT_RATE` | `0.15` | Weight for rate spike rule |
| `DETECTION_WEIGHT_SILENCE` | `0.15` | Weight for silence rule |
