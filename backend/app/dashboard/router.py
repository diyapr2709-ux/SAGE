import sys, os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

from fastapi import APIRouter, Depends, HTTPException
from app.auth.dependencies import get_current_user
from app.agents.frank_client import get_daily_briefing
from app.models import User, RoleEnum
from sage.agents.crew_stub import get_all_shifts

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/summary")
async def dashboard_summary(current_user: User = Depends(get_current_user)):
    """Returns full briefing for any authenticated user."""
    return get_daily_briefing()

@router.get("/employee")
async def employee_view(current_user: User = Depends(get_current_user)):
    """Employee‑specific view with schedule, feedback, and performance from SHELF."""
    if current_user.role not in [RoleEnum.EMPLOYEE, RoleEnum.MANAGER, RoleEnum.ADMIN]:
        raise HTTPException(403, "Not authorized")
    data = get_daily_briefing()
    emp_feedback = data.get("employee_feedback", {})
    emp_intel = data.get("employee_intelligence", {})
    return {
        "briefing": data["briefing_text"],
        "my_schedule": data["staffing"],
        "employee_of_the_week": data.get("employee_of_the_week", {}),
        "warnings": emp_feedback.get("warnings", []),
        "recognitions": emp_feedback.get("recognitions", []),
        "frank_line": emp_feedback.get("frank_briefing_line", ""),
        "employees": emp_intel.get("employees", []),
        "rush_hours": data.get("rush_hours", []),
        "tasks": ["Check inventory", "Greet customers", "Review today's specials"],
    }

@router.get("/manager")
async def manager_view(current_user: User = Depends(get_current_user)):
    """Manager view with full operational data."""
    if current_user.role not in [RoleEnum.MANAGER, RoleEnum.ADMIN]:
        raise HTTPException(403, "Not authorized")
    return get_daily_briefing()

@router.get("/crew")
async def crew_view(current_user: User = Depends(get_current_user)):
    """All crew shift scenarios from CREW agent."""
    if current_user.role not in [RoleEnum.MANAGER, RoleEnum.ADMIN]:
        raise HTTPException(403, "Not authorized")
    import json
    import numpy as np
    class _Enc(json.JSONEncoder):
        def default(self, o):
            if isinstance(o, (np.bool_,)): return bool(o)
            if isinstance(o, (np.integer,)): return int(o)
            if isinstance(o, (np.floating,)): return float(o)
            return super().default(o)
    raw = get_all_shifts()
    return json.loads(json.dumps(raw, cls=_Enc))

@router.get("/admin")
async def admin_view(current_user: User = Depends(get_current_user)):
    """Admin view – identical for now, can add user stats later."""
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(403, "Not authorized")
    return get_daily_briefing()