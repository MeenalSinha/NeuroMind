from fastapi import APIRouter, HTTPException, Depends
from app.data import mock_data as md
from app.agents.orchestrator import run_investigation
from app.services.auth import require_auth
from app import db

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


def _with_status(inc: dict) -> dict:
    return {**inc, "status": db.get_incident_status(inc["id"])}


@router.get("/active")
async def active_incidents():
    return {"incidents": [_with_status(i) for i in md.ACTIVE_INCIDENTS]}


@router.get("/past")
async def past_incidents():
    return {"incidents": md.PAST_INCIDENTS}


@router.get("/{incident_id}")
async def get_incident(incident_id: str):
    for inc in md.ACTIVE_INCIDENTS:
        if inc["id"] == incident_id:
            return _with_status(inc)
    for inc in md.PAST_INCIDENTS:
        if inc["id"] == incident_id:
            return inc
    raise HTTPException(status_code=404, detail="Incident not found")


@router.post("/{incident_id}/investigate")
async def investigate_incident(incident_id: str, actor: str = Depends(require_auth)):
    """Launch the agent swarm against a specific incident (Incident Commander).

    Requires authentication. The investigation result is persisted, and
    the incident is moved to "investigating" status, which is reflected
    on subsequent GET requests.
    """
    incident = None
    for inc in md.ACTIVE_INCIDENTS:
        if inc["id"] == incident_id:
            incident = inc
            break
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    db.set_incident_status(incident_id, "investigating")
    db.write_audit(actor, "investigate_incident", target=incident_id)

    question = f"Why is {incident['title'].lower()} happening? {incident['description']}"
    result = await run_investigation(question)
    return {"incident": _with_status(incident), "investigation": result}


@router.post("/{incident_id}/resolve")
async def resolve_incident(incident_id: str, actor: str = Depends(require_auth)):
    """Mark an incident as resolved. Requires authentication; writes an
    audit log entry and persists the new status."""
    incident = None
    for inc in md.ACTIVE_INCIDENTS:
        if inc["id"] == incident_id:
            incident = inc
            break
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    db.set_incident_status(incident_id, "resolved")
    db.write_audit(actor, "resolve_incident", target=incident_id)
    return {"incident": _with_status(incident)}


@router.get("/deployments/recent")
async def recent_deployments():
    return {"deployments": md.DEPLOYMENTS}


@router.get("/_audit/log")
async def get_audit_log(actor: str = Depends(require_auth)):
    """Return the audit log. Requires authentication."""
    return {"entries": db.list_audit()}
