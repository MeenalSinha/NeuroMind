"""
In-memory mock data layer.
Simulates Splunk telemetry, services, incidents, deployments, and the
enterprise memory graph. Designed so each function can later be swapped
for a real Splunk / Neo4j / Postgres implementation without changing
the API surface used by the rest of the app.
"""
import random
from datetime import datetime, timedelta, timezone


def now() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.isoformat()


# ---------------------------------------------------------------------------
# Services
# ---------------------------------------------------------------------------
SERVICES = [
    {"id": "svc-checkout", "name": "Checkout Service", "environment": "production",
     "region": "ap-southeast-1", "impact_score": 85, "health": "degraded",
     "owner": "Payments Team"},
    {"id": "svc-payment-gateway", "name": "Payment Gateway", "environment": "production",
     "region": "us-east-1", "impact_score": 72, "health": "healthy",
     "owner": "Payments Team"},
    {"id": "svc-user", "name": "User Service", "environment": "production",
     "region": "us-east-1", "impact_score": 64, "health": "healthy",
     "owner": "Identity Team"},
    {"id": "svc-inventory", "name": "Inventory Service", "environment": "production",
     "region": "eu-west-1", "impact_score": 48, "health": "healthy",
     "owner": "Catalog Team"},
    {"id": "svc-notification", "name": "Notification Service", "environment": "production",
     "region": "us-east-1", "impact_score": 32, "health": "healthy",
     "owner": "Platform Team"},
    {"id": "svc-checkout-db", "name": "Checkout DB (Postgres)", "environment": "production",
     "region": "ap-southeast-1", "impact_score": 78, "health": "degraded",
     "owner": "Data Platform Team"},
    {"id": "svc-api-gateway", "name": "API Gateway", "environment": "production",
     "region": "global", "impact_score": 55, "health": "healthy",
     "owner": "Platform Team"},
]

# ---------------------------------------------------------------------------
# Agents
# ---------------------------------------------------------------------------
AGENT_DEFS = [
    {"id": "agent-sre", "name": "SRE Agent", "type": "sre",
     "description": "Monitors reliability signals and runs remediation playbooks."},
    {"id": "agent-log", "name": "Log Analyst Agent", "type": "log_analyst",
     "description": "Parses and correlates log streams across services."},
    {"id": "agent-metrics", "name": "Metrics Agent", "type": "metrics",
     "description": "Tracks latency, throughput, error rate and saturation."},
    {"id": "agent-deployment", "name": "Deployment Agent", "type": "deployment",
     "description": "Tracks releases and correlates them with incidents."},
    {"id": "agent-security", "name": "Security Agent", "type": "security",
     "description": "Detects threats, maps blast radius, and runs MITRE mapping."},
    {"id": "agent-compliance", "name": "Compliance Agent", "type": "compliance",
     "description": "Checks actions and findings against compliance policy."},
    {"id": "agent-cost", "name": "Cost Agent", "type": "cost",
     "description": "Analyzes cloud spend and finds optimization opportunities."},
    {"id": "agent-business", "name": "Business Impact Agent", "type": "business_impact",
     "description": "Translates technical incidents into business impact and revenue risk."},
]

AGENT_RUNTIME: dict[str, dict] = {
    "agent-sre": {"status": "running", "current_task": "Investigating latency spike",
                   "confidence": 0.81, "last_active_minutes_ago": 2},
    "agent-log": {"status": "running", "current_task": "Analyzing error patterns",
                   "confidence": 0.74, "last_active_minutes_ago": 3},
    "agent-deployment": {"status": "running", "current_task": "Checking recent releases",
                          "confidence": 0.88, "last_active_minutes_ago": 4},
    "agent-security": {"status": "idle", "current_task": "Scanning for anomalies",
                        "confidence": 0.65, "last_active_minutes_ago": 5},
    "agent-metrics": {"status": "idle", "current_task": "Awaiting trigger",
                       "confidence": 0.0, "last_active_minutes_ago": 12},
    "agent-compliance": {"status": "idle", "current_task": "Awaiting trigger",
                          "confidence": 0.0, "last_active_minutes_ago": 30},
    "agent-cost": {"status": "idle", "current_task": "Awaiting trigger",
                    "confidence": 0.0, "last_active_minutes_ago": 18},
    "agent-business": {"status": "idle", "current_task": "Awaiting trigger",
                        "confidence": 0.0, "last_active_minutes_ago": 22},
}

