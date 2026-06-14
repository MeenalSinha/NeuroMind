# NeuroMind — Enterprise Brain + Agent Operating System

Built for the Splunk Agentic AI Hackathon by **Team NeuroIgniter**.

NeuroMind combines two ideas into one platform:

- **SplunkMind** — a multi-agent orchestration layer that investigates incidents,
  security events, and cost anomalies by coordinating specialist agents (SRE, Log
  Analyst, Metrics, Deployment, Security, Compliance, Cost, Business Impact), backed
  by Splunk-style telemetry search, metrics, and SOAR playbooks.
- **NeuroOps** — an enterprise memory and intelligence layer: a memory graph of
  services, incidents, deployments and agents, a causal reasoning / hypothesis-tree
  engine, and an organizational learning engine that surfaces lessons from past
  incidents during new investigations.

An SRE can ask "Why is checkout latency increasing?" and watch agents investigate,
build a causal hypothesis tree, find the root cause (a risky deployment), recall a
similar past incident, and propose remediation. **All of this is genuinely
persisted**: new learnings, agent activity, incident state, and security
containment actions are written to SQLite and remain after a page refresh or
backend restart.

---

## 1. What's real vs. what's mocked

NeuroMind is designed so that every code path is real and exercised end-to-end --
the only thing that changes between "demo mode" and "fully live" is which external
system answers a given call. Nothing in the UI is hardcoded display text that
bypasses the backend.

| Capability | Default (demo) | With credentials configured |
|---|---|---|
| Persistence (investigations, learnings, agent memory, incident/security state, audit log) | **Always real** -- SQLite (`backend/neuromind.db`), created automatically | Same (swap to Postgres later if desired) |
| Authentication & audit log | **Always real** -- bearer token required on all write endpoints, every action logged with actor + timestamp | Set a strong `NEUROMIND_API_KEY` |
| AI reasoning | Deterministic trace: real tool calls (telemetry search, metrics, deployment history, memory graph) executed against the mock/real Splunk layer, with curated synthesis | Set `ANTHROPIC_API_KEY` + `USE_MOCK_AI=false` → Claude runs a genuine multi-turn **tool-use loop**, deciding which tools to call and producing its own root cause / business impact / recommendations |
| Splunk telemetry, metrics, SOAR | Realistic synthetic data, identical response shape to live Splunk | Set `SPLUNK_HOST` + `SPLUNK_TOKEN` + `USE_MOCK_SPLUNK=false` → real Splunk REST API calls (`/services/search/jobs/export`, `mstats`, `/rest/playbook/.../run`), with automatic fallback to mock if the live call fails |

The Settings page reads `/api/health` and the audit log live, so it always shows the
*actual* current configuration -- it never claims to be live when it isn't.

---

## 2. Project structure

```
neuromind/
├── backend/                  FastAPI application
│   ├── app/
│   │   ├── agents/           Multi-agent orchestrator (orchestrator.py)
│   │   ├── api/               REST + WebSocket routers (one file per module)
│   │   ├── core/              Settings / configuration (config.py)
│   │   ├── data/               Seed dataset + memory graph builder (mock_data.py)
│   │   ├── models/             Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── ai_service.py     Claude/GPT calls + real agentic tool-use loop
│   │   │   ├── splunk_service.py Real Splunk REST client with mock fallback
│   │   │   └── auth.py            Bearer-token auth dependency + audit logging
│   │   ├── db.py                SQLite persistence layer
│   │   └── main.py              FastAPI app entrypoint, router wiring, CORS, DB init
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/                  Next.js 15 (App Router) + TypeScript + Tailwind
    ├── src/
    │   ├── app/                One folder per route (see "Pages" below)
    │   ├── components/          Reusable UI: Sidebar, Topbar, StateViews, charts, etc.
    │   └── lib/                  api.ts (typed API client w/ auth), nav.ts
    ├── package.json
    ├── tailwind.config.js
    └── next.config.js
```

### Pages (frontend/src/app/)

| Route | Module | Description |
|---|---|---|
| `/` | Overview Dashboard | KPI row, pipeline throughput, AI assistant panel, active incidents, recent learnings, top services, agent activity, incident trend |
| `/ops-intelligence` | NeuroMind Chat | Ask natural-language questions; runs the multi-agent investigation pipeline. Shows whether the response came from the live agentic loop or the deterministic trace |
| `/memory-graph` | Enterprise Memory Graph | Interactive ReactFlow graph of services, incidents, deployments, agents -- grows over time as investigations and Judge Mode runs add new nodes |
| `/agents` | Multi-Agent Command Center | Live roster of all agents with status, current task, confidence, and real historical run counts / last findings from SQLite |
| `/incidents` | Autonomous Incident Commander | Active incidents (with real persisted status), investigation results, causal hypothesis tree, resolve action, and **Judge Mode** demo |
| `/security` | Security Investigation | Security events, MITRE ATT&CK mapping, blast radius, containment playbook (real SOAR call + persisted status + audit log) |
| `/cost` | Cost & FinOps | Cost breakdown chart, executive cost-change report (second demo scenario: "Why did cloud costs rise 35%?") |
| `/learnings` | Organizational Learning Engine | Root cause / resolution / lessons learned, sourced from SQLite -- includes seed data plus anything generated by investigations or Judge Mode |
| `/marketplace` | MCP Agent Marketplace | Browse and deploy agents, run pre-built multi-agent workflows |
| `/observability` | Observability | Incident trend chart and per-service health table |
| `/deployments` | Deployments | Recent releases with automated risk scoring |
| `/assistants` | AI Assistants | Chat entry points into each specialist agent |
| `/reports` | Reports | Enterprise health scorecard |
| `/settings` | Settings | **Live** integration status (AI, Splunk, persistence, auth) read from `/api/health`, plus the full audit log |

