from fastapi import APIRouter
from app.data import mock_data as md

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary")
async def get_summary():
    return {
        "kpis": md.KPI_SUMMARY,
        "enterprise_health": md.ENTERPRISE_HEALTH,
        "monitored_services": len(md.SERVICES),
        "environments": 8,
    }


@router.get("/pipeline-throughput")
async def get_pipeline_throughput():
    return {"data": md.pipeline_throughput()}


@router.get("/top-services")
async def get_top_services():
    services = sorted(md.SERVICES, key=lambda s: s["impact_score"], reverse=True)
    return {"services": services}


@router.get("/incident-trend")
async def get_incident_trend():
    return {
        "total": 24,
        "delta_pct_vs_last_week": 14,
        "trend": [18, 22, 19, 24, 21, 26, 24],
        "labels": ["16", "17", "18", "19", "20", "21", "22"],
    }
