from fastapi import APIRouter, Depends, HTTPException
from app.auth.dependencies import get_current_user
from app.agents.frank_client import get_daily_briefing
from app.models import User, RoleEnum

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/summary")
async def dashboard_summary(current_user: User = Depends(get_current_user)):
    """Returns full briefing for any authenticated user."""
    return get_daily_briefing()

@router.get("/employee")
async def employee_view(current_user: User = Depends(get_current_user)):
    """Employee‑specific data (only their schedule and basic info)."""
    if current_user.role not in [RoleEnum.EMPLOYEE, RoleEnum.MANAGER, RoleEnum.ADMIN]:
        raise HTTPException(403, "Not authorized")
    # In the future, you can filter by employee ID
    data = get_daily_briefing()
    # Simplify for employees
    return {
        "briefing": data["briefing_text"],
        "my_schedule": data["staffing"],   # you may want to filter per employee
        "tasks": ["Check inventory", "Greet customers"]
    }

@router.get("/manager")
async def manager_view(current_user: User = Depends(get_current_user)):
    """Manager view with full operational data."""
    if current_user.role not in [RoleEnum.MANAGER, RoleEnum.ADMIN]:
        raise HTTPException(403, "Not authorized")
    return get_daily_briefing()

@router.get("/admin")
async def admin_view(current_user: User = Depends(get_current_user)):
    """Admin view – identical for now, can add user stats later."""
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(403, "Not authorized")
    return get_daily_briefing()