# ---------------------------------------------------------------------------
# Incidents
# ---------------------------------------------------------------------------
ACTIVE_INCIDENTS = [
    {
        "id": "INC-201",
        "title": "Checkout Service Latency",
        "severity": "P1",
        "status": "investigating",
        "started_minutes_ago": 12,
        "affected_services": ["svc-checkout", "svc-checkout-db", "svc-payment-gateway"],
        "description": "p95 latency on /checkout/submit increased from 220ms to 1.9s in ap-southeast-1.",
    },
    {
        "id": "INC-202",
        "title": "Database Connection Errors",
        "severity": "P2",
        "status": "investigating",
        "started_minutes_ago": 45,
        "affected_services": ["svc-checkout-db"],
        "description": "Connection pool exhaustion errors on checkout-db-primary.",
    },
    {
        "id": "INC-203",
        "title": "High Memory Usage",
        "severity": "P2",
        "status": "monitoring",
        "started_minutes_ago": 60,
        "affected_services": ["svc-checkout", "svc-inventory"],
        "description": "Memory usage on checkout pods trending toward limit.",
    },
    {
        "id": "INC-204",
        "title": "API Timeouts",
        "severity": "P3",
        "status": "monitoring",
        "started_minutes_ago": 120,
        "affected_services": ["svc-api-gateway"],
        "description": "Intermittent 504s on /api/v2/orders from external partner.",
    },
]

# ---------------------------------------------------------------------------
# Past incidents (for memory graph + organizational learning)
# ---------------------------------------------------------------------------
PAST_INCIDENTS = [
    {
        "id": "INC-184",
        "title": "Memory leak in Checkout Service",
        "severity": "P1",
        "status": "resolved",
        "resolved_days_ago": 60,
        "affected_services": ["svc-checkout"],
        "root_cause": "A connection object was not released after retries in the payment "
                       "gateway client, causing gradual memory growth until pods were OOM killed.",
        "resolution": "Patched the client to release connections in a finally block and "
                       "added a memory ceiling alert at 75 percent.",
        "lessons_learned": "Add automated leak detection tests for any HTTP client wrapper "
                            "that implements custom retry logic.",
    },
    {
        "id": "INC-176",
        "title": "DB connection pool exhaustion",
        "severity": "P2",
        "status": "resolved",
        "resolved_days_ago": 35,
        "affected_services": ["svc-checkout-db"],
        "root_cause": "A schema migration removed an index, causing query times to "
                       "increase and connections to be held longer than expected.",
        "resolution": "Rolled back the migration and re-added the index during a "
                       "maintenance window.",
        "lessons_learned": "Require query plan review for migrations touching "
                            "high-traffic tables.",
    },
    {
        "id": "INC-159",
        "title": "Slow API due to external dependency",
        "severity": "P3",
        "status": "resolved",
        "resolved_days_ago": 90,
        "affected_services": ["svc-api-gateway", "svc-payment-gateway"],
        "root_cause": "A third-party fraud-scoring API increased its average response "
                       "time from 80ms to 900ms during a partner-side incident.",
        "resolution": "Added a circuit breaker and a 200ms timeout with a fallback "
                       "scoring path.",
        "lessons_learned": "All external dependencies must have circuit breakers and "
                            "documented fallback behavior.",
    },
]

# ---------------------------------------------------------------------------
# Deployments
# ---------------------------------------------------------------------------
DEPLOYMENTS = [
    {
        "id": "DEP-5521",
        "service": "svc-checkout",
        "version": "v2.14.0",
        "deployed_minutes_ago": 38,
        "author": "deploy-bot (release/2.14)",
        "changes": "Refactored payment retry logic; increased default DB connection "
                    "timeout from 2s to 5s; added new fraud-check call on submit path.",
        "risk_score": 0.82,
    },
    {
        "id": "DEP-5510",
        "service": "svc-payment-gateway",
        "version": "v1.9.3",
        "deployed_minutes_ago": 600,
        "author": "deploy-bot (release/1.9)",
        "changes": "Minor logging improvements.",
        "risk_score": 0.12,
    },
    {
        "id": "DEP-5498",
        "service": "svc-inventory",
        "version": "v3.2.1",
        "deployed_minutes_ago": 1440,
        "author": "deploy-bot (release/3.2)",
        "changes": "Added caching layer for SKU lookups.",
        "risk_score": 0.21,
    },
]

