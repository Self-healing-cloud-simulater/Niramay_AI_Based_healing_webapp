"""
Traffic Generator
Generates synthetic API traffic to feed the Observation → Detection → Healing pipeline.
Without the full food delivery app, this creates realistic request patterns so the
dashboard has live data to display.
"""
import asyncio
import random
import logging
import httpx

logger = logging.getLogger(__name__)

# Simulated API endpoints that the traffic generator will hit
DEMO_ENDPOINTS = [
    ("GET", "/api/v1/demo/restaurants"),
    ("GET", "/api/v1/demo/orders"),
    ("POST", "/api/v1/demo/orders"),
    ("GET", "/api/v1/demo/payments"),
    ("POST", "/api/v1/demo/payments/process"),
    ("GET", "/api/v1/demo/delivery/status"),
]

# Weights for how often each endpoint is hit (restaurants and orders more frequent)
ENDPOINT_WEIGHTS = [3, 2, 2, 1, 1, 1]


async def traffic_generator_loop(base_url: str = "http://localhost:8000", interval_ms: int = 2000):
    """
    Background task that generates synthetic API traffic.
    Sends requests to demo endpoints at regular intervals,
    which flow through the failure simulator and observation middleware.
    """
    logger.info(f"Starting Traffic Generator (interval: {interval_ms}ms)")

    # Wait for the server to be ready
    await asyncio.sleep(3)

    async with httpx.AsyncClient(timeout=10.0) as client:
        while True:
            try:
                # Pick a random endpoint weighted by frequency
                method, path = random.choices(DEMO_ENDPOINTS, weights=ENDPOINT_WEIGHTS, k=1)[0]
                url = f"{base_url}{path}"

                # Occasionally add slight jitter to interval
                jitter = random.uniform(0.5, 1.5)
                actual_interval = (interval_ms / 1000.0) * jitter

                # Make the request
                if method == "GET":
                    response = await client.get(url)
                else:
                    response = await client.post(url, json={})

                logger.debug(
                    f"Traffic: {method} {path} -> {response.status_code} "
                    f"({response.elapsed.total_seconds()*1000:.0f}ms)"
                )

            except httpx.ConnectError:
                # Server not ready yet, wait and retry
                logger.debug("Traffic generator: server not ready, retrying...")
                await asyncio.sleep(5)
                continue
            except Exception as e:
                logger.debug(f"Traffic generator error: {e}")

            await asyncio.sleep(actual_interval)


def start_traffic_generator(interval_ms: int = 2000):
    """Start the traffic generator in the background"""
    asyncio.create_task(traffic_generator_loop(interval_ms=interval_ms))
