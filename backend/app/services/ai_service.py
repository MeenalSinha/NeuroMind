"""
AI Layer.

Wraps calls to Anthropic Claude (or OpenAI GPT as a secondary option),
and exposes a REAL agentic tool-calling loop (`run_agentic_investigation`)
used by the orchestrator.

Two modes:

1. USE_MOCK_AI=true (default) or no API key configured: `generate_text`
   returns the supplied `mock_response` directly, and
   `run_agentic_investigation` falls back to a deterministic
   tool-execution trace (still calling the *real* tool implementations
   in app.services.splunk_service and app.db -- only the "decision
   making" of which tool to call next is scripted rather than
   LLM-driven). This keeps the product fully demoable offline.

2. USE_MOCK_AI=false with ANTHROPIC_API_KEY set: `run_agentic_investigation`
   runs Claude in a genuine tool-use loop. Claude is given a set of
   tools (search telemetry, get deployment history, query the memory
   graph, look up past incidents) and decides, turn by turn, which
   tools to call and when it has enough information to produce a final
   root-cause summary, business impact, and recommended actions. Every
   tool call result is logged as an investigation step exactly like the
   mock path, so the frontend rendering is identical either way.
"""
import json
from app.core.config import get_settings

settings = get_settings()


async def generate_text(system_prompt: str, user_prompt: str, mock_response: str) -> str:
    """Generate a natural-language response, falling back to
    `mock_response` if mock mode is enabled, no key is configured, or
    the live call fails."""
    if settings.USE_MOCK_AI:
        return mock_response

    if settings.ANTHROPIC_API_KEY:
        try:
            import anthropic

            client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            response = await client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )
            text_blocks = [b.text for b in response.content if b.type == "text"]
            return "\n".join(text_blocks) or mock_response
        except Exception:
            return mock_response

    if settings.OPENAI_API_KEY:
        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            response = await client.chat.completions.create(
                model="gpt-5.5",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
            return response.choices[0].message.content or mock_response
        except Exception:
            return mock_response

    return mock_response


# ---------------------------------------------------------------------------
# Agentic tool-use loop
# ---------------------------------------------------------------------------

AGENT_TOOLS = [
    {
        "name": "search_telemetry",
        "description": (
            "Run a Splunk Processing Language (SPL) search against telemetry "
            "(metrics, logs, traces). Use this to find latency spikes, error "
            "rates, cost anomalies, or security events relevant to the question."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "spl_query": {"type": "string", "description": "The SPL query to run"},
                "earliest": {"type": "string", "description": "Splunk time modifier, e.g. -1h, -24h"},
            },
            "required": ["spl_query"],
        },
    },
    {
        "name": "get_service_metrics",
        "description": "Get a time-series for a specific service metric (e.g. latency_p95_ms, query_latency_p95_ms, compute_cost_usd).",
        "input_schema": {
            "type": "object",
            "properties": {
                "service_id": {"type": "string"},
                "metric": {"type": "string"},
                "window": {"type": "string", "description": "e.g. 1h, 24h"},
            },
            "required": ["service_id", "metric"],
        },
    },
    {
        "name": "get_deployment_history",
        "description": "List recent deployments across services, including version, author, and change description.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "search_memory_graph",
        "description": (
            "Search the enterprise memory graph for nodes (services, "
            "incidents, deployments, agents) matching a keyword, and return "
            "their relationships."
        ),
        "input_schema": {
            "type": "object",
            "properties": {"keyword": {"type": "string"}},
            "required": ["keyword"],
        },
    },
    {
        "name": "get_past_incidents",
        "description": "Return past resolved incidents with their root cause, resolution, and lessons learned -- the Organizational Learning Engine.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "submit_findings",
        "description": (
            "Call this once you have enough information to conclude the "
            "investigation. Provide the final root cause summary, business "
            "impact, recommended actions, and any related past incident IDs."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "root_cause_summary": {"type": "string"},
                "business_impact": {"type": "string"},
                "recommended_actions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "action": {"type": "string"},
                            "type": {"type": "string", "enum": ["rollback", "scale", "code_fix"]},
                            "confidence": {"type": "number"},
                            "estimated_impact": {"type": "string"},
                        },
                        "required": ["action", "type", "confidence", "estimated_impact"],
                    },
                },
                "related_incidents": {"type": "array", "items": {"type": "string"}},
                "confidence": {"type": "number", "description": "Overall confidence 0-1"},
            },
            "required": ["root_cause_summary", "business_impact", "recommended_actions"],
        },
    },
]