# ---------------------------------------------------------------------------
# Security events
# ---------------------------------------------------------------------------
SECURITY_EVENTS = [
    {
        "id": "SEC-901",
        "title": "Suspicious login from new geography",
        "severity": "high",
        "user": "j.martins@company.com",
        "detected_minutes_ago": 8,
        "source_ip": "203.0.113.42",
        "location": "Lagos, Nigeria",
        "mitre_techniques": ["T1078 Valid Accounts", "T1110 Brute Force"],
        "status": "investigating",
    },
    {
        "id": "SEC-887",
        "title": "Unusual API token usage pattern",
        "severity": "medium",
        "user": "service-account-billing",
        "detected_minutes_ago": 95,
        "source_ip": "198.51.100.17",
        "location": "Frankfurt, Germany",
        "mitre_techniques": ["T1556 Modify Authentication Process"],
        "status": "contained",
    },
]

BLAST_RADIUS = {
    "SEC-901": {
        "compromised_account": "j.martins@company.com",
        "impacted_assets": [
            {"id": "svc-user", "name": "User Service", "exposure": "high"},
            {"id": "svc-checkout", "name": "Checkout Service", "exposure": "medium"},
            {"id": "asset-admin-portal", "name": "Internal Admin Portal", "exposure": "high"},
            {"id": "asset-billing-db", "name": "Billing Database", "exposure": "low"},
        ],
        "containment_plan": [
            "Force password reset and revoke active sessions for j.martins@company.com",
            "Rotate API tokens issued in the last 24 hours from the affected session",
            "Restrict admin portal access to known corporate IP ranges",
            "Enable step-up MFA for all admin-portal logins for the next 72 hours",
            "Notify Identity Team and open compliance review ticket",
        ],
    }
}

# ---------------------------------------------------------------------------
# Cost data
# ---------------------------------------------------------------------------
COST_BREAKDOWN = [
    {"service": "svc-checkout", "current_cost": 18420.0, "previous_cost": 12150.0},
    {"service": "svc-checkout-db", "current_cost": 9800.0, "previous_cost": 7100.0},
    {"service": "svc-payment-gateway", "current_cost": 6200.0, "previous_cost": 5950.0},
    {"service": "svc-inventory", "current_cost": 4100.0, "previous_cost": 3980.0},
    {"service": "svc-api-gateway", "current_cost": 3000.0, "previous_cost": 2890.0},
]

# ---------------------------------------------------------------------------
# Health scores
# ---------------------------------------------------------------------------
ENTERPRISE_HEALTH = {
    "overall": 92,
    "trend_vs_last_week": 8,
    "components": [
        {"name": "Reliability", "score": 94},
        {"name": "Security", "score": 91},
        {"name": "Performance", "score": 90},
        {"name": "Cost Efficiency", "score": 89},
        {"name": "Compliance", "score": 93},
    ],
}

KPI_SUMMARY = {
    "incidents": {"value": 24, "delta": 2, "direction": "up", "trend": [3, 5, 4, 6, 5, 7, 6]},
    "mttr_minutes": {"value": 34, "delta": -18, "direction": "down", "trend": [55, 50, 48, 44, 40, 37, 34]},
    "alerts": {"value": 1200, "delta": 12, "direction": "up", "trend": [900, 950, 1000, 1050, 1100, 1150, 1200]},
    "ai_resolutions_pct": {"value": 78, "delta": 16, "direction": "up", "trend": [55, 60, 64, 68, 71, 75, 78]},
    "active_agents": {"value": 18, "status": "running"},
}


def pipeline_throughput(days: int = 11) -> list[dict]:
    base = now() - timedelta(days=days - 1)
    data = []
    for i in range(days):
        d = base + timedelta(days=i)
        spike = i == days - 5
        value = random.uniform(40000, 70000)
        if spike:
            value = 132000
        data.append({
            "date": d.strftime("%d %b"),
            "value": round(value, 2),
            "highlight": spike,
        })
    return data


