import sys, os, json
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.auth.dependencies import get_current_user
from app.agents.dataset_pipe import (
    get_input_dataset, dataset_is_loaded,
    get_llm_dataset, llm_dataset_is_loaded,
)
from app.agents.frank_client import (
    get_employee_briefing, get_fallback_briefing,
    run_with_dataset, run_with_llm_dataset, load_frank_output,
)
from app.models import User, RoleEnum

_LEADERSHIP = {RoleEnum.CEO, RoleEnum.MANAGER, RoleEnum.ADMIN}
from sage.agents.crew_stub import get_all_shifts, _week_date

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

_ROOT                = Path(__file__).resolve().parent.parent.parent.parent
_SHIFTS_DIR          = _ROOT / "sage/data/shifts"
_SHIFT_REQUESTS_PATH = _SHIFTS_DIR / "shift_requests.json"
_SHIFT_LOG_PATH      = _SHIFTS_DIR / "shift_log.json"
_ATTENDANCE_PATH     = _SHIFTS_DIR / "attendance.json"


def _load_attendance():
    if _ATTENDANCE_PATH.exists():
        try:
            return json.loads(_ATTENDANCE_PATH.read_text())
        except Exception:
            return []
    return []

def _save_attendance(records):
    _SHIFTS_DIR.mkdir(parents=True, exist_ok=True)
    _ATTENDANCE_PATH.write_text(json.dumps(records, indent=2))

def _load_shift_requests():
    if _SHIFT_REQUESTS_PATH.exists():
        try:
            return json.loads(_SHIFT_REQUESTS_PATH.read_text())
        except Exception:
            return []
    return []

def _save_shift_requests(requests):
    _SHIFT_REQUESTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    _SHIFT_REQUESTS_PATH.write_text(json.dumps(requests, indent=2))

class ShiftRequest(BaseModel):
    shift_id: str
    request_type: str  # "swap", "unavailable", "available", "note"
    note: Optional[str] = None

class ShiftRequestAction(BaseModel):
    shift_id: str
    email: str
    status: str        # "approved" | "rejected"
    manager_note: Optional[str] = None

class ShiftLog(BaseModel):
    shift_id: str
    opening_cash: Optional[float] = None
    closing_cash: Optional[float] = None
    tips: Optional[float] = None
    notes: Optional[str] = None

class ClockAction(BaseModel):
    shift_id: str
    action: str          # "in" | "out"
    note: Optional[str] = None


def _require_any_dataset() -> tuple:
    """Returns (dataset, mode) — prefers LLM dataset over plain dataset."""
    if llm_dataset_is_loaded():
        return get_llm_dataset(), "llm"
    if dataset_is_loaded():
        return get_input_dataset(), "plain"
    raise HTTPException(
        status_code=400,
        detail="No dataset loaded. POST to /run/dataset or /run/llm-dataset first.",
    )


def _run_full(dataset: dict, mode: str) -> dict:
    try:
        if mode == "llm":
            return run_with_llm_dataset(dataset)
        return run_with_dataset(dataset)
    except Exception:
        return get_fallback_briefing(dataset)


@router.get("/summary")
async def dashboard_summary(current_user: User = Depends(get_current_user)):
    dataset, mode = _require_any_dataset()
    return _run_full(dataset, mode)


@router.get("/employee")
async def employee_view(current_user: User = Depends(get_current_user)):
    dataset, _ = _require_any_dataset()
    return get_employee_briefing(dataset)


@router.get("/manager")
async def manager_view(current_user: User = Depends(get_current_user)):
    if current_user.role not in _LEADERSHIP:
        raise HTTPException(403, "Not authorized")
    # Try live dataset first; fall back to last saved FRANK output
    try:
        dataset, mode = _require_any_dataset()
        return _run_full(dataset, mode)
    except HTTPException:
        cached = load_frank_output()
        if cached:
            return cached
        raise


