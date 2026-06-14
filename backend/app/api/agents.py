from fastapi import APIRouter
from app.agents.orchestrator import get_agent_roster
from app.data import mock_data as md

router = APIRouter(prefix="/api/agents", tags=["agents"])


@router.get("")
async def list_agents():
    roster = await get_agent_roster()
    return {"agents": roster, "active_count": sum(1 for a in roster if a["status"] == "running")}


@router.get("/marketplace")
async def marketplace():
    """MCP Agent Marketplace listing."""
    return {
        "agents": [
            {
                **a,
                "deployed": a["id"] in ("agent-sre", "agent-log", "agent-deployment", "agent-security"),
                "category": {
                    "sre": "Reliability",
                    "log_analyst": "Observability",
                    "metrics": "Observability",
                    "deployment": "Reliability",
                    "security": "Security",
                    "compliance": "Governance",
                    "cost": "FinOps",
                    "business_impact": "Business",
                }.get(a["type"], "General"),
            }
            for a in md.AGENT_DEFS
        ],
        "workflows": [
            {
                "id": "wf-investigate-latency",
                "name": "Investigate latency",
                "description": "Automatically launches Log Agent, Metrics Agent, "
                                "and Deployment Agent to investigate a latency issue.",
                "agents": ["agent-log", "agent-metrics", "agent-deployment"],
            },
            {
                "id": "wf-security-triage",
                "name": "Security triage",
                "description": "Launches Security Agent and Compliance Agent to "
                                "triage a suspicious activity alert.",
                "agents": ["agent-security", "agent-compliance"],
            },
            {
                "id": "wf-cost-review",
                "name": "Weekly cost review",
                "description": "Launches Cost Agent and Business Impact Agent to "
                                "review cloud spend trends.",
                "agents": ["agent-cost", "agent-business"],
            },
        ],
    }
