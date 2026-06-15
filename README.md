# NeuroMind — Enterprise Brain + Agent Operating System

> Built for the **Splunk Agentic AI Hackathon** by Team NeuroIgniter.

NeuroMind is a production-grade AI-powered operations platform that moves enterprises beyond dashboards and manual investigations to **autonomous reasoning, learning, and action**.

**Ask it:** *"Why is checkout latency increasing in Singapore?"*  
**It answers:** Why it happened, what happened before, what will happen next, and what to do about it — automatically.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Project Structure](#3-project-structure)
4. [Prerequisites](#4-prerequisites)
5. [Setup & Installation](#5-setup--installation)
6. [Running the Application](#6-running-the-application)
7. [Configuration](#7-configuration)
8. [Pages & Features](#8-pages--features)
9. [Demo Scenarios](#9-demo-scenarios)
10. [Judge Mode](#10-judge-mode)
11. [Authentication](#11-authentication)
12. [Connecting Real Splunk & AI](#12-connecting-real-splunk--ai)
13. [Tech Stack](#13-tech-stack)
14. [What's Real vs. Mocked](#14-whats-real-vs-mocked)

---

## 1. Overview

NeuroMind combines two systems into one unified platform:

| Module | Description |
|--------|-------------|
| **SplunkMind** | Multi-agent orchestration layer. Coordinates specialist agents (SRE, Log Analyst, Metrics, Deployment, Security, Compliance, Cost, Business Impact) to investigate incidents backed by Splunk-style telemetry, metrics, and SOAR playbooks. |
| **NeuroOps** | Enterprise memory and intelligence layer. A live memory graph of services, incidents, deployments, and agents with a causal reasoning engine and an organizational learning engine that surfaces lessons from past incidents during new investigations. |

All investigation results, learnings, agent state, and security actions are **genuinely persisted** to SQLite and survive page refreshes and server restarts.

---

## 2. Architecture

```
Browser (Next.js)  ──/api/*──▶  FastAPI Backend  ──▶  SQLite DB
                                       │
                                       ├──▶  Splunk REST API  (or mock)
                                       └──▶  Anthropic Claude (or mock)
```

- The **frontend** communicates exclusively through `/api/*` which Next.js proxies to the backend.
- The **backend** handles all business logic, persistence, authentication, and external service calls.
- **No credentials are required** to run in demo mode — the app ships with realistic synthetic data.

---

## 3. Project Structure

```
neuromind/
├── backend/                        FastAPI application
│   ├── app/
│   │   ├── agents/
│   │   │   └── orchestrator.py     Multi-agent orchestration logic
│   │   ├── api/                    REST + WebSocket routers (one file per module)
│   │   │   ├── agents.py
│   │   │   ├── chat.py
│   │   │   ├── cost.py
│   │   │   ├── dashboard.py
│   │   │   ├── incidents.py
│   │   │   ├── judge_mode.py       WebSocket streaming Judge Mode
│   │   │   ├── memory_graph.py
│   │   │   └── security.py
│   │   ├── core/
│   │   │   └── config.py           Settings loaded from .env
│   │   ├── data/
│   │   │   └── mock_data.py        Seed datasets + memory graph builder
│   │   ├── models/
│   │   │   └── schemas.py          Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── ai_service.py       Claude/GPT agentic tool-use loop
│   │   │   ├── splunk_service.py   Real Splunk REST client with mock fallback
│   │   │   └── auth.py             Bearer-token auth + audit logging
│   │   ├── db.py                   SQLite persistence layer
│   │   └── main.py                 FastAPI entrypoint, router wiring, CORS, DB init
│   ├── requirements.txt
│   └── .env.example                Reference configuration file
│
└── frontend/                       Next.js 15 (App Router) + TypeScript + Tailwind
    ├── src/
    │   ├── app/                    One folder per route
    │   └── components/             Shared UI components
    ├── next.config.js              API proxy configuration
    ├── tailwind.config.js
    └── package.json
```

---

## 4. Prerequisites

### Backend
| Requirement | Version | Notes |
|-------------|---------|-------|
| Python | **3.11** | ⚠️ Python 3.12+ may have compatibility issues with `pydantic-core`. Use 3.11. |
| pip | Latest | `python -m pip install --upgrade pip` |

### Frontend
| Requirement | Version |
|-------------|---------|
| Node.js | **18+** |
| npm | **9+** |

---

## 5. Setup & Installation

### Clone the Repository

```bash
git clone https://github.com/MeenalSinha/NeuroMind.git
cd NeuroMind
```

### Backend Setup

```bash
cd backend

# Create a Python 3.11 virtual environment
python3.11 -m venv .venv311

# Activate it
# macOS / Linux:
source .venv311/bin/activate
# Windows (PowerShell):
.\.venv311\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Create your environment file
cp .env.example .env
```

### Frontend Setup

```bash
cd ../frontend
npm install
```

---

## 6. Running the Application

You need **two terminals** running simultaneously.

### Terminal 1 — Backend

```bash
cd backend

# Activate virtual environment
# macOS / Linux:
source .venv311/bin/activate
# Windows (PowerShell):
.\.venv311\Scripts\Activate.ps1

# Start the server
uvicorn app.main:app --reload --port 8000
```

The backend will be available at:
- **API Base:** `http://localhost:8000`
- **Interactive Docs (Swagger):** `http://localhost:8000/docs`
- **Health Check:** `http://localhost:8000/api/health`

On first run, a SQLite database (`backend/neuromind.db`) is created automatically and seeded with historical learnings, incident state, and agent memory.

### Terminal 2 — Frontend

```bash
cd frontend
npm run dev
```

The application will be available at **`http://localhost:3000`**.

---

## 7. Configuration

The backend is configured via `backend/.env`. Copy `backend/.env.example` to `backend/.env` to get started. The app runs fully out of the box with no changes required.

### Full `.env` Reference

```env
# ──────────────────────────────────────────────
# Server
# ──────────────────────────────────────────────
APP_ENV=development
APP_PORT=8000

# Allowed CORS origins (comma-separated for multiple)
CORS_ORIGINS=http://localhost:3000

# ──────────────────────────────────────────────
# Authentication
# ──────────────────────────────────────────────
# Bearer token required for all state-changing POST endpoints.
# Defaults to "neuromind-dev-key" — change before deploying.
NEUROMIND_API_KEY=neuromind-dev-key

# ──────────────────────────────────────────────
# AI / LLM Layer
# ──────────────────────────────────────────────
# Leave USE_MOCK_AI=true (default) to use the deterministic trace.
# Set USE_MOCK_AI=false and provide an API key to use real Claude reasoning.
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
USE_MOCK_AI=true

# ──────────────────────────────────────────────
# Splunk Integration
# ──────────────────────────────────────────────
# Leave USE_MOCK_SPLUNK=true (default) to use realistic synthetic telemetry.
# Set USE_MOCK_SPLUNK=false and provide credentials to use a real Splunk instance.
# Calls automatically fall back to mock data if Splunk is unreachable.
SPLUNK_HOST=
SPLUNK_PORT=8089
SPLUNK_TOKEN=
USE_MOCK_SPLUNK=true

# ──────────────────────────────────────────────
# Data / Persistence
# ──────────────────────────────────────────────
# SQLite is used by default (zero external deps, created automatically).
# The PostgreSQL / Neo4j / Redis vars below are reserved for future use.
POSTGRES_URL=
NEO4J_URI=
NEO4J_USER=
NEO4J_PASSWORD=
REDIS_URL=
USE_MOCK_GRAPH=true
```

### Frontend Environment Variables

Create `frontend/.env.local` (optional — defaults work for local development):

```env
# URL of the FastAPI backend
NEXT_PUBLIC_API_URL=http://localhost:8000

# Must match NEUROMIND_API_KEY in backend/.env
NEXT_PUBLIC_API_KEY=neuromind-dev-key
```

---

## 8. Pages & Features

| Route | Feature | Description |
|-------|---------|-------------|
| `/` | Overview Dashboard | KPI health scores, pipeline throughput, active incidents, recent learnings, agent activity |
| `/ops-intelligence` | NeuroMind Chat | Natural-language Q&A powered by the multi-agent investigation pipeline |
| `/memory-graph` | Enterprise Memory Graph | Interactive graph of services, incidents, deployments, and agents — grows as investigations run |
| `/agents` | Multi-Agent Command Center | Live agent roster with status, current tasks, confidence scores, and historical run counts |
| `/incidents` | Autonomous Incident Commander | Active incidents, causal hypothesis tree, resolve actions, and Judge Mode |
| `/security` | Security Investigation | Security events, MITRE ATT&CK mapping, blast radius analysis, and containment playbooks |
| `/cost` | Cost & FinOps | Cloud cost breakdown chart and AI-powered cost anomaly explanation |
| `/learnings` | Organizational Learning Engine | Root cause / resolution / lessons learned from all past investigations |
| `/marketplace` | MCP Agent Marketplace | Browse, deploy, and run multi-agent workflows |
| `/observability` | Observability | Service health table and incident trend chart |
| `/deployments` | Deployments | Recent releases with automated risk scoring |
| `/assistants` | AI Assistants | Chat with individual specialist agents |
| `/reports` | Reports | Enterprise health scorecard |
| `/settings` | Settings | Live integration status and full audit log |

---

## 9. Demo Scenarios

These work immediately with no credentials required:

### Scenario 1: Ops Intelligence — Latency Investigation
Navigate to `/ops-intelligence` and ask:
> **"Why is checkout latency increasing in Singapore?"**

Agents will investigate, build a causal hypothesis tree linking the spike to deployment `DEP-5521`, and recall a similar historical incident `INC-176`.

### Scenario 2: Security Triage
Navigate to `/security`. Click on `SEC-901` (suspicious login from Lagos).
- View the blast radius across impacted assets
- Run the containment playbook
- The "contained" status is persisted to SQLite and appears in the audit log on `/settings`

### Scenario 3: FinOps — Cost Anomaly
Navigate to `/cost` or ask in `/ops-intelligence`:
> **"Why did cloud costs rise 35%?"**

A dedicated hypothesis tree correlates the spike to the same `DEP-5521` deployment from Scenario 1, demonstrating cross-scenario memory graph reasoning.

### Scenario 4: Judge Mode (see below)

---

## 10. Judge Mode

Navigate to `/incidents` and click **"Run Demo Incident"**.

This opens a WebSocket to `/api/judge-mode/run` and streams a scripted ~25-second end-to-end investigation of synthetic incident **INC-301**. On completion:
- A new learning for `INC-301` is written to the Organizational Learning Engine
- The incident is marked as resolved
- A new node is added to the Memory Graph

All of this is **genuinely persisted** — visible on `/learnings` and `/memory-graph` after the run, and surviving a full server restart.

---

## 11. Authentication

All **GET** endpoints are open. All **POST** endpoints (investigate, resolve, contain, audit) require:

```http
Authorization: Bearer <NEUROMIND_API_KEY>
```

The default dev key is `neuromind-dev-key` (pre-configured in both `.env.example` and the frontend defaults), so the demo works out of the box. Every write call — success or 401 — is logged to the `audit_log` table with actor, action, target, and timestamp, viewable on the **Settings** page.

**To harden for production:** Set a strong `NEUROMIND_API_KEY` in `backend/.env` and the matching `NEXT_PUBLIC_API_KEY` in `frontend/.env.local`.

---

## 12. Connecting Real Splunk & AI

### Enable Real Splunk

In `backend/.env`:

```env
SPLUNK_HOST=https://your-splunk-instance:8089
SPLUNK_TOKEN=<your Splunk authentication token>
USE_MOCK_SPLUNK=false
```

This activates real REST API calls:
- `search()` → `GET /services/search/jobs/export` (SPL queries)
- `get_metrics()` → `mstats` SPL against Observability metrics
- `run_soar_playbook()` → `POST /rest/playbook/{name}/run`

If Splunk is unreachable, calls automatically fall back to mock data with the response tagged `"source": "mock"`.

### Enable Real Claude Reasoning

In `backend/.env`:

```env
ANTHROPIC_API_KEY=<your Anthropic API key>
USE_MOCK_AI=false
```

Claude is given five tools (`search_telemetry`, `get_service_metrics`, `get_deployment_history`, `search_memory_graph`, `get_past_incidents`) and runs a genuine multi-turn agentic tool-use loop. The UI is identical either way — an **"Agentic (live LLM reasoning)"** badge replaces **"Deterministic trace (mock AI)"** on the relevant pages.

---

## 13. Tech Stack

### Backend
| Library | Version | Purpose |
|---------|---------|---------|
| `fastapi` | 0.115.0 | REST + WebSocket API framework |
| `uvicorn` | 0.30.6 | ASGI server |
| `pydantic` | 2.9.2 | Request/response schema validation |
| `python-dotenv` | 1.0.1 | Environment variable loading |
| `websockets` | 13.1 | WebSocket support for Judge Mode streaming |
| `httpx` | 0.27.2 | HTTP client for real Splunk REST calls |
| `anthropic` | 0.36.0 | Claude agentic tool-use loop |
| `openai` | 1.51.0 | Optional OpenAI support |
| `sqlalchemy` | 2.0.35 | ORM (used with SQLite) |
| `python-multipart` | 0.0.9 | Form data support |

### Frontend
| Library | Version | Purpose |
|---------|---------|---------|
| `next` | 15.0.3 | React framework (App Router) |
| `react` | 18.3.1 | UI rendering |
| `typescript` | 5.6.3 | Type safety |
| `tailwindcss` | 3.4.14 | Utility-first styling |
| `framer-motion` | 11.11.17 | Animations and transitions |
| `recharts` | 2.13.3 | Charts and data visualizations |
| `reactflow` | 11.11.4 | Interactive memory graph |
| `lucide-react` | 0.460.0 | Icon library |

---

## 14. What's Real vs. Mocked

Nothing in the UI is hardcoded display text that bypasses the backend. Every rendered value is fetched from a live API endpoint.

| Capability | Default (demo mode) | With credentials |
|-----------|--------------------|--------------------|
| **Persistence** | ✅ Always real — SQLite auto-created | Same (swap to Postgres later) |
| **Auth & Audit Log** | ✅ Always real — bearer token + full audit trail | Set a strong `NEUROMIND_API_KEY` |
| **AI Reasoning** | Deterministic trace with real tool execution against mock Splunk | `ANTHROPIC_API_KEY` + `USE_MOCK_AI=false` → live Claude tool-use loop |
| **Splunk Telemetry** | Realistic synthetic data (identical response shape) | `SPLUNK_HOST` + `SPLUNK_TOKEN` + `USE_MOCK_SPLUNK=false` → real REST calls with automatic mock fallback |
| **Settings Page** | Reads `/api/health` live — never claims to be live when it isn't | Same |
