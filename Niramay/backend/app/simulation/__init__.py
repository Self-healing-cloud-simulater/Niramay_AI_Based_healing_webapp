"""
Simulation Package — Isolated demo/chaos engineering components.

Contains:
    - traffic_generator: Generates synthetic HTTP traffic for demo mode
    - failure_config: Defines failure scenarios and the FailureSimulator
    - failure_middleware: FastAPI middleware that injects failures

When Component C is ready to send real logs, this package can be
swapped out entirely. The only integration point is
observation/middleware.py which publishes captured traffic to RabbitMQ.
"""
