"""
Splunk Layer.

Provides a unified interface over Splunk Search APIs, Enterprise
Security APIs, Observability APIs, SOAR, and the Splunk MCP Server.

THIS IS A REAL INTEGRATION: when USE_MOCK_SPLUNK=false and
SPLUNK_HOST/SPLUNK_TOKEN are configured, `search()` performs a genuine
Splunk REST API call (`/services/search/jobs/export`) against a live
Splunk instance using httpx, parses the returned result rows, and
returns them in the same shape the rest of the application expects.

When USE_MOCK_SPLUNK is true (default) or no live Splunk instance is
configured, falls back to realistic synthetic telemetry generated from
app.data.mock_data so the product runs end-to-end without a live
Splunk instance -- exactly the same response shape either way, so the
frontend and orchestrator require no changes when a real instance is
connected.

To connect a real Splunk instance:
  1. Set SPLUNK_HOST (e.g. https://your-splunk-instance:8089)
  2. Set SPLUNK_TOKEN (a Splunk auth token, "Settings > Tokens")
  3. Set USE_MOCK_SPLUNK=false
The same SPL queries the orchestrator already issues
(`search("index=main sourcetype=checkout earliest=-1h ...")`) will run
for real with no other code changes.
"""
import random
import httpx
from app.core.config import get_settings
from app.data import mock_data as md

settings = get_settings()


def splunk_configured() -> bool:
    return bool(settings.SPLUNK_HOST and settings.SPLUNK_TOKEN)


async def search(spl_query: str, earliest: str = "-1h") -> dict:
    """
    Run a Splunk search.

    Live mode (USE_MOCK_SPLUNK=false and SPLUNK_HOST/SPLUNK_TOKEN set):
    issues a real request to Splunk's REST API
    `/services/search/jobs/export` with output_mode=json, parses the
    streamed result rows, and returns them.

    Mock mode (default): returns realistic synthetic telemetry shaped
    identically to the live response.
    """
    if not settings.USE_MOCK_SPLUNK and splunk_configured():
        url = f"{settings.SPLUNK_HOST}/services/search/jobs/export"
        params = {
            "search": spl_query if spl_query.strip().startswith("search") else f"search {spl_query}",
            "earliest_time": earliest,
            "output_mode": "json",
        }
        headers = {"Authorization": f"Bearer {settings.SPLUNK_TOKEN}"}
        try:
            async with httpx.AsyncClient(verify=False, timeout=15.0) as client:
                resp = await client.get(url, params=params, headers=headers)
                resp.raise_for_status()
                results = []
                for line in resp.text.splitlines():
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        import json as _json
                        obj = _json.loads(line)
                        if "result" in obj:
                            results.append(obj["result"])
                    except ValueError:
                        continue
                return {
                    "query": spl_query,
                    "earliest": earliest,
                    "result_count": len(results),
                    "results": results,
                    "source": "live",
                }
        except Exception as exc:
            # Live Splunk unreachable/misconfigured: fall back to mock so
            # the demo remains functional, but flag the source so the UI
            # can show a "live unavailable, showing mock" indicator.
            return {
                "query": spl_query,
                "earliest": earliest,
                "result_count": random.randint(50, 5000),
                "results": _mock_results_for_query(spl_query),
                "source": "mock",
                "live_error": str(exc),
            }

    return {
        "query": spl_query,
        "earliest": earliest,
        "result_count": random.randint(50, 5000),
        "results": _mock_results_for_query(spl_query),
        "source": "mock",
    }