# ---------------------------------------------------------------------------
# Memory graph (Enterprise Memory Graph) - mock representation
# ---------------------------------------------------------------------------
def build_memory_graph(dynamic_learnings: list[dict] | None = None) -> dict:
    nodes = []
    edges = []

    for s in SERVICES:
        nodes.append({
            "id": s["id"], "label": s["name"], "type": "service",
            "health": s["health"], "impact_score": s["impact_score"],
        })

    for inc in ACTIVE_INCIDENTS:
        nodes.append({
            "id": inc["id"], "label": inc["title"], "type": "incident",
            "severity": inc["severity"], "status": inc["status"],
        })
        for svc in inc["affected_services"]:
            edges.append({"source": inc["id"], "target": svc, "type": "affects"})

    for inc in PAST_INCIDENTS:
        nodes.append({
            "id": inc["id"], "label": inc["title"], "type": "past_incident",
            "severity": inc["severity"], "status": inc["status"],
        })
        for svc in inc["affected_services"]:
            edges.append({"source": inc["id"], "target": svc, "type": "affected"})

    for dep in DEPLOYMENTS:
        nodes.append({
            "id": dep["id"], "label": f"{dep['service']} {dep['version']}", "type": "deployment",
            "risk_score": dep["risk_score"],
        })
        edges.append({"source": dep["id"], "target": dep["service"], "type": "deployed_to"})

    for agent in AGENT_DEFS:
        nodes.append({
            "id": agent["id"], "label": agent["name"], "type": "agent",
            "status": AGENT_RUNTIME.get(agent["id"], {}).get("status", "idle"),
        })

    edges.append({"source": "agent-sre", "target": "INC-201", "type": "investigated_by"})
    edges.append({"source": "agent-log", "target": "INC-201", "type": "investigated_by"})
    edges.append({"source": "agent-deployment", "target": "INC-201", "type": "investigated_by"})
    edges.append({"source": "DEP-5521", "target": "INC-201", "type": "caused_by"})
    edges.append({"source": "INC-201", "target": "INC-184", "type": "related_to"})
    edges.append({"source": "INC-202", "target": "INC-176", "type": "related_to"})
    edges.append({"source": "svc-checkout", "target": "svc-checkout-db", "type": "depends_on"})
    edges.append({"source": "svc-checkout", "target": "svc-payment-gateway", "type": "depends_on"})
    edges.append({"source": "svc-checkout", "target": "svc-api-gateway", "type": "depends_on"})

    # Incorporate learnings recorded since startup (e.g. from Judge Mode
    # runs or live investigations) as new "past_incident" nodes, so the
    # memory graph genuinely grows as the product is used.
    existing_ids = {n["id"] for n in nodes}
    for learning in (dynamic_learnings or []):
        node_id = learning["incident_id"]
        if node_id in existing_ids or learning.get("source") == "seed":
            continue
        nodes.append({
            "id": node_id,
            "label": learning["title"],
            "type": "past_incident",
            "severity": "P1",
            "status": "resolved",
        })
        edges.append({"source": node_id, "target": "agent-sre", "type": "investigated_by"})
        if node_id == "INC-301":
            edges.append({"source": node_id, "target": "svc-checkout", "type": "affected"})
        existing_ids.add(node_id)

    return {"nodes": nodes, "edges": edges}


def get_node_detail(node_id: str) -> dict | None:
    for s in SERVICES:
        if s["id"] == node_id:
            return {"type": "service", "data": s}
    for inc in ACTIVE_INCIDENTS:
        if inc["id"] == node_id:
            return {"type": "incident", "data": inc}
    for inc in PAST_INCIDENTS:
        if inc["id"] == node_id:
            return {"type": "past_incident", "data": inc}
    for dep in DEPLOYMENTS:
        if dep["id"] == node_id:
            return {"type": "deployment", "data": dep}
    for a in AGENT_DEFS:
        if a["id"] == node_id:
            return {"type": "agent", "data": {**a, **AGENT_RUNTIME.get(a["id"], {})}}

    # Dynamic nodes created from persisted learnings (e.g. INC-301 from
    # a Judge Mode run, or learnings from live investigations).
    from app import db
    for learning in db.list_learnings():
        if learning["incident_id"] == node_id and learning.get("source") != "seed":
            return {
                "type": "past_incident",
                "data": {
                    "id": learning["incident_id"],
                    "title": learning["title"],
                    "severity": "P1",
                    "status": "resolved",
                    "root_cause": learning["root_cause"],
                    "resolution": learning["resolution"],
                    "lessons_learned": learning["lessons_learned"],
                    "resolved_days_ago": learning["resolved_days_ago"],
                    "source": learning["source"],
                },
            }
    return None