@router.get("/crew")
async def crew_view(current_user: User = Depends(get_current_user)):
    if current_user.role not in _LEADERSHIP:
        raise HTTPException(403, "Not authorized")
    dataset, _ = _require_any_dataset()
    employees = dataset.get("employees", [])
    if not employees:
        raise HTTPException(400, "Dataset contains no employees.")

    import json, numpy as np

    class _Enc(json.JSONEncoder):
        def default(self, o):
            if isinstance(o, np.bool_):    return bool(o)
            if isinstance(o, np.integer):  return int(o)
            if isinstance(o, np.floating): return float(o)
            return super().default(o)

    return json.loads(json.dumps(get_all_shifts(employees), cls=_Enc))


@router.get("/admin")
async def admin_view(current_user: User = Depends(get_current_user)):
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(403, "Not authorized")
    dataset, mode = _require_any_dataset()
    return _run_full(dataset, mode)


@router.get("/employee/shifts")
async def employee_shifts(current_user: User = Depends(get_current_user)):
    """All employees can view the full shift schedule."""
    dataset, _ = _require_any_dataset()
    employees = dataset.get("employees", [])
    if not employees:
        raise HTTPException(400, "Dataset contains no employees.")

    import numpy as np

    class _Enc(json.JSONEncoder):
        def default(self, o):
            if isinstance(o, np.bool_):    return bool(o)
            if isinstance(o, np.integer):  return int(o)
            if isinstance(o, np.floating): return float(o)
            return super().default(o)

    shifts_data = json.loads(json.dumps(get_all_shifts(employees), cls=_Enc))
    requests = _load_shift_requests()
    req_map = {r["shift_id"]: r for r in requests}
    for shift in shifts_data.get("shifts", []):
        sid = shift.get("shift_id")
        # Hoist role from first assigned employee to top-level for frontend convenience
        emps = shift.get("employees", [])
        if emps and not shift.get("role"):
            shift["role"] = (emps[0].get("employee_role") or "").replace("_", " ").title()
        # Hoist employee names list
        if emps and not shift.get("assigned_names"):
            shift["assigned_names"] = [e.get("name", "") for e in emps]
        if sid and sid in req_map:
            shift["pending_request"] = req_map[sid]
    return shifts_data


@router.post("/employee/shift-request")
async def submit_shift_request(
    body: ShiftRequest,
    current_user: User = Depends(get_current_user),
):
    """Employee submits a shift change request (swap, unavailable, available, or note)."""
    requests = _load_shift_requests()
    # Remove any previous request for the same shift by the same user
    requests = [r for r in requests if not (r["shift_id"] == body.shift_id and r["email"] == current_user.email)]
    requests.append({
        "shift_id": body.shift_id,
        "email": current_user.email,
        "name": current_user.full_name,
        "request_type": body.request_type,
        "note": body.note or "",
        "status": "pending",
    })
    _save_shift_requests(requests)
    return {"ok": True, "message": f"Shift request submitted for {body.shift_id}"}


@router.get("/employee/shift-requests")
async def get_shift_requests(current_user: User = Depends(get_current_user)):
    """Managers see all requests; employees see only their own."""
    requests = _load_shift_requests()
    if current_user.role in _LEADERSHIP:
        return {"requests": requests}
    return {"requests": [r for r in requests if r["email"] == current_user.email]}


@router.put("/employee/shift-request/action")
async def action_shift_request(
    body: ShiftRequestAction,
    current_user: User = Depends(get_current_user),
):
    """Manager approves or rejects a shift request."""
    if current_user.role not in _LEADERSHIP:
        raise HTTPException(403, "Not authorized")
    requests = _load_shift_requests()
    updated = False
    for r in requests:
        if r["shift_id"] == body.shift_id and r["email"] == body.email:
            r["status"] = body.status
            r["manager_note"] = body.manager_note or ""
            r["reviewed_by"] = current_user.email
            updated = True
            break
    if not updated:
        raise HTTPException(404, "Request not found")
    _save_shift_requests(requests)
    return {"ok": True, "status": body.status}


@router.get("/shift-log")
async def get_shift_log(current_user: User = Depends(get_current_user)):
    """Return shift cash/tips logs. Managers see all; employees see their own."""
    if not _SHIFT_LOG_PATH.exists():
        return {"logs": []}
    try:
        logs = json.loads(_SHIFT_LOG_PATH.read_text())
    except Exception:
        return {"logs": []}
    if current_user.role in _LEADERSHIP:
        return {"logs": logs}
    return {"logs": [l for l in logs if l.get("email") == current_user.email]}