async def _execute_tool(name: str, tool_input: dict) -> dict:
    """Execute a tool call against real backing services (Splunk service +
    SQLite-backed memory graph + mock data), shared by both the mock and
    live agentic loops so behavior is identical."""
    from app.services import splunk_service
    from app.data import mock_data as md

    if name == "search_telemetry":
        return await splunk_service.search(
            tool_input.get("spl_query", ""), tool_input.get("earliest", "-1h")
        )

    if name == "get_service_metrics":
        return await splunk_service.get_metrics(
            tool_input["service_id"],
            tool_input.get("metric", "latency_p95_ms"),
            tool_input.get("window", "1h"),
        )

    if name == "get_deployment_history":
        return {"deployments": md.DEPLOYMENTS}

    if name == "search_memory_graph":
        graph = md.build_memory_graph()
        keyword = tool_input.get("keyword", "").lower()
        matched_nodes = [n for n in graph["nodes"] if keyword in json.dumps(n).lower()]
        matched_ids = {n["id"] for n in matched_nodes}
        matched_edges = [
            e for e in graph["edges"]
            if e["source"] in matched_ids or e["target"] in matched_ids
        ]
        return {"nodes": matched_nodes, "edges": matched_edges}

    if name == "get_past_incidents":
        from app import db
        return {"learnings": db.list_learnings()}

    return {"error": f"unknown tool {name}"}


async def run_agentic_investigation(question: str, log_callback, mock_trace_fn=None) -> dict | None:
    """
    Run a genuine Claude tool-use loop for an investigation.

    `log_callback(agent_id, message, kind)` is called for every tool
    invocation so the caller (orchestrator) can build the same
    step-by-step trace the UI expects.

    Returns None if mock mode is enabled or no API key is configured --
    in that case the caller should run its deterministic mock path
    instead (passing `mock_trace_fn` is not required; it exists for
    symmetry/documentation).

    Returns a dict with keys: root_cause_summary, business_impact,
    recommended_actions, related_incidents, confidence -- or None on
    failure (caller falls back to mock).
    """
    if settings.USE_MOCK_AI or not settings.ANTHROPIC_API_KEY:
        return None

    try:
        import anthropic
    except ImportError:
        return None

    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    system_prompt = (
        "You are NeuroMind, an autonomous Enterprise Brain for IT operations, "
        "built on Splunk. You investigate operational, security, and cost "
        "questions by calling tools to gather telemetry, deployment history, "
        "and memory-graph context. Think step by step. Call multiple tools as "
        "needed (typically 2-5). When you have enough evidence, call "
        "submit_findings exactly once with your conclusions. Be specific and "
        "cite the numbers returned by your tools."
    )

    messages = [{"role": "user", "content": f"Investigate: {question}"}]

    for turn in range(6):
        response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,
            system=system_prompt,
            tools=AGENT_TOOLS,
            messages=messages,
        )

        messages.append({"role": "assistant", "content": response.content})

        tool_uses = [b for b in response.content if b.type == "tool_use"]
        text_blocks = [b.text for b in response.content if b.type == "text"]

        for t in text_blocks:
            if t.strip():
                log_callback(None, t.strip(), "reasoning")

        if not tool_uses:
            break

        tool_results = []
        for tool_use in tool_uses:
            if tool_use.name == "submit_findings":
                result = tool_use.input
                log_callback(None, "Final findings submitted by agentic reasoning loop.", "summary")
                return {
                    "root_cause_summary": result.get("root_cause_summary", ""),
                    "business_impact": result.get("business_impact", ""),
                    "recommended_actions": result.get("recommended_actions", []),
                    "related_incidents": result.get("related_incidents", []),
                    "confidence": result.get("confidence", 0.8),
                }

            tool_output = await _execute_tool(tool_use.name, tool_use.input)
            log_callback(
                f"agent-{tool_use.name}",
                f"Called {tool_use.name}({json.dumps(tool_use.input)}) -> "
                f"{json.dumps(tool_output)[:300]}",
                "tool_call",
            )
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tool_use.id,
                "content": json.dumps(tool_output)[:4000],
            })

        messages.append({"role": "user", "content": tool_results})

    return None