---

## 3. Running locally

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # optional but recommended
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. A SQLite database file
(`backend/neuromind.db`) is created automatically on first run and seeded with
historical learnings and initial incident/security state.

Visit `http://localhost:8000/docs` for interactive Swagger docs, and
`http://localhost:8000/api/health` to see live integration status.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:3000`. `next.config.js` rewrites
`/api/*` requests to `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`).

---

## 4. Authentication

All read (GET) endpoints are open so the dashboard loads without friction. All
write (POST) endpoints --
`/api/incidents/{id}/investigate`, `/api/incidents/{id}/resolve`,
`/api/security/contain/{id}`, and `/api/incidents/_audit/log` -- require:

```
Authorization: Bearer <NEUROMIND_API_KEY>
```

`NEUROMIND_API_KEY` defaults to `neuromind-dev-key` (set in both
`backend/.env.example` and the frontend's `NEXT_PUBLIC_API_KEY`), so the demo works
out of the box. Every call to a write endpoint -- success or 401 -- is recorded in
the `audit_log` table with the resolved actor, action, target, and timestamp,
viewable on the **Settings** page.

To harden: set a strong `NEUROMIND_API_KEY` in `backend/.env` and the matching
`NEXT_PUBLIC_API_KEY` for the frontend build.

---

## 5. Connecting real Splunk / AI

Everything below is opt-in. With no configuration, NeuroMind runs entirely on
SQLite + realistic synthetic telemetry and a deterministic-but-real tool-execution
trace.

### Real Splunk

In `backend/.env`:

```env
SPLUNK_HOST=https://your-splunk-instance:8089
SPLUNK_TOKEN=<a Splunk authentication token>
USE_MOCK_SPLUNK=false
```

This activates real calls in `app/services/splunk_service.py`:
- `search()` → `GET /services/search/jobs/export` (SPL queries, `output_mode=json`)
- `get_metrics()` → `mstats` SPL against Observability metrics
- `run_soar_playbook()` → `POST /rest/playbook/{name}/run`

If the live instance is unreachable or misconfigured, every call automatically
falls back to mock data and tags the response with `"source": "mock"` /
`"live_error"` so failures are visible rather than silent.

### Real LLM agentic reasoning

In `backend/.env`:

```env
ANTHROPIC_API_KEY=<your key>
USE_MOCK_AI=false
```

This activates `app/services/ai_service.run_agentic_investigation`: Claude is given
five tools (`search_telemetry`, `get_service_metrics`, `get_deployment_history`,
`search_memory_graph`, `get_past_incidents`, plus `submit_findings` to conclude) and
runs a genuine multi-turn tool-use loop, deciding for itself which tools to call and
in what order, before producing the final root cause, business impact, and
recommended actions. Every tool call is logged as an investigation step exactly like
the deterministic trace, so the UI is identical either way -- except the
**"Agentic (live LLM reasoning)"** badge replaces **"Deterministic trace (mock
AI)"** on the Ops Intelligence and Incident Commander pages.

---

## 6. Judge Mode

On the `/incidents` page, click **"Run Demo Incident"**. This opens a WebSocket to
`/api/judge-mode/run`, which streams a scripted ~25-second investigation of a
synthetic incident (`INC-301`) step-by-step. On completion, a new learning for
INC-301 is written to the Organizational Learning Engine and the incident is marked
resolved -- both genuinely persisted, visible on `/learnings` and `/memory-graph`
(which gains a new node), and surviving a page refresh or backend restart.

---

## 7. Demo scenarios

1. **"Why is checkout latency increasing in Singapore?"** (Ops Intelligence chat) --
   agents investigate, build a causal hypothesis tree pointing to deployment
   `DEP-5521`, and recall a similar past incident (`INC-176`).
2. **Security event triage** (`/security`) -- investigate `SEC-901` (suspicious login
   from Lagos), view blast radius across impacted assets, and run the containment
   playbook (real SOAR call, persisted "contained" status, audit-logged).
3. **"Why did cloud costs rise 35%?"** (`/ops-intelligence` or `/cost` → Explain) --
   a dedicated hypothesis tree correlates the cost spike with the same `DEP-5521`
   deployment already identified in scenario 1, demonstrating cross-scenario memory
   graph reasoning.
4. **Judge Mode** (`/incidents` → Run Demo Incident) -- one-click scripted
   end-to-end investigation with real persistence at the end.

---

## 8. Tech stack

**Backend**: FastAPI, Pydantic, WebSockets, httpx (real Splunk REST client),
Anthropic SDK (real agentic tool-use loop), SQLite (stdlib, zero external deps).

**Frontend**: Next.js 15 (App Router), React 18, TypeScript, Tailwind CSS,
Framer Motion, Recharts, React Flow, lucide-react icons.
