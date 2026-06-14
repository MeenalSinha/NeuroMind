from fastapi import APIRouter, HTTPException
from app.data import mock_data as md
from app import db

router = APIRouter(prefix="/api/memory-graph", tags=["memory-graph"])


@router.get("")
async def get_graph():
    """
    Enterprise Memory Graph.

    Built from the static seed dataset plus any new learnings recorded
    since startup (e.g. from a Judge Mode run or live investigation),
    so the graph genuinely grows as the product is used.
    """
    learnings = db.list_learnings()
    return md.build_memory_graph(dynamic_learnings=learnings)


@router.get("/node/{node_id}")
async def get_node(node_id: str):
    detail = md.get_node_detail(node_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Node not found")
    return detail


@router.get("/learnings")
async def get_learnings():
    """
    Organizational Learning Engine.

    Returns learnings from the persistent store (app.db), seeded on
    first run from the bundled past-incident dataset and appended to
    every time `run_investigation` concludes with a scenario match.
    This means new investigations (including Judge Mode) produce a new
    entry here that survives a backend restart.
    """
    learnings = db.list_learnings()
    return {
        "learnings": [
            {
                "incident_id": l["incident_id"],
                "title": l["title"],
                "root_cause": l["root_cause"],
                "resolution": l["resolution"],
                "lessons_learned": l["lessons_learned"],
                "resolved_days_ago": l["resolved_days_ago"],
                "source": l["source"],
            }
            for l in learnings
        ]
    }
