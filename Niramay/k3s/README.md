# Niramay K3s Deployment

> Kubernetes (K3s) manifests for deploying the complete self-healing platform (Niramay + CRAVE) into a lightweight Kubernetes cluster.

---

## Overview

This directory contains Kubernetes manifests for deploying both Niramay and CRAVE into a K3s cluster running inside WSL2. This enables Niramay's K3s-specific healing strategies (pod restart, horizontal scaling, rollback, circuit breaker, cache flush, throttling).

---

## Files

| File | Description |
|------|-------------|
| [`setup-k3s.md`](setup-k3s.md) | Step-by-step K3s installation and deployment guide |
| `namespace.yaml` | Creates the `selfhealing` namespace |
| `niramay-rbac.yaml` | ServiceAccount + ClusterRole for Niramay to manage pods |
| `niramay-deployment.yaml` | Niramay backend + frontend + Redis + RabbitMQ + OpenSearch deployments |
| `crave-deployment.yaml` | CRAVE backend + PostgreSQL + Redis deployments |
| `docker-compose-bridge.yaml` | Bridge compose file for hybrid Docker + K3s setups |

---

## Quick Start

```bash
# Prerequisites: WSL2 + K3s installed (see setup-k3s.md)

# 1. Build and import images
docker build -t niramay-backend:latest ./backend
docker save niramay-backend:latest | sudo k3s ctr images import -

# 2. Deploy RBAC (must be first)
kubectl apply -f k3s/niramay-rbac.yaml

# 3. Deploy CRAVE (healing target)
kubectl apply -f k3s/crave-deployment.yaml

# 4. Deploy Niramay (healer)
kubectl apply -f k3s/niramay-deployment.yaml

# 5. Wait for readiness
kubectl rollout status deployment/niramay-backend
kubectl rollout status deployment/crave-backend
```

---

## RBAC

Niramay requires elevated Kubernetes permissions to execute healing strategies:

| Resource | Verbs | Purpose |
|----------|-------|---------|
| `pods` | get, list, delete | Pod health check and restart |
| `deployments` | get, list, update, patch | Rolling restart, scale, rollback |
| `replicasets` | get, list | Rollback revision lookup |
| `services` | get, list | Service discovery |

These permissions are scoped to the `selfhealing` namespace via a ClusterRole + ClusterRoleBinding.

---

## K3s Healing Strategies

When running in K3s mode, Niramay uses Kubernetes-native healing strategies:

| Strategy | Kubernetes Action |
|----------|------------------|
| `K3sRestartStrategy` | `kubectl rollout restart deployment/crave-backend` |
| `K3sScaleUpStrategy` | `kubectl scale deployment --replicas=N` |
| `K3sRollbackStrategy` | `kubectl rollout undo deployment/crave-backend` |
| `K3sCircuitBreakerStrategy` | Scale to 0 then back up after cooldown |
| `K3sFlushCacheStrategy` | Pod annotation update triggers rolling restart |
| `K3sThrottleStrategy` | Adjust resource limits via patch |

---

For the full setup guide, see [`setup-k3s.md`](setup-k3s.md).
