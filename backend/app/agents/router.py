from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List

from app.auth.dependencies import get_current_user
from app.agents.frank_client import get_daily_briefing
from app.models import User

router = APIRouter(prefix="/run", tags=["run"])

# Marathon Deli real employee roster — passed to SHELF for intelligence
MARATHON_EMPLOYEES = [
    {"name": "Aarav Patel",    "role": "Cashier",          "hourly_rate": 14, "hours_per_week": 18,
     "performance_notes": "excellent customer feedback, consistent, fast checkout"},
    {"name": "Michael Rivera", "role": "Shift Supervisor",  "hourly_rate": 22, "hours_per_week": 40,
     "performance_notes": "strong leader, managing weekend rush, slight overtime concern"},
    {"name": "Sophia Kim",     "role": "Cashier",           "hourly_rate": 14, "hours_per_week": 12,
     "performance_notes": "reliable, prefers afternoon shifts, good upsell rate"},
    {"name": "Daniel Brooks",  "role": "Cook",              "hourly_rate": 16, "hours_per_week": 25,
     "performance_notes": "fast prep times, one health-code near-miss last month"},
    {"name": "Emily Chen",     "role": "Front Desk",        "hourly_rate": 13, "hours_per_week": 12,
     "performance_notes": "student worker, limited availability, very friendly"},
]

MARATHON_DATASET = {
    "monthly_revenue": 85000,
    "delivery_fees": {"doordash_pct": 30, "ubereats_pct": 25},
    "employees": MARATHON_EMPLOYEES,
}


class RunFrankRequest(BaseModel):
    business_id: Optional[str] = "Marathon Deli"
    business_type: Optional[str] = "restaurant"
    location: Optional[str] = "College Park MD"
    cluster: Optional[str] = "A"


@router.post("")
async def run_frank_endpoint(
    request: RunFrankRequest,
    current_user: User = Depends(get_current_user),
):
    """Trigger the full FRANK pipeline with Marathon Deli employee dataset."""
    config = {
        "business_id": request.business_id,
        "business_type": request.business_type,
        "location": request.location,
        "cluster": request.cluster,
        "employees": MARATHON_EMPLOYEES,
        "dataset": MARATHON_DATASET,
    }
    return get_daily_briefing(business_config=config)
