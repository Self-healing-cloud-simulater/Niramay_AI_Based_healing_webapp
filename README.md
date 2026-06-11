# Niramay — AI-Based Self-Healing Webapp

> The healing layer of the Self-Healing Cloud platform. Contains the Niramay application (Components A + B) and supporting scripts.

---

## Structure

```
Niramay_AI_Based_healing_webapp/
├── Niramay/                  # Main application
│   ├── backend/              # FastAPI + Redis + OpenSearch + Ollama
│   ├── frontend/             # React TypeScript dashboard
│   ├── k3s/                  # Kubernetes deployment manifests
│   ├── Jenkinsfile           # CI/CD pipeline
│   ├── Makefile              # Development shortcuts
│   ├── docker-compose.yml    # Full stack orchestration
│   ├── integration_example.py # Example: external service integration
│   ├── verify_final.py       # Post-cleanup verification script
│   └── README.md             # Detailed Niramay documentation
├── scripts/
│   └── local_ci.sh           # Local CI pipeline runner
└── .gitignore
```

For detailed documentation on the Niramay system architecture, pipeline workers, detection engines, API endpoints, and setup instructions, see the **[Niramay README](Niramay/README.md)**.

---

## Quick Start

```bash
# 1. Create the shared Docker network
docker network create selfhealing-network

# 2. Start Niramay
cd Niramay
docker-compose up -d

# 3. Access the dashboard
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
# API docs: http://localhost:8000/docs
```

---

## Local CI

Run the local CI pipeline to validate backend tests, frontend tests, and Docker builds:

```bash
./scripts/local_ci.sh
```
