import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.data import mock_data as md
from app import db

router = APIRouter(prefix="/api/judge-mode", tags=["judge-mode"])


@router.get("/script")
async def get_script():
    """Return the full Judge Mode synthetic incident script (non-streamed)."""
    return {"script": md.JUDGE_MODE_SCRIPT, "incident_id": "INC-301"}


@router.websocket("/run")
async def run_judge_mode(websocket: WebSocket):
    """
    Stream the Judge Mode synthetic incident in real time.

    Each step is sent as a JSON message at the timestamp offset
    defined in JUDGE_MODE_SCRIPT. On completion, a new learning entry
    for synthetic incident INC-301 is written to the persistent
    Organizational Learning Engine (SQLite) and the incident state is
    recorded -- so /api/memory-graph/learnings and the Memory Graph
    reflect this run on subsequent requests, including after a page
    refresh or backend restart.
    """
    await websocket.accept()
    try:
        last_t = 0.0
        for step in md.JUDGE_MODE_SCRIPT:
            wait = max(0.0, step["t"] - last_t)
            await asyncio.sleep(wait)
            last_t = step["t"]
            await websocket.send_json(step)

        # Persist a real learning record for this run.
        db.add_learning(
            incident_id="INC-301",
            title="Checkout Latency Spike in ap-southeast-1 (Judge Mode demo)",
            root_cause=(
                "Deployment-induced connection pool exhaustion on "
                "checkout-db-primary, caused by an additional synchronous "
                "fraud-check query introduced in the most recent release."
            ),
            resolution="Rolled back the offending service version; latency "
                       "returned to baseline within minutes.",
            lessons_learned=(
                "Pre-deployment canary checks should include connection pool "
                "saturation thresholds, not just latency, to catch this class "
                "of regression before full rollout."
            ),
            source="judge_mode",
        )
        db.set_incident_status("INC-301", "resolved")
        db.write_audit("judge_mode", "run_judge_mode", target="INC-301",
                        detail="Synthetic incident investigated and learning recorded")

        await websocket.send_json({"type": "done", "message": "Judge mode investigation complete.",
                                     "incident_id": "INC-301"})
    except WebSocketDisconnect:
        pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
