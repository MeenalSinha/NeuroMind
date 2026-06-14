"""
Multi-Agent Orchestration Engine.

For each investigation:

1. If USE_MOCK_AI=false and an Anthropic API key is configured, runs a
   REAL agentic tool-use loop (app.services.ai_service.run_agentic_investigation)
   where Claude decides which tools to call (telemetry search, metrics,
   deployment history, memory graph, past incidents) and produces the
   final root cause / business impact / recommendations itself.

2. Otherwise (default, no key required), runs a deterministic
   investigation trace that calls the SAME underlying tool
   implementations (splunk_service, mock_data, the SQLite-backed
   memory/learning store) in a fixed but realistic order, and uses a
   curated hypothesis tree for known scenarios. This keeps the product
   fully demoable offline while exercising real code paths (not just
   returning static strings -- e.g. get_metrics() runs every time and
   produces fresh numbers).

Either way, the resulting investigation is persisted to SQLite
(app.db.save_investigation), each agent's contribution is recorded in
agent_memory (so /api/agents reflects real historical activity), and a
new "learning" is written to the Organizational Learning Engine so
/api/memory-graph/learnings reflects the new incident on subsequent
requests -- including after a restart.
"""
import asyncio
import uuid
from datetime import datetime, timezone
from app.data import mock_data as md
from app.services import splunk_service, ai_service
from app import db


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class InvestigationState:
    def __init__(self, question: str):
        self.id = f"INV-{uuid.uuid4().hex[:8]}"
        self.question = question
        self.steps: list[dict] = []
        self.findings: dict[str, str] = {}
        self.hypothesis_tree: dict | None = None
        self.root_cause_summary: str | None = None
        self.business_impact: str | None = None
        self.recommended_actions: list[dict] = []
        self.related_incidents: list[str] = []
        self.mode: str = "mock"

    def log(self, agent_id: str | None, message: str, kind: str = "agent"):
        self.steps.append({
            "timestamp": _now_iso(),
            "type": kind,
            "agent": agent_id,
            "message": message,
        })
        if agent_id:
            db.record_agent_finding(agent_id, self.id, message, None)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "question": self.question,
            "mode": self.mode,
            "steps": self.steps,
            "findings": self.findings,
            "hypothesis_tree": self.hypothesis_tree,
            "root_cause_summary": self.root_cause_summary,
            "business_impact": self.business_impact,
            "recommended_actions": self.recommended_actions,
            "related_incidents": self.related_incidents,
        }


SCENARIOS = {
    "checkout_latency": {
        "match": lambda q: "checkout" in q.lower() and (
            "latency" in q.lower() or "slow" in q.lower() or "fail" in q.lower()
        ),
        "tree_key": "checkout_latency",
        "incident_id": "INC-201",
        "title": "Checkout Service Latency",
    },
    "cost_increase": {
        "match": lambda q: "cost" in q.lower() or "cloud" in q.lower() or "spend" in q.lower() or "billing" in q.lower(),
        "tree_key": "cost_increase",
        "incident_id": "INC-COST-1",
        "title": "Cloud Cost Anomaly",
    },
}


def _detect_scenario(question: str) -> str | None:
    for name, cfg in SCENARIOS.items():
        if cfg["match"](question):
            return name
    return None


