# Niramay Frontend

> React 18 + TypeScript dashboard for the Niramay self-healing platform, featuring a "Liquid Glass" design system with real-time monitoring of the full healing pipeline.

---

## Overview

The Niramay dashboard provides a single-pane-of-glass view into the self-healing pipeline. It visualizes observation logs, anomaly detections, incident reports, healing actions, and escalation alerts in real-time.

---

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **Vite** | Build tool & dev server |
| **TailwindCSS** | Utility-first styling |
| **Inter + JetBrains Mono** | Typography (Google Fonts) |

---

## Design System — "Liquid Glass"

The frontend uses a custom design system documented in [`NIRAMAY_REDESIGN.md`](NIRAMAY_REDESIGN.md). Key characteristics:

- **Glassmorphism** — Semi-transparent panels with `backdrop-filter: blur()` and near-invisible borders
- **Light + Dark themes** — Deep navy-black dark mode, warm off-white light mode
- **Editorial typography** — Large stat numbers (48px, weight 300), uppercase labels
- **Spring physics** — Hover animations use `cubic-bezier(0.34, 1.56, 0.64, 1)`
- **Accessibility** — WCAG AA contrast, `prefers-reduced-motion` support, focus-visible outlines

All design tokens live in [`src/designSystem.ts`](src/designSystem.ts).

---

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Toggle.tsx              # Glass pill theme toggle
│   │   ├── SkeletonBlock.tsx       # Shimmer loading state
│   │   ├── EmptyState.tsx          # Empty data state
│   │   ├── StatCard.tsx            # Editorial floating stat number
│   │   ├── ObservationFeed.tsx     # Live traffic log table
│   │   ├── DetectionAlerts.tsx     # Anomaly alert cards
│   │   ├── HealingActions.tsx      # Healing action feed
│   │   └── AICopilot.tsx           # AI analysis panel
│   ├── hooks/                      # Custom React hooks
│   ├── pages/
│   │   └── HealingDashboard.tsx    # Main dashboard page
│   ├── designSystem.ts             # Tokens, glass helpers, theme context
│   ├── index.css                   # Global styles, scrollbar, animations
│   ├── App.tsx                     # Root component with routing
│   ├── App.test.tsx                # App-level tests
│   ├── main.tsx                    # Entry point
│   └── setupTests.ts              # Test configuration
├── index.html                      # HTML entry point
├── package.json                    # Dependencies & scripts
├── tailwind.config.js              # TailwindCSS configuration
├── postcss.config.js               # PostCSS plugins
├── tsconfig.json                   # TypeScript configuration
├── vite.config.ts                  # Vite configuration with API proxy
├── Dockerfile                      # Container image definition
├── NIRAMAY_REDESIGN.md             # Design system documentation
├── REDESIGN_CHANGELOG.md           # Design change log
└── .env.example                    # Environment variable template
```

---

## Dashboard Panels

| Panel | Data Source | What It Shows |
|-------|-----------|---------------|
| **Stats Row** | `/api/v1/stats` | Total logs, anomalies, healings, success rate, uptime |
| **Observation Feed** | `/api/v1/observation/logs` | Real-time API traffic with status codes, latency, service names |
| **Detection Alerts** | `/api/v1/detection/anomalies` | Anomaly detections with engine scores and classifications |
| **Healing Actions** | `/api/v1/healing/actions` | Executed healing strategies with outcomes |
| **AI Copilot** | `/api/v1/incident/reports` | AI-generated incident reports with root cause analysis |
| **Escalations** | `/api/v1/escalations` | Failed healings escalated to human operators |

---

## Setup

### Development

```bash
npm install
npm run dev
# Opens at http://localhost:5173 (or 3000 in Docker)
```

The Vite dev server proxies `/api/*` requests to `http://localhost:8000`.

### Production build

```bash
npm run build
npm run preview
```

### Running tests

```bash
npm run test
```

### Docker

```bash
docker build -t niramay-frontend .
docker run -p 3000:3000 niramay-frontend
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | (empty, uses proxy) | Backend API base URL |