# ---------------------------------------------------------------------------
# Causal reasoning - hypothesis trees
# ---------------------------------------------------------------------------
HYPOTHESIS_TREES = {
    "checkout_latency": {
        "question": "Why is checkout latency increasing in Singapore?",
        "root": {
            "id": "h0",
            "label": "Checkout latency increased in ap-southeast-1",
            "confidence": 1.0,
            "evidence": "p95 latency rose from 220ms to 1.9s over the last 12 minutes "
                        "(Splunk Observability: service.checkout.latency.p95).",
            "children": [
                {
                    "id": "h1",
                    "label": "Database query latency increased",
                    "confidence": 0.91,
                    "evidence": "checkout-db query duration p95 rose from 18ms to 410ms "
                                "starting at 09:42 UTC.",
                    "children": [
                        {
                            "id": "h2",
                            "label": "Connection pool exhaustion on checkout-db-primary",
                            "confidence": 0.88,
                            "evidence": "Active connections at 198/200, queue depth "
                                        "increased 14x; pool_wait_time_ms spiking.",
                            "children": [
                                {
                                    "id": "h3",
                                    "label": "Recent deployment increased connection "
                                             "timeout and added an extra DB call per "
                                             "request",
                                    "confidence": 0.84,
                                    "evidence": "DEP-5521 (svc-checkout v2.14.0, deployed "
                                                "38 minutes ago) increased default DB "
                                                "connection timeout from 2s to 5s and "
                                                "added a fraud-check query on the submit "
                                                "path.",
                                    "children": [
                                        {
                                            "id": "h4",
                                            "label": "Root cause identified: DEP-5521 "
                                                     "introduced an additional "
                                                     "synchronous DB call and longer "
                                                     "timeouts, exhausting the "
                                                     "connection pool under normal load",
                                            "confidence": 0.93,
                                            "evidence": "Correlation between deployment "
                                                        "time, connection pool growth, "
                                                        "and latency onset is within "
                                                        "90 seconds.",
                                            "children": [],
                                            "is_root_cause": True,
                                        }
                                    ],
                                }
                            ],
                        }
                    ],
                },
                {
                    "id": "h5",
                    "label": "Increased traffic volume in ap-southeast-1",
                    "confidence": 0.22,
                    "evidence": "Request volume is only 6 percent above the 7-day "
                                "baseline, within normal variance.",
                    "children": [],
                    "ruled_out": True,
                },
                {
                    "id": "h6",
                    "label": "Upstream payment gateway slowdown",
                    "confidence": 0.15,
                    "evidence": "Payment gateway p95 latency unchanged at 95ms.",
                    "children": [],
                    "ruled_out": True,
                },
            ],
        },
        "root_cause_summary": "A 38-minute-old deployment to the Checkout Service "
            "(v2.14.0) increased the default database connection timeout from 2 "
            "seconds to 5 seconds and added a new synchronous fraud-check query on "
            "the checkout submit path. Under normal traffic this extra query plus "
            "longer timeouts caused database connections to be held substantially "
            "longer, exhausting the connection pool on checkout-db-primary "
            "(currently 198 of 200 connections in use). The exhausted pool is the "
            "direct cause of the checkout latency spike in ap-southeast-1.",
        "business_impact": "Checkout Service handles approximately 1,150 transactions "
            "per minute in ap-southeast-1 during this time window. At the current "
            "p95 latency of 1.9 seconds, an estimated 9-12 percent of users are "
            "abandoning checkout before completion, representing roughly 4,200 "
            "USD per hour in at-risk revenue if the issue persists.",
        "recommended_actions": [
            {
                "action": "Roll back svc-checkout to v2.13.x",
                "type": "rollback",
                "confidence": 0.91,
                "estimated_impact": "Restores p95 latency to approximately 220ms "
                                     "within 3-5 minutes of rollout completion.",
            },
            {
                "action": "Increase checkout-db-primary max connection pool size from "
                          "200 to 320 as a temporary mitigation",
                "type": "scale",
                "confidence": 0.74,
                "estimated_impact": "Reduces queueing but does not address the "
                                     "underlying extra query; latency would remain "
                                     "elevated, around 600-800ms p95.",
            },
            {
                "action": "Make the new fraud-check query asynchronous and move it "
                          "off the critical checkout path",
                "type": "code_fix",
                "confidence": 0.88,
                "estimated_impact": "Permanent fix; removes the additional "
                                     "synchronous DB call without rolling back "
                                     "other improvements in v2.14.0.",
            },
        ],
        "related_incidents": ["INC-184"],
    },
    "cost_increase": {
        "question": "Why did cloud costs rise 35 percent?",
        "root": {
            "id": "c0",
            "label": "Total weekly cloud spend rose from approximately $32,070 to "
                     "$41,520 (+29.5%, near the reported 35% including projected "
                     "month-end true-up)",
            "confidence": 1.0,
            "evidence": "Cost & FinOps breakdown: total_current $41,520 vs "
                        "total_previous $32,070 across 5 monitored services "
                        "(Splunk Observability cost metrics).",
            "children": [
                {
                    "id": "c1",
                    "label": "svc-checkout compute cost increased the most "
                             "(+51.6%, $12,150 to $18,420)",
                    "confidence": 0.95,
                    "evidence": "svc-checkout cost delta is the single largest "
                                "contributor to the overall increase, accounting "
                                "for over 55% of the total dollar increase.",
                    "children": [
                        {
                            "id": "c2",
                            "label": "svc-checkout-db cost also rose sharply "
                                     "(+38.0%, $7,100 to $9,800), correlated with "
                                     "svc-checkout",
                            "confidence": 0.9,
                            "evidence": "Database compute cost tracks checkout "
                                        "service cost closely, consistent with "
                                        "increased query volume on the same "
                                        "request path.",
                            "children": [
                                {
                                    "id": "c3",
                                    "label": "Both cost spikes began the same "
                                             "day as deployment DEP-5521 "
                                             "(svc-checkout v2.14.0)",
                                    "confidence": 0.87,
                                    "evidence": "DEP-5521 introduced an extra "
                                                 "synchronous fraud-check DB query "
                                                 "on the checkout path, increasing "
                                                 "both compute time on svc-checkout "
                                                 "and query load on "
                                                 "svc-checkout-db.",
                                    "children": [
                                        {
                                            "id": "c4",
                                            "label": "Root cause: DEP-5521's "
                                                     "additional DB call is "
                                                     "driving up compute cost on "
                                                     "both services, the same "
                                                     "deployment already "
                                                     "identified as the cause of "
                                                     "the checkout latency "
                                                     "incident (INC-201)",
                                            "confidence": 0.85,
                                            "evidence": "Cross-referencing the "
                                                         "memory graph: DEP-5521 "
                                                         "is connected to both "
                                                         "INC-201 (latency) and "
                                                         "this cost anomaly via "
                                                         "'caused_by' edges.",
                                            "children": [],
                                            "root_cause": True,
                                        }
                                    ],
                                }
                            ],
                        }
                    ],
                }
            ],
        },
        "root_cause_summary": (
            "The 35% rise in cloud costs is driven primarily by deployment "
            "DEP-5521 (svc-checkout v2.14.0), which added a synchronous "
            "fraud-check database query to the checkout path. This single "
            "change increased compute cost on svc-checkout by 51.6% "
            "($12,150 to $18,420) and on svc-checkout-db by 38.0% ($7,100 to "
            "$9,800), together accounting for the majority of the $9,450 "
            "total weekly increase. This is the same deployment already "
            "identified as the root cause of the checkout latency incident "
            "(INC-201), confirmed via the enterprise memory graph."
        ),
        "business_impact": (
            "At the current rate, the additional cost from DEP-5521 alone is "
            "approximately $9,450 per week, or roughly $40,950 per month if "
            "left unaddressed. Combined with the ongoing checkout latency "
            "incident (INC-201, estimated $4,200/hr in at-risk revenue during "
            "active degradation), this single deployment represents both a "
            "reliability and a cost-efficiency risk that compounds over time."
        ),
        "recommended_actions": [
            {
                "action": "Roll back svc-checkout to v2.13.x (same remediation "
                          "as INC-201)",
                "type": "rollback",
                "confidence": 0.91,
                "estimated_impact": "Expected to reduce svc-checkout and "
                                     "svc-checkout-db combined cost by "
                                     "approximately $9,450/week, restoring "
                                     "spend to baseline within one billing "
                                     "cycle.",
            },
            {
                "action": "Right-size svc-checkout-db connection pool and "
                          "compute tier once the fraud-check query is made "
                          "asynchronous",
                "type": "scale",
                "confidence": 0.78,
                "estimated_impact": "Additional 8-12% cost reduction on "
                                     "svc-checkout-db beyond the rollback "
                                     "savings, once the permanent code fix "
                                     "ships.",
            },
            {
                "action": "Add a cost-anomaly correlation rule linking "
                          "deployment events to cost deltas above 15% "
                          "week-over-week",
                "type": "code_fix",
                "confidence": 0.7,
                "estimated_impact": "Future deployments with this profile "
                                     "would be flagged to the Cost Agent "
                                     "within hours instead of being discovered "
                                     "at end of week.",
            },
        ],
        "related_incidents": ["INC-201"],
    },
}