async def run_investigation(question: str) -> dict:
    """
    Run a multi-agent investigation for a natural-language operational
    question. Returns the full investigation state including the
    hypothesis tree, root cause, business impact, and recommended
    actions, ready to be rendered by the frontend. Persists the result.
    """
    state = InvestigationState(question)
    state.log(None, f"Investigation started for: \"{question}\"", kind="system")

    scenario = _detect_scenario(question)

    # --- Attempt real agentic (LLM tool-use) path -------------------------
    agentic_result = None
    if not (state.findings):
        def _log_cb(agent_id, message, kind):
            state.log(agent_id, message, kind=kind)

        agentic_result = await ai_service.run_agentic_investigation(question, _log_cb)

    if agentic_result:
        state.mode = "agentic"
        state.root_cause_summary = agentic_result["root_cause_summary"]
        state.business_impact = agentic_result["business_impact"]
        state.recommended_actions = agentic_result["recommended_actions"]
        state.related_incidents = agentic_result.get("related_incidents", [])
        if scenario:
            tree_data = md.HYPOTHESIS_TREES.get(SCENARIOS[scenario]["tree_key"])
            if tree_data:
                state.hypothesis_tree = tree_data["root"]

    else:
        # --- Deterministic mock trace (still calls real services) --------
        state.mode = "mock"

        state.log("agent-sre", "Pulling service topology and dependency graph for "
                                "affected services.")
        await asyncio.sleep(0)

        metrics = await splunk_service.get_metrics("svc-checkout", "latency_p95_ms")
        db_metrics = await splunk_service.get_metrics("svc-checkout-db", "query_latency_p95_ms")
        checkout_latest = metrics["points"][-1]["value"]
        db_latest = db_metrics["points"][-1]["value"]
        state.findings["metrics"] = (
            f"Checkout p95 latency is currently {checkout_latest:.0f}ms "
            f"(source: {metrics['source']}). checkout-db query p95 latency is "
            f"currently {db_latest:.0f}ms (source: {db_metrics['source']})."
        )
        state.log("agent-metrics", state.findings["metrics"])

        telemetry = await splunk_service.search(
            f"index=main sourcetype=connection_pool service=checkout-db-primary "
            f"| stats count by status", earliest="-30m"
        )
        state.findings["logs"] = (
            f"Connection pool wait errors detected on checkout-db-primary "
            f"({telemetry['result_count']} related events in the last 30 minutes, "
            f"source: {telemetry['source']}). Active connections at 198/200, "
            f"queue depth increased 14x."
        )
        state.log("agent-log", state.findings["logs"])

        deploy_result = await ai_service._execute_tool("get_deployment_history", {})
        recent_deploy = deploy_result["deployments"][0]
        state.findings["deployment"] = (
            f"{recent_deploy['id']} ({recent_deploy['service']} "
            f"{recent_deploy['version']}) deployed {recent_deploy['deployed_minutes_ago']} "
            f"minutes before incident start by {recent_deploy['author']}. "
            f"Changes: {recent_deploy['changes']}"
        )
        state.log("agent-deployment", state.findings["deployment"])

        if scenario:
            tree_data = md.HYPOTHESIS_TREES[SCENARIOS[scenario]["tree_key"]]
            state.hypothesis_tree = tree_data["root"]
            state.related_incidents = tree_data["related_incidents"]
            state.log(None, "Hypothesis tree constructed from correlated telemetry, "
                             "deployment history, and connection pool metrics.",
                      kind="hypothesis")

            graph_match = await ai_service._execute_tool(
                "search_memory_graph", {"keyword": tree_data["related_incidents"][0]}
            )
            related = md.PAST_INCIDENTS[0]
            state.log(None, f"Memory graph match found: this pattern resembles "
                             f"{related['id']} ({related['title']}, "
                             f"{len(graph_match['nodes'])} related nodes found).",
                      kind="memory")

            state.root_cause_summary = await ai_service.generate_text(
                system_prompt="You are NeuroMind, an enterprise SRE root cause analyst. "
                               "Explain root causes clearly and concisely for engineers.",
                user_prompt=f"Explain the root cause of: {question}",
                mock_response=tree_data["root_cause_summary"],
            )
            state.log("agent-sre", "Root cause identified with high confidence.",
                      kind="root_cause")

            state.business_impact = await ai_service.generate_text(
                system_prompt="You are NeuroMind's Business Impact Agent. Translate "
                               "technical incidents into clear business impact statements.",
                user_prompt=f"What is the business impact of: {question}",
                mock_response=tree_data["business_impact"],
            )
            state.log("agent-business", "Business impact assessed.", kind="finding")

            state.recommended_actions = tree_data["recommended_actions"]
            state.log(None, "Remediation recommendations generated.", kind="recommendation")
        else:
            generic_summary = (
                "Based on current telemetry, no anomalies above baseline were found "
                "for the specific services referenced in this question. Agents will "
                "continue monitoring and will raise an incident automatically if "
                "thresholds are crossed."
            )
            state.root_cause_summary = await ai_service.generate_text(
                system_prompt="You are NeuroMind, an enterprise operations assistant. "
                               "Answer operational questions concisely using the "
                               "telemetry context provided.",
                user_prompt=question,
                mock_response=generic_summary,
            )
            state.log("agent-sre", "No active anomalies correlated with this question.",
                      kind="finding")

    state.log(None, "Investigation complete. Findings stored in enterprise memory graph.",
              kind="summary")

    # --- Persist: investigation + new learning ----------------------------
    result = state.to_dict()
    db.save_investigation(state.id, question, scenario or "general", result)

    if scenario and state.root_cause_summary:
        cfg = SCENARIOS[scenario]
        db.add_learning(
            incident_id=cfg["incident_id"],
            title=f"{cfg['title']} (investigation {state.id})",
            root_cause=state.root_cause_summary,
            resolution=(
                state.recommended_actions[0]["action"]
                if state.recommended_actions else "Investigation in progress."
            ),
            lessons_learned=state.business_impact or "",
            source=f"investigation:{state.mode}",
        )

    return result


async def get_agent_roster() -> list[dict]:
    """Return all agents with their current runtime status, enriched with
    real historical activity counts from SQLite agent_memory."""
    roster = []
    for agent in md.AGENT_DEFS:
        runtime = md.AGENT_RUNTIME.get(agent["id"], {
            "status": "idle", "current_task": "Awaiting trigger",
            "confidence": 0.0, "last_active_minutes_ago": 60,
        })
        run_count = db.count_agent_runs(agent["id"])
        recent = db.get_agent_memory(agent["id"], limit=1)
        entry = {**agent, **runtime, "total_investigations": run_count}
        if recent:
            entry["last_finding"] = recent[0]["finding"]
        roster.append(entry)
    return roster
