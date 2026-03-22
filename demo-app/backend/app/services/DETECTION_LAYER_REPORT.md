# Detection (Trust) Layer — Phase 2 Report

This document outlines the architecture and implementation details for the **Detection (Trust) Layer** added to the FastAPI backend.

## 🎯 Objective
The goal of this phase was to process the raw traffic logs captured by the **Observation Layer** (Phase 1) and identify anomalous behavior. Rather than simple boolean checks, we architected a scalable, weighted **Rule Engine** running in an asynchronous background worker to avoid impacting user API latency.

---

## 🏗 Architecture Components

### 1. Modular Rule Engine (`app/services/rules/`)
We moved away from hardcoded if-statements into a pluggable class-based rule engine. Every rule evaluates an incoming log and returns a `RuleResult` with an anomaly score.

-   **`base.py`**: Defines the `BaseRule` abstract class and `RuleResult` pydantic model.
-   **`latency.py` (`LatencyRule`)**: Triggers if the `response_time_ms` exceeds `DETECTION_LATENCY_THRESHOLD_MS` (300ms). Assigns a weight of **+2**.
-   **`status.py` (`StatusCodeRule`)**: Detects Server Errors (≥ 500) and Rate Limits (429). Assigns a weight of **+3** and **+2** respectively.
-   **`failure.py` (`FailureTagRule`)**: Detects failures explicitly injected by the Failure Simulator (e.g., `database_error`). Assigns a weight of **+3**.

### 2. Detection Service (`app/services/detection_service.py`)
This is the orchestrator. It registers all rules and iterates over them for a given log.
-   Adds up the individual rule scores to generate a **`Total Anomaly Score`**.
-   Compares the total score against `DETECTION_ANOMALY_SCORE_THRESHOLD` (set to **3** in `config.py`).
-   If the threshold is met, it returns `is_anomaly=True` alongside the calculated score and a list of reasons.

### 3. Asynchronous Worker (`app/services/detection_worker.py`)
To ensure anomaly processing never blocks the main API traffic, we decoupled the detection engine from the request lifecycle.
1.  The Observation Store was updated to push new logs to a temporary Redis queue: `observation:pending_detection`.
2.  The `detection_worker_loop` runs as an `asyncio` background task within the FastAPI process.
3.  It blindly loops, popping logs from the queue (`brpop`).
4.  It passes the log to the `DetectionService`.
5.  If an anomaly is detected, it pushes the **enriched log** to a new Redis list: `observation:anomalies`.
6.  It increments stats in Redis hashes (`anomaly_stats:endpoint` and `anomaly_stats:type`).

### 4. Detection API (`app/api/v1/endpoints/anomalies.py`)
We built a dedicated endpoint to query the results of the detection layer.
-   **`GET /api/v1/detection/anomalies`**
-   Fetches enriched logs directly from the `observation:anomalies` Redis list.
-   Supports filtering by:
    -   `min_score`: Filter out minor anomalies.
    -   `type`: View only specific failure reasons.
    -   `endpoint`: View only specific API routes.
-   Returns aggregate statistics alongside the logs.
-   *Note: Authentication was removed to make it public, allowing easy verification in the browser via `http://localhost:8000/api/v1/detection/anomalies`.*

---

## 📊 The "Trust" Scoring System

The concept of "Trust" was implemented via the quantitative scoring model. 
-   **Range 0-2 (Normal)**: Mild anomalies (like passing the rate limit) that are registered but don't breach the threshold.
-   **Range 3-4 (Warning)**: Single points of failure, such as a random 500 status.
-   **Range 5-8+ (Critical)**: Cascading failures, such as a backend crash accompanied by extreme latency, scoring as high as 8.

### Why this matters for Phase 3 (Healing Layer)
By supplying a numerical `anomaly_score` instead of a static error string, the future Healing Layer can prioritize immediate architectural intervention (e.g., Database Failover or Circuit Breaking) vs passive response (e.g., Cache purges or slack alerts) depending on the severity of the score.
