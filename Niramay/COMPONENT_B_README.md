# Component B — Implementation Walkthrough

This document provides a complete technical walkthrough of **Component B** of the Niramay self-healing infrastructure, covering **Stage 1 (Log/Input Ingestion)** and **Stage 2 (Detection — Parallel Engine Architecture)**.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Stage 1: Log/Input Ingestion](#stage-1-loginput-ingestion)
  - [Step-by-Step Flow](#step-by-step-flow)
  - [Log Normalization](#log-normalization)
  - [Multi-Tier Storage Strategy](#multi-tier-storage-strategy)
  - [Files Involved](#stage-1-files-involved)
- [Stage 2: Detection (Parallel Engine Architecture)](#stage-2-detection-parallel-engine-architecture)
  - [Detection Engines](#detection-engines)
  - [Normalized Anomaly Scoring](#normalized-anomaly-scoring)
  - [Severity Classification](#severity-classification)
  - [LLM Escalation Policy](#llm-escalation-policy)
  - [Structured Output](#structured-output)
  - [Files Involved](#stage-2-files-involved)
- [Configuration Reference](#configuration-reference)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          COMPONENT B PIPELINE                               │
│                                                                              │
│  ┌──────────────┐    ┌───────────────────┐    ┌───────────────────────────┐  │
│  │   STAGE 1    │    │     STAGE 2       │    │       STAGE 3            │  │
│  │  Ingestion   │───▶│   Detection       │───▶│  LLM Causal / Healing   │  │
│  │              │    │  (4 Engines)      │    │  (Conditional)           │  │
│  └──────────────┘    └───────────────────┘    └───────────────────────────┘  │
│         │                     │                           │                  │
│   Middleware →           4 Parallel Engines          Causal Engine           │
│   RabbitMQ →             Normalized [0,1] Score      Healing Actions        │
│   Normalizer →           4-Tier Severity             Verification           │
│   OpenSearch + Redis     LLM Escalation Flag                                │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Stage 1: Log/Input Ingestion

### Step-by-Step Flow

The ingestion process uses a Starlette **Middleware** wrapped around the entire FastAPI application, acting as a "CCTV camera" for all API traffic. Captured logs are published to **RabbitMQ**, consumed by a background worker, normalized, and fanned out to storage.

#### Step 1 — Request Interception

Every HTTP request to `/api/v1/*` endpoints (excluding system endpoints like `/health`, `/docs`, `/stats`, and all observation/detection read endpoints) is intercepted by `ObservationMiddleware`.

Before passing the request downstream, the middleware captures:
- A precise `start_time` counter via `time.monotonic()`
- A unique `request_id` (UUID4)
- An ISO-8601 UTC `timestamp`

#### Step 2 — Request Execution

The middleware calls `await call_next(request)`, letting the actual API route execute its logic normally.

#### Step 3 — Publish to RabbitMQ

Once the application responds (or throws an exception), the middleware constructs a log dictionary and publishes it to the **RabbitMQ queue** (`component-c-logs`):

```json
{
    "timestamp": "2026-04-18T10:00:00.000Z",
    "endpoint": "/api/v1/orders/123",
    "method": "GET",
    "status_code": 200,
    "response_time_ms": 142.5,
    "request_id": "8f14e45f-...",
    "service": "niramay",
    "failure_tag": "none"
}
```

This log is published via `rabbitmq_publisher.publish(log_entry)` — a non-blocking call that dispatches to a persistent RabbitMQ connection with automatic reconnection.

#### Step 4 — RabbitMQ Consumer (Background Thread)

A daemon thread (`rabbitmq_consumer`) subscribes to the `component-c-logs` queue and processes each message through three steps:

1. **Normalize** — via `normalizer.normalize_log(raw_message)`
2. **Write to OpenSearch** — non-blocking write to `b-normalized-logs` index
3. **Push to Redis** — two keys:
   - `observation:logs` (real-time dashboard feed, capped at 1000)
   - `observation:pending_detection` (detection worker queue)

### Log Normalization

The `normalizer.py` module (replacing the old Pydantic schema approach) performs robust field-level normalization:

**Field Aliasing:**

| Incoming Key       | Canonical Key       |
|--------------------|---------------------|
| `response_time`    | `response_time_ms`  |
| `service_name`     | `service`           |
| `failure_type`     | `failure_tag`       |

**Missing Field Handling:**

| Field              | Default             | Tracked?            |
|--------------------|---------------------|---------------------|
| `timestamp`        | Current UTC time    | Yes (`is_timestamp_assigned`) |
| `service`          | `"unknown"`         | Yes (`incomplete_fields`) |
| `endpoint`         | `"unknown"`         | Yes (`incomplete_fields`) |
| `status_code`      | `0`                 | Yes (`incomplete_fields`) |
| `response_time_ms` | `0.0`               | No                  |
| `failure_tag`      | `"none"`            | No                  |

**Malformed Payloads:**

Completely unparseable messages (non-JSON, non-dict) are not silently dropped. They are stored with `is_malformed: true` and the original `raw` content preserved, allowing debugging without data loss.

### Multi-Tier Storage Strategy

After normalization, each log is stored across three tiers:

| Tier | Technology | Purpose |
|------|-----------|---------|
| **Tier 1** | Redis (`observation:logs`) | Real-time cache for dashboard. Capped at 1000 entries via `LTRIM`. |
| **Tier 2** | Redis (`observation:pending_detection`) | Detection worker queue. Consumed by the Stage 2 background worker. |
| **Tier 3** | OpenSearch (`b-normalized-logs`) | Permanent indexed storage for historical queries and ML training. Non-blocking writes via thread pool. |

### Stage 1 Files Involved

| File | Role |
|------|------|
| `backend/app/observation/middleware.py` | Intercepts all HTTP traffic and publishes log dictionaries to RabbitMQ |
| `backend/app/ingestion/rabbitmq_publisher.py` | Persistent RabbitMQ publisher with auto-reconnection |
| `backend/app/ingestion/rabbitmq_consumer.py` | Background daemon thread that consumes from RabbitMQ, normalizes, and fans out to OpenSearch + Redis |
| `backend/app/ingestion/normalizer.py` | Field-level normalization with alias handling, default filling, and malformed payload preservation |
| `backend/app/ingestion/opensearch_client.py` | Non-blocking OpenSearch writer + reader with thread pool dispatch |

---

## Stage 2: Detection (Parallel Engine Architecture)

The detection phase runs as a **background async worker** (`backend/app/detection/worker.py`) that continuously pops logs from the `observation:pending_detection` Redis queue. Each log is passed to the `DetectionService` (`backend/app/detection/index.py`), which runs **4 independent detection engines in parallel** using a thread pool.

### Detection Engines

| Engine | File | What it Detects | Internal Rules |
|--------|------|----------------|----------------|
| **FeatureRuleEngine** | `engines/feature_rule_engine.py` | Status codes, latency, failure tags | Composes 3 sub-rules: `LatencyRule`, `StatusCodeRule`, `FailureTagRule` |
| **RateBasedEngine** | `engines/rate_based_engine.py` | Error spike / DDoS patterns | Redis-backed error frequency within a sliding window |
| **SilenceDetectionEngine** | `engines/silence_detection_engine.py` | Endpoint crashes / hangs | Redis-backed last-seen tracking with background checker |
| **BaselineAnomalyEngine** | `engines/baseline_anomaly_engine.py` | Deviation from normal response times | Redis-backed rolling average with configurable deviation factor |

Each engine extends the `BaseEngine` abstract class and returns a `List[RuleResult]` — zero or more triggered signals per evaluation.

#### FeatureRuleEngine — Sub-Rules

The FeatureRuleEngine consolidates three value-based checks:

| Sub-Rule | What it Detects | Trigger Condition |
|----------|----------------|-------------------|
| **LatencyRule** | High response times | `response_time > DETECTION_LATENCY_THRESHOLD_MS` (default: 300ms) |
| **StatusCodeRule** | Server errors & rate limits | `status_code >= 500` (server\_error) or `status_code == 429` (rate\_limit) |
| **FailureTagRule** | Injected failure simulator tags | `failure_tag != "none"` |

### Normalized Anomaly Scoring

The `DetectionService` computes a **continuous anomaly score** in the range `[0.0, 1.0]` from the raw log fields. This is the **primary signal** — severity is derived from it, not hardcoded.

#### Score Components

| Component | Logic | Max Contribution |
|-----------|-------|-----------------|
| **Latency** | ≤200ms → 0, 200–500ms → 0.3, >500ms → 0.6 | 0.6 |
| **Status Code** | 2xx → 0, 4xx (non-429) → 0.4, 5xx → 0.7 | 0.7 |
| **Failure Tag** | `"none"` → 0, any other → 0.6 | 0.6 |
| **Rate Limit (429)** | 429 status → +0.5 | 0.5 |
| **Advanced Engine Bump** | If `RateBasedEngine` or `SilenceDetectionEngine` triggered → +0.5 | 0.5 |

```
anomaly_score = min(1.0, latency_score + status_score + failure_score + rate_limit_score + engine_bump)
```

The score is clamped to `[0.0, 1.0]` and rounded to 4 decimal places.

#### Example Scores

| Scenario | Components | Score | Severity |
|----------|-----------|-------|----------|
| Normal 200 OK, 50ms | 0 + 0 + 0 + 0 + 0 | **0.0** | `low` |
| Slow response (350ms) | 0.3 + 0 + 0 + 0 + 0 | **0.3** | `medium` |
| Server error (500) | 0 + 0.7 + 0 + 0 + 0 | **0.7** | `high` |
| 429 rate limited | 0 + 0 + 0 + 0.5 + 0 | **0.5** | `medium` |
| Server error + high latency | 0.6 + 0.7 + 0 + 0 + 0 | **1.0** | `critical` |
| Failure tag + silence detected | 0 + 0 + 0.6 + 0 + 0.5 | **1.0** | `critical` |

A log is classified as an **anomaly** when `anomaly_score >= DETECTION_ANOMALY_THRESHOLD` (default: `0.4`).

### Severity Classification

The continuous score is mapped to a **4-tier discrete severity level**:

| Score Range | Severity |
|------------|----------|
| 0.00 – 0.29 | `low` |
| 0.30 – 0.59 | `medium` |
| 0.60 – 0.79 | `high` |
| 0.80 – 1.00 | `critical` |

### LLM Escalation Policy

Not all anomalies need expensive LLM-based causal analysis. The `requires_llm` flag is determined by the nature of the signals, not just severity:

| Condition | Escalated to LLM? | Rationale |
|-----------|-------------------|-----------| 
| `failure_tag` is present (not "none") |  No | Classification is already clear from the tag |
| Single clear signal (`server_error`, `rate_limit`, `rate_based_error_spike`) |  No | Root cause is obvious, rule-based healing sufficient |
| Only `high_latency` with no other context |  Yes | Ambiguous — could be DB, network, or upstream issue |
| 3+ engines triggered with conflicting signals | Yes | Complex multi-signal anomaly needs AI reasoning |

### Structured Output

The detection service produces a consistent structured output for every log:

```json
{
    "detection_id": "a1b2c3d4-...",
    "timestamp": "2026-04-21T12:00:00Z",
    "service": "niramay",
    "endpoint": "/api/v1/orders/123",
    "method": "GET",
    "status_code": 500,
    "response_time_ms": 620.5,
    "failure_tag": "none",
    "request_id": "8f14e45f-...",
    "engines_triggered": ["feature_rule_engine"],
    "anomaly_reasons": ["server_error", "high_latency"],
    "anomaly_score": 0.87,
    "severity": "critical",
    "is_anomaly": true,
    "requires_llm": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `detection_id` | `str` | Unique UUID for this detection event |
| `is_anomaly` | `bool` | Whether the log crossed the anomaly threshold |
| `anomaly_score` | `float` | Normalized score between 0.0 and 1.0 |
| `anomaly_reasons` | `list[str]` | De-duplicated names of the signals that fired |
| `severity` | `str` | Derived severity: `low`, `medium`, `high`, `critical` |
| `engines_triggered` | `list[str]` | De-duplicated names of the engines that fired |
| `requires_llm` | `bool` | Whether this anomaly should be escalated to Stage 3 |

### Post-Detection Dispatch (Worker)

After detection, the worker handles all side effects:

**If anomaly detected:**
1. Run Causal Engine (if `requires_llm` is true)
2. Run Healing Engine → determine and execute healing action
3. Push to Redis `observation:anomalies` (capped at 1000)
4. Update Redis stats (`anomaly_stats:type`, `anomaly_stats:endpoint`)
5. Write to OpenSearch `b-anomaly-records`
6. Write healing result to Redis `healing:actions` + OpenSearch `b-healing-records`

**If healthy:**
1. Write lightweight record to OpenSearch `b-healthy-logs`

### Stage 2 Files Involved

| File | Role |
|------|------|
| `backend/app/detection/index.py` | `DetectionService` — orchestrates all 4 engines in parallel, computes normalized [0,1] score, derives severity |
| `backend/app/detection/worker.py` | Background async worker — pops from Redis queue, runs detection, dispatches to Redis + OpenSearch + Healing |
| `backend/app/detection/engine.py` | **Deprecated** — backward-compatibility stub, delegates to `DetectionService` |
| `backend/app/detection/engines/base_engine.py` | Abstract base class for all detection engines |
| `backend/app/detection/engines/feature_rule_engine.py` | Composes LatencyRule + StatusCodeRule + FailureTagRule |
| `backend/app/detection/engines/rate_based_engine.py` | Redis-backed error frequency spike detection |
| `backend/app/detection/engines/silence_detection_engine.py` | Redis-backed endpoint silence / crash detection |
| `backend/app/detection/engines/baseline_anomaly_engine.py` | Redis-backed rolling average deviation detection |
| `backend/app/detection/rules/base.py` | `BaseRule` abstract class and `RuleResult` dataclass |
| `backend/app/detection/rules/latency.py` | High latency detection sub-rule |
| `backend/app/detection/rules/status.py` | HTTP status code anomaly sub-rule |
| `backend/app/detection/rules/failure.py` | Failure tag detection sub-rule |
| `backend/app/detection/rules/rate.py` | Traffic spike detection sub-rule (in-memory) |
| `backend/app/detection/rules/silence.py` | Endpoint silence detection sub-rule (in-memory) |

---

## Configuration Reference

All detection parameters are configurable via environment variables or `backend/app/core/config.py`:

### Stage 1 — Ingestion

| Setting | Default | Description |
|---------|---------|-------------|
| `RABBITMQ_HOST` | `localhost` | RabbitMQ server host |
| `RABBITMQ_PORT` | `5672` | RabbitMQ server port |
| `RABBITMQ_USER` | `guest` | RabbitMQ username |
| `RABBITMQ_PASSWORD` | `guest` | RabbitMQ password |
| `RABBITMQ_QUEUE_NAME` | `component-c-logs` | Queue name for log messages |
| `OPENSEARCH_HOST` | `localhost` | OpenSearch host |
| `OPENSEARCH_PORT` | `9200` | OpenSearch port |

### Stage 2 — Detection

| Setting | Default | Description |
|---------|---------|-------------|
| `DETECTION_LATENCY_THRESHOLD_MS` | `300.0` | Latency above this (ms) triggers LatencyRule |
| `DETECTION_ANOMALY_THRESHOLD` | `0.4` | Minimum normalized score to classify as anomaly |
| `RATE_BASED_ERROR_THRESHOLD` | `5` | Errors in window before RateBasedEngine fires |
| `RATE_BASED_WINDOW_SECONDS` | `60` | Rolling window size for rate-based detection |
| `SILENCE_THRESHOLD_SECONDS` | `120` | Silence gap before SilenceDetectionEngine fires |
| `SILENCE_CHECK_INTERVAL_SECONDS` | `30` | Background check frequency for silence detection |
| `BASELINE_DEVIATION_FACTOR` | `2.0` | Fire when response time > factor × baseline average |
| `BASELINE_MIN_SAMPLES` | `20` | Minimum samples before baseline is valid |

### Stage 2 — Legacy (Preserved for Backward Compatibility)

| Setting | Default | Description |
|---------|---------|-------------|
| `DETECTION_ANOMALY_SCORE_THRESHOLD` | `3` | Old integer-based threshold (used by deprecated `engine.py` stub) |
| `DETECTION_WEIGHT_LATENCY` | `0.25` | Legacy weight — not used in current scoring |
| `DETECTION_WEIGHT_STATUS` | `0.25` | Legacy weight — not used in current scoring |
| `DETECTION_WEIGHT_FAILURE` | `0.20` | Legacy weight — not used in current scoring |
| `DETECTION_WEIGHT_RATE` | `0.15` | Legacy weight — not used in current scoring |
| `DETECTION_WEIGHT_SILENCE` | `0.15` | Legacy weight — not used in current scoring |
