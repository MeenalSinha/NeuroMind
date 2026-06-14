from fastapi import APIRouter
from app.models.schemas import ChatRequest
from app.agents.orchestrator import run_investigation

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/ask")
async def ask(req: ChatRequest):
    """
    Central NeuroMind Chat endpoint. Runs a full multi-agent
    investigation for the given question and returns the result,
    including the conversational answer, root cause, timeline,
    related incidents, and suggested actions.
    """
    result = await run_investigation(req.message)
    return result