@router.post("/shift-log")
async def post_shift_log(
    body: ShiftLog,
    current_user: User = Depends(get_current_user),
):
    """Employee logs cash/tips for their shift."""
    if not _SHIFT_LOG_PATH.exists():
        logs = []
    else:
        try:
            logs = json.loads(_SHIFT_LOG_PATH.read_text())
        except Exception:
            logs = []

    from datetime import datetime
    # Replace existing entry for same shift+user, or append
    logs = [l for l in logs if not (l["shift_id"] == body.shift_id and l["email"] == current_user.email)]
    entry = {
        "shift_id":     body.shift_id,
        "email":        current_user.email,
        "name":         current_user.full_name,
        "opening_cash": body.opening_cash,
        "closing_cash": body.closing_cash,
        "tips":         body.tips,
        "notes":        body.notes or "",
        "logged_at":    datetime.utcnow().isoformat(),
    }
    if body.closing_cash is not None and body.opening_cash is not None:
        entry["net_cash"] = round(body.closing_cash - body.opening_cash, 2)
    logs.append(entry)
    _SHIFT_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    _SHIFT_LOG_PATH.write_text(json.dumps(logs, indent=2))
    return {"ok": True, "entry": entry}


@router.post("/clock")
async def clock_event(
    body: ClockAction,
    current_user: User = Depends(get_current_user),
):
    """Employee clocks in or out for a shift."""
    from datetime import datetime as dt
    if body.action not in ("in", "out"):
        raise HTTPException(400, "action must be 'in' or 'out'")

    records = _load_attendance()
    now_iso = dt.utcnow().isoformat()

    if body.action == "in":
        # Prevent double clock-in on same shift
        existing = next(
            (r for r in records if r["shift_id"] == body.shift_id and r["email"] == current_user.email and r.get("action") == "in" and not r.get("clock_out")),
            None
        )
        if existing:
            raise HTTPException(409, "Already clocked in for this shift")
        records.append({
            "shift_id":  body.shift_id,
            "email":     current_user.email,
            "name":      current_user.full_name,
            "action":    "in",
            "clock_in":  now_iso,
            "clock_out": None,
            "duration_min": None,
            "note":      body.note or "",
        })
    else:
        # Find open clock-in record
        rec = next(
            (r for r in records if r["shift_id"] == body.shift_id and r["email"] == current_user.email and r.get("action") == "in" and not r.get("clock_out")),
            None
        )
        if not rec:
            raise HTTPException(404, "No active clock-in found for this shift")
        ci = dt.fromisoformat(rec["clock_in"])
        co = dt.utcnow()
        rec["clock_out"]    = now_iso
        rec["duration_min"] = round((co - ci).total_seconds() / 60, 1)
        rec["note"]         = body.note or rec.get("note", "")

    _save_attendance(records)
    return {"ok": True, "action": body.action, "timestamp": now_iso}


@router.get("/attendance")
async def get_attendance(current_user: User = Depends(get_current_user)):
    """Return attendance records. Managers see all; employees see their own."""
    records = _load_attendance()
    if current_user.role in _LEADERSHIP:
        return {"attendance": records}
    return {"attendance": [r for r in records if r.get("email") == current_user.email]}


@router.get("/shift-log-summary")
async def get_shift_log_summary(current_user: User = Depends(get_current_user)):
    """Return cash/tips totals aggregated per shift — managers see all, employees see their own."""
    if not _SHIFT_LOG_PATH.exists():
        return {"summary": [], "totals": {"total_tips": 0, "total_net_cash": 0, "entries": 0}}
    try:
        logs = json.loads(_SHIFT_LOG_PATH.read_text())
    except Exception:
        return {"summary": [], "totals": {"total_tips": 0, "total_net_cash": 0, "entries": 0}}

    if current_user.role not in _LEADERSHIP:
        logs = [l for l in logs if l.get("email") == current_user.email]

    by_shift = {}
    for l in logs:
        sid = l["shift_id"]
        if sid not in by_shift:
            by_shift[sid] = {"shift_id": sid, "entries": [], "tips": 0.0, "net_cash": 0.0}
        by_shift[sid]["entries"].append({
            "name": l.get("name", ""),
            "tips": l.get("tips") or 0,
            "net_cash": l.get("net_cash") or 0,
            "notes": l.get("notes", ""),
            "logged_at": l.get("logged_at", ""),
        })
        by_shift[sid]["tips"] += l.get("tips") or 0
        by_shift[sid]["net_cash"] += l.get("net_cash") or 0

    summary = sorted(by_shift.values(), key=lambda x: x["shift_id"])
    total_tips = round(sum(s["tips"] for s in summary), 2)
    total_net  = round(sum(s["net_cash"] for s in summary), 2)
    return {
        "summary": summary,
        "totals": {"total_tips": total_tips, "total_net_cash": total_net, "entries": len(logs)},
    }


