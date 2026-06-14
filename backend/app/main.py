from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.api import dashboard, chat, memory_graph, agents, incidents, security, cost, judge_mode
from app import db

settings = get_settings()

app = FastAPI(
    title="NeuroMind API",
    description="Enterprise Brain + Agent Operating System for Agentic Operations",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    db.init_db()


app.include_router(dashboard.router)
app.include_router(chat.router)
app.include_router(memory_graph.router)
app.include_router(agents.router)
app.include_router(incidents.router)
app.include_router(security.router)
app.include_router(cost.router)
app.include_router(judge_mode.router)


@app.get("/")
async def root():
    return {
        "name": "NeuroMind API",
        "status": "operational",
        "modules": [
            "dashboard", "chat", "memory-graph", "agents",
            "incidents", "security", "cost", "judge-mode",
        ],
        "persistence": "sqlite",
        "auth": "bearer-token (write endpoints)",
    }


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "mock_ai": settings.USE_MOCK_AI,
        "mock_splunk": settings.USE_MOCK_SPLUNK,
        "splunk_configured": bool(settings.SPLUNK_HOST and settings.SPLUNK_TOKEN),
        "anthropic_configured": bool(settings.ANTHROPIC_API_KEY),
    }
