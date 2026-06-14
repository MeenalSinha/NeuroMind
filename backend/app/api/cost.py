from fastapi import APIRouter
from app.data import mock_data as md

router = APIRouter(prefix="/api/cost", tags=["cost"])


@router.get("/breakdown")
async def cost_breakdown():
    items = []
    total_current = 0.0
    total_previous = 0.0
    for row in md.COST_BREAKDOWN:
        delta_pct = round((row["current_cost"] - row["previous_cost"]) / row["previous_cost"] * 100, 1)
        items.append({**row, "delta_pct": delta_pct})
        total_current += row["current_cost"]
        total_previous += row["previous_cost"]

    overall_delta_pct = round((total_current - total_previous) / total_previous * 100, 1)
    return {
        "items": items,
        "total_current": round(total_current, 2),
        "total_previous": round(total_previous, 2),
        "overall_delta_pct": overall_delta_pct,
    }


@router.get("/explain")
async def explain_cost_change():
    """Executive report explaining a cost change (Scenario 3)."""
    return {
        "question": "Why did cloud costs rise 35 percent?",
        "summary": "Cloud costs in the Checkout Service and its database rose "
                    "sharply this week, accounting for nearly all of the overall "
                    "increase.",
        "root_cause": "DEP-5521 added a new synchronous fraud-check query and "
                       "increased database connection timeouts. Under the resulting "
                       "connection pool pressure, checkout-db-primary autoscaled "
                       "to a larger instance class and checkout pods scaled out to "
                       "handle queued requests, driving compute and database costs "
                       "up by roughly 52 percent and 38 percent respectively.",
        "correlated_incident": "INC-201 (Checkout Service Latency)",
        "recommended_actions": [
            "Roll back svc-checkout to v2.13.x to reduce compute scaling",
            "Right-size checkout-db-primary once the connection pool issue "
            "is resolved",
            "Set a budget alert at 15 percent week-over-week growth for "
            "Checkout Service costs",
        ],
    }