@router.get("/leaderboard")
async def get_leaderboard(current_user: User = Depends(get_current_user)):
    """Return employee points leaderboard computed from dataset + attendance + shift logs."""
    dataset, _ = _require_any_dataset()
    employees = dataset.get("employees", [])

    # Base score per employee from dataset performance notes
    POSITIVE_KW = ["outstanding","exceptional","rising star","excellent","consistent",
                   "100/100","specifically request","high upsell","praised","great","perfect"]
    NEGATIVE_KW = ["late","near-miss","overtime","needs review","improvement","poor","below"]

    # Load attendance to count completed shifts
    attendance = _load_attendance()
    clocked_out = {}
    for r in attendance:
        if r.get("clock_out"):
            name = r.get("name", "")
            clocked_out[name] = clocked_out.get(name, 0) + 1

    # Load shift log for tips
    tips_by_name = {}
    if _SHIFT_LOG_PATH.exists():
        try:
            logs = json.loads(_SHIFT_LOG_PATH.read_text())
            for l in logs:
                n = l.get("name", "")
                tips_by_name[n] = tips_by_name.get(n, 0) + (l.get("tips") or 0)
        except Exception:
            pass

    board = []
    for emp in employees:
        name  = emp.get("name", "")
        notes = (emp.get("performance_notes") or "").lower()
        role  = emp.get("role", "")

        # 0-40 pts: performance notes
        pos_hits = sum(1 for kw in POSITIVE_KW if kw in notes)
        neg_hits = sum(1 for kw in NEGATIVE_KW if kw in notes)
        perf_score = min(40, max(0, 20 + pos_hits * 8 - neg_hits * 10))

        # 0-30 pts: shifts completed this week
        shifts_done = clocked_out.get(name, 0)
        shift_score = min(30, shifts_done * 10)

        # 0-20 pts: hours per week (normalized to 40h cap)
        hrs = emp.get("hours_per_week", 20)
        hrs_score = min(20, int(hrs / 40 * 20))

        # 0-10 pts: tips (normalized — $50 tips = 10 pts)
        tips = tips_by_name.get(name, 0)
        tips_score = min(10, int(tips / 50 * 10))

        total = perf_score + shift_score + hrs_score + tips_score
        badge = (
            "🏆 Top Performer" if total >= 75 else
            "⭐ Rising Star"   if total >= 55 else
            "👍 On Track"      if total >= 35 else
            "📈 Keep Going"
        )
        board.append({
            "name": name,
            "role": role,
            "total_score": total,
            "breakdown": {
                "performance": perf_score,
                "shifts_completed": shift_score,
                "hours": hrs_score,
                "tips": tips_score,
            },
            "shifts_completed": shifts_done,
            "badge": badge,
        })

    board.sort(key=lambda x: -x["total_score"])
    for i, e in enumerate(board):
        e["rank"] = i + 1

    return {"leaderboard": board, "week": str(_week_date("Monday")) if board else ""}


@router.get("/notifications")
async def get_notifications(current_user: User = Depends(get_current_user)):
    """Returns notification counts for the current user."""
    requests = _load_shift_requests()
    if current_user.role in _LEADERSHIP:
        pending = [r for r in requests if r.get("status") == "pending"]
        return {"count": len(pending), "items": pending}
    # Employee sees their own request status updates
    mine = [r for r in requests if r["email"] == current_user.email]
    reviewed = [r for r in mine if r.get("status") in ("approved", "rejected")]
    return {"count": len(reviewed), "items": reviewed}