# ---------------------------------------------------------------------------
# Judge Mode synthetic incident script
# ---------------------------------------------------------------------------
JUDGE_MODE_SCRIPT = [
    {"t": 0.0, "type": "alert", "message": "Critical alert received: checkout.latency.p95 "
                                            "exceeded 1500ms threshold in ap-southeast-1."},
    {"t": 1.0, "type": "system", "message": "Incident room INC-301 created automatically."},
    {"t": 2.0, "type": "agent", "agent": "agent-sre", "message": "SRE Agent activated. "
                                                                  "Pulling service topology for svc-checkout."},
    {"t": 3.5, "type": "agent", "agent": "agent-metrics", "message": "Metrics Agent activated. "
                                                                      "Querying p50/p95/p99 latency, "
                                                                      "error rate, and saturation."},
    {"t": 5.0, "type": "agent", "agent": "agent-log", "message": "Log Analyst Agent activated. "
                                                                  "Scanning checkout and checkout-db logs "
                                                                  "for the last 30 minutes."},
    {"t": 6.5, "type": "agent", "agent": "agent-deployment", "message": "Deployment Agent activated. "
                                                                          "Cross-referencing deploy timeline "
                                                                          "against incident start time."},
    {"t": 8.0, "type": "finding", "agent": "agent-metrics", "message": "Database query latency p95 rose "
                                                                        "from 18ms to 410ms at 09:42 UTC."},
    {"t": 9.5, "type": "finding", "agent": "agent-log", "message": "Connection pool wait errors detected "
                                                                    "on checkout-db-primary, 198/200 "
                                                                    "connections in use."},
    {"t": 11.0, "type": "finding", "agent": "agent-deployment", "message": "DEP-5521 (svc-checkout v2.14.0) "
                                                                            "deployed 38 minutes before "
                                                                            "incident start. Diff includes "
                                                                            "DB timeout change and new "
                                                                            "fraud-check query."},
    {"t": 13.0, "type": "hypothesis", "message": "Hypothesis tree constructed. Leading hypothesis: "
                                                  "DEP-5521 introduced an extra synchronous DB call, "
                                                  "exhausting the connection pool."},
    {"t": 15.0, "type": "memory", "message": "Memory graph match found: this pattern resembles "
                                              "INC-184 (Memory leak in Checkout Service, resolved "
                                              "60 days ago)."},
    {"t": 17.0, "type": "root_cause", "message": "Root cause identified with 93 percent confidence: "
                                                  "DEP-5521 connection pool exhaustion."},
    {"t": 19.0, "type": "agent", "agent": "agent-business", "message": "Business Impact Agent activated. "
                                                                        "Estimating revenue risk."},
    {"t": 21.0, "type": "finding", "agent": "agent-business", "message": "Estimated revenue at risk: "
                                                                          "approximately 4,200 USD per "
                                                                          "hour at current abandonment "
                                                                          "rate."},
    {"t": 23.0, "type": "recommendation", "message": "Recommended action: roll back svc-checkout to "
                                                       "v2.13.x. Estimated resolution time: 3-5 minutes."},
    {"t": 25.0, "type": "summary", "message": "Executive summary generated and stored in memory graph "
                                               "as INC-301."},
]
