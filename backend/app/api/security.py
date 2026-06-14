from fastapi import APIRouter, HTTPException, Depends
from app.data import mock_data as md
from app.services import splunk_service
from app.services.auth import require_auth
from app import db

router = APIRouter(prefix="/api/security", tags=["security"])


def _with_status(ev: dict) -> dict:
    return {**ev, "status": db.get_security_status(ev["id"])}


@router.get("/events")
async def get_events():
    return {"events": [_with_status(e) for e in md.SECURITY_EVENTS]}


@router.get("/blast-radius/{event_id}")
async def get_blast_radius(event_id: str):
    radius = md.BLAST_RADIUS.get(event_id)
    if not radius:
        raise HTTPException(status_code=404, detail="No blast radius data for this event")
    return radius


@router.post("/contain/{event_id}")
async def contain_event(event_id: str, actor: str = Depends(require_auth)):
    """
    Execute the containment playbook for a security event.

    Requires authentication. Each containment step runs through
    splunk_service.run_soar_playbook (real SOAR REST call if
    USE_MOCK_SPLUNK=false and configured, simulated otherwise). The
    event's status is persisted as "contained" in SQLite, so it
    survives a page refresh / backend restart, and the action is
    recorded in the audit log with the acting principal.
    """
    radius = md.BLAST_RADIUS.get(event_id)
    if not radius:
        raise HTTPException(status_code=404, detail="No containment plan available")

    results = []
    for step in radius["containment_plan"]:
        result = await splunk_service.run_soar_playbook(step, {"event_id": event_id})
        results.append(result)

    db.set_security_status(event_id, "contained")
    db.write_audit(actor, "contain_security_event", target=event_id,
                    detail=f"{len(results)} playbook steps executed")

    return {"event_id": event_id, "executed_steps": results, "status": "contained"}