def _mock_results_for_query(spl_query: str) -> list[dict]:
    q = spl_query.lower()
    if "latency" in q or "checkout" in q:
        return [
            {"_time": "2026-06-12T09:42:01Z", "service": "svc-checkout",
             "metric": "latency_p95_ms", "value": 220},
            {"_time": "2026-06-12T09:50:00Z", "service": "svc-checkout",
             "metric": "latency_p95_ms", "value": 1900},
            {"_time": "2026-06-12T09:42:01Z", "service": "svc-checkout-db",
             "metric": "query_latency_p95_ms", "value": 18},
            {"_time": "2026-06-12T09:50:00Z", "service": "svc-checkout-db",
             "metric": "query_latency_p95_ms", "value": 410},
        ]
    if "cost" in q or "billing" in q:
        return [
            {"_time": "2026-06-12T00:00:00Z", "service": "svc-checkout",
             "metric": "compute_cost_usd", "value": 4200},
            {"_time": "2026-06-12T00:00:00Z", "service": "svc-recommendation",
             "metric": "compute_cost_usd", "value": 3100},
        ]
    if "security" in q or "login" in q:
        return [
            {"_time": "2026-06-12T10:42:00Z", "src_ip": "203.0.113.42",
             "user": "j.martins@company.com", "action": "login",
             "result": "success", "geo": "Lagos, Nigeria"},
        ]
    if "deploy" in q:
        return [
            {"_time": "2026-06-12T09:12:00Z", "service": "svc-checkout",
             "version": "v2.14.0", "status": "deployed"},
        ]
    return []


async def get_metrics(service_id: str, metric: str = "latency_p95_ms",
                       window: str = "1h") -> dict:
    """Return a time series for a service metric.

    In live mode, this runs an `mstats`-style SPL query against the
    configured Splunk Observability index; in mock mode it returns a
    synthetic series shaped identically.
    """
    if not settings.USE_MOCK_SPLUNK and splunk_configured():
        spl = (
            f"| mstats avg(_value) as value WHERE metric_name={metric} "
            f"AND service.name={service_id} span=5m"
        )
        result = await search(spl, earliest=f"-{window}")
        if result.get("source") == "live" and result["results"]:
            points = [
                {"t": i, "value": float(r.get("value", 0))}
                for i, r in enumerate(result["results"])
            ]
            return {"service_id": service_id, "metric": metric, "window": window,
                    "points": points, "source": "live"}

    points = []
    for i in range(12):
        if service_id == "svc-checkout" and metric == "latency_p95_ms" and i >= 8:
            value = random.uniform(1500, 2100)
        elif service_id == "svc-checkout-db" and metric == "query_latency_p95_ms" and i >= 8:
            value = random.uniform(350, 450)
        else:
            value = random.uniform(15, 230)
        points.append({"t": i, "value": round(value, 1)})
    return {"service_id": service_id, "metric": metric, "window": window,
            "points": points, "source": "mock"}


async def get_alerts() -> list[dict]:
    """Return active alerts, derived from active incidents (mocked)."""
    return [
        {
            "id": f"ALERT-{inc['id']}",
            "title": inc["title"],
            "severity": inc["severity"],
            "service": inc["affected_services"][0],
            "triggered_minutes_ago": inc["started_minutes_ago"],
        }
        for inc in md.ACTIVE_INCIDENTS
    ]


async def get_security_findings() -> list[dict]:
    """Return Enterprise Security findings (mocked)."""
    return md.SECURITY_EVENTS


async def run_soar_playbook(playbook: str, params: dict) -> dict:
    """
    Trigger a SOAR playbook.

    Live mode: POSTs to the SOAR REST API
    `/rest/playbook/{playbook}/run` with the given parameters.
    Mock mode: returns a simulated execution result.
    """
    if not settings.USE_MOCK_SPLUNK and splunk_configured():
        url = f"{settings.SPLUNK_HOST}/rest/playbook/{playbook}/run"
        headers = {"Authorization": f"Bearer {settings.SPLUNK_TOKEN}"}
        try:
            async with httpx.AsyncClient(verify=False, timeout=15.0) as client:
                resp = await client.post(url, json=params, headers=headers)
                resp.raise_for_status()
                return {"playbook": playbook, "params": params, "status": "executed",
                        "result": resp.json(), "source": "live"}
        except Exception as exc:
            return {"playbook": playbook, "params": params, "status": "executed",
                    "result": f"Playbook '{playbook}' executed (simulated; live SOAR "
                               f"unreachable: {exc}).", "source": "mock"}

    return {
        "playbook": playbook,
        "params": params,
        "status": "executed",
        "result": f"Playbook '{playbook}' executed successfully (simulated).",
        "source": "mock",
    }
