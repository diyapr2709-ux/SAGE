import json
from typing import List
from pydantic import BaseModel
from datetime import datetime, timedelta


def _week_date(day_name: str, offset_weeks: int = 0) -> str:
    """Return YYYY-MM-DD for the given weekday in the current Mon-Sun week."""
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    today = datetime.today()
    today_idx = today.weekday()          # Mon=0 … Sun=6
    target_idx = days.index(day_name)
    delta = target_idx - today_idx + offset_weeks * 7
    return (today + timedelta(days=delta)).strftime('%Y-%m-%d')


class EmployeeAssignment(BaseModel):
    name: str
    employee_type: str
    employee_role: str
    preferred_days: List[str]
    preferred_start: str
    preferred_end: str
    max_hours_per_week: int
    current_hours_assigned: int


class CrewSignal(BaseModel):
    shift_id: str
    shift_date: str
    shift_start: str
    shift_end: str
    staffing_status: str
    adjustment: str
    financial_impact: float
    employees: List[EmployeeAssignment]


# ── Shift templates: day_name resolved to this week's date at runtime ─────────
_SCENARIO_DEFS = [
    {
        "key": "mon_morning",
        "shift_id": "mon_morning_01",
        "shift_day": "Monday",
        "shift_start": "09:00",
        "shift_end": "13:00",
        "staffing_status": "balanced",
        "adjustment": "No change needed",
        "financial_impact": 0.0,
    },
    {
        "key": "tue_lunch",
        "shift_id": "tue_lunch_01",
        "shift_day": "Tuesday",
        "shift_start": "11:00",
        "shift_end": "15:00",
        "staffing_status": "balanced",
        "adjustment": "No change needed",
        "financial_impact": 0.0,
    },
    {
        "key": "wed_afternoon",
        "shift_id": "wed_afternoon_01",
        "shift_day": "Wednesday",
        "shift_start": "13:00",
        "shift_end": "17:00",
        "staffing_status": "balanced",
        "adjustment": "No change needed",
        "financial_impact": 0.0,
    },
    {
        "key": "thu_late_night",
        "shift_id": "thu_late_01",
        "shift_day": "Thursday",
        "shift_start": "18:00",
        "shift_end": "23:00",
        "staffing_status": "understaffed",
        "adjustment": "Add 1 cashier for late rush",
        "financial_impact": 180.0,
    },
    {
        "key": "fri_evening",
        "shift_id": "fri_evening_01",
        "shift_day": "Friday",
        "shift_start": "17:00",
        "shift_end": "22:00",
        "staffing_status": "understaffed",
        "adjustment": "Add 1 cashier + 1 cook",
        "financial_impact": 260.0,
    },
    {
        "key": "sat_peak",
        "shift_id": "sat_peak_01",
        "shift_day": "Saturday",
        "shift_start": "12:00",
        "shift_end": "20:00",
        "staffing_status": "balanced",
        "adjustment": "Full roster — monitor for surge",
        "financial_impact": 0.0,
    },
    {
        "key": "sun_brunch",
        "shift_id": "sun_brunch_01",
        "shift_day": "Sunday",
        "shift_start": "10:00",
        "shift_end": "15:00",
        "staffing_status": "overstaffed",
        "adjustment": "Reduce 1 staff member",
        "financial_impact": 55.0,
    },
]


def _build_templates() -> dict:
    """Resolve each definition's shift_day to this week's calendar date."""
    result = {}
    for defn in _SCENARIO_DEFS:
        entry = {k: v for k, v in defn.items() if k not in ("key", "shift_day")}
        entry["shift_date"] = _week_date(defn["shift_day"])
        result[defn["key"]] = entry
    return result


def get_scenario_templates() -> dict:
    """Always returns fresh templates with current-week dates."""
    return _build_templates()


# Keep a module-level alias for legacy callers that reference SCENARIO_TEMPLATES directly
SCENARIO_TEMPLATES = property(lambda self: _build_templates())

# Role scheduling defaults — configuration, not business data
ROLE_DEFAULTS = {
    "cashier": {
        "employee_type": "part_time",
        "preferred_days": ["Friday", "Saturday", "Sunday"],
        "preferred_start": "16:00",
        "preferred_end": "22:00",
        "default_max_hours": 20,
    },
    "shift_supervisor": {
        "employee_type": "full_time",
        "preferred_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "preferred_start": "09:00",
        "preferred_end": "18:00",
        "default_max_hours": 40,
    },
    "cook": {
        "employee_type": "full_time",
        "preferred_days": ["Thursday", "Friday", "Saturday", "Sunday"],
        "preferred_start": "18:00",
        "preferred_end": "03:00",
        "default_max_hours": 35,
    },
    "front_desk": {
        "employee_type": "student_worker",
        "preferred_days": ["Monday", "Wednesday", "Friday"],
        "preferred_start": "10:00",
        "preferred_end": "16:00",
        "default_max_hours": 15,
    },
    "delivery_driver": {
        "employee_type": "part_time",
        "preferred_days": ["Wednesday", "Thursday", "Friday", "Saturday"],
        "preferred_start": "20:00",
        "preferred_end": "03:00",
        "default_max_hours": 28,
    },
}

_DEFAULT_ROLE_DEFAULTS = {
    "employee_type": "part_time",
    "preferred_days": ["Monday", "Wednesday", "Friday"],
    "preferred_start": "09:00",
    "preferred_end": "17:00",
    "default_max_hours": 20,
}


def _normalize_role(role_str: str) -> str:
    r = role_str.lower().replace(" ", "_")
    aliases = {
        "supervisor": "shift_supervisor",
        "manager": "shift_supervisor",
        "front_desk": "front_desk",
        "driver": "delivery_driver",
        "delivery": "delivery_driver",
    }
    return aliases.get(r, r)


def _build_assignment(emp_dict: dict) -> EmployeeAssignment:
    role = _normalize_role(emp_dict.get("role", "cashier"))
    defaults = ROLE_DEFAULTS.get(role, _DEFAULT_ROLE_DEFAULTS)
    hours_per_week = emp_dict.get("hours_per_week", defaults["default_max_hours"])
    # Estimate current hours as 70% of scheduled weekly hours
    current_assigned = round(hours_per_week * 0.7)
    return EmployeeAssignment(
        name=emp_dict["name"],
        employee_type=defaults["employee_type"],
        employee_role=role,
        preferred_days=defaults["preferred_days"],
        preferred_start=defaults["preferred_start"],
        preferred_end=defaults["preferred_end"],
        max_hours_per_week=hours_per_week,
        current_hours_assigned=current_assigned,
    )


def check_preference_match(employee: dict, shift_date: str, shift_start: str, shift_end: str) -> dict:
    shift_dt = datetime.strptime(shift_date, "%Y-%m-%d")
    day_name = shift_dt.strftime("%A")
    day_match = day_name in employee["preferred_days"]

    def t(s):
        h, m = map(int, s.split(":"))
        return h * 60 + m

    start_ok = t(employee["preferred_start"]) <= t(shift_start)
    end_ok = t(shift_end) <= t(employee["preferred_end"])
    time_match = start_ok and end_ok

    return {
        "day_match": day_match,
        "time_match": time_match,
        "preference_score": (1 if day_match else 0) + (1 if time_match else 0),
        "preference_label": (
            "preferred" if (day_match and time_match)
            else "acceptable" if (day_match or time_match)
            else "not_preferred"
        ),
    }


def check_hour_cap(employee: dict, shift_start: str, shift_end: str) -> dict:
    def t(s):
        h, m = map(int, s.split(":"))
        return h + m / 60

    duration = t(shift_end) - t(shift_start)
    if duration <= 0:
        duration += 24

    projected = employee["current_hours_assigned"] + duration
    over_cap = projected > employee["max_hours_per_week"]
    remaining = employee["max_hours_per_week"] - employee["current_hours_assigned"]

    return {
        "shift_duration_hrs": round(duration, 2),
        "projected_hours": round(projected, 2),
        "over_cap": over_cap,
        "hours_remaining": round(remaining, 2),
        "hour_cap_label": (
            "over_cap" if over_cap
            else "near_cap" if remaining <= 4
            else "available"
        ),
    }


def build_selection_status(employee: dict) -> dict:
    pref = employee.get("preference_label", "acceptable")
    cap = employee.get("hour_cap_label", "available")

    if cap == "over_cap":
        return {"selection_status": "not_recommended", "selection_reason": "Exceeds weekly hour cap"}
    if pref == "preferred" and cap == "available":
        return {"selection_status": "recommended", "selection_reason": "Preferred shift, hours available"}
    if pref == "preferred" and cap == "near_cap":
        return {"selection_status": "acceptable", "selection_reason": "Preferred shift but near hour cap"}
    if pref == "acceptable":
        return {"selection_status": "acceptable", "selection_reason": "Partial preference match"}
    return {"selection_status": "not_recommended", "selection_reason": "Outside preferred schedule"}


def build_preference_summary(signal: dict) -> str:
    recommended = [e["name"] for e in signal["employees"] if e.get("selection_status") == "recommended"]
    acceptable  = [e["name"] for e in signal["employees"] if e.get("selection_status") == "acceptable"]
    not_rec     = [e["name"] for e in signal["employees"] if e.get("selection_status") == "not_recommended"]

    parts = []
    if recommended:
        parts.append(f"Recommended: {', '.join(recommended)}")
    if acceptable:
        parts.append(f"Acceptable: {', '.join(acceptable)}")
    if not_rec:
        parts.append(f"Not recommended: {', '.join(not_rec)}")
    return " | ".join(parts) if parts else "No preference data"


def add_preference_flags(signal_dict: dict) -> dict:
    for employee in signal_dict["employees"]:
        employee.update(check_preference_match(
            employee, signal_dict["shift_date"],
            signal_dict["shift_start"], signal_dict["shift_end"],
        ))
        employee.update(check_hour_cap(
            employee, signal_dict["shift_start"], signal_dict["shift_end"],
        ))
        employee.update(build_selection_status(employee))

    signal_dict["preference_summary"] = build_preference_summary(signal_dict)
    return signal_dict


def run_crew_stub(scenario: str, employees: list) -> dict:
    """Build a shift signal for the given scenario using employees from the dataset."""
    templates = get_scenario_templates()
    if scenario not in templates:
        raise ValueError(f"Unknown scenario '{scenario}'. Valid: {list(templates.keys())}")
    if not employees:
        raise ValueError("employees list is required and must not be empty")

    tmpl = templates[scenario]
    assignments = [_build_assignment(e) for e in employees]

    signal = CrewSignal(
        **tmpl,
        employees=assignments,
    ).model_dump()

    return add_preference_flags(signal)


def get_all_shifts(employees: list) -> dict:
    """Return all shift scenarios for the current week, built from dataset employees."""
    if not employees:
        raise ValueError("employees list is required and must not be empty")

    templates = get_scenario_templates()
    shifts = []
    for key in templates:
        try:
            shifts.append(run_crew_stub(key, employees))
        except Exception as e:
            shifts.append({"error": str(e), "scenario": key})

    # Sort by shift_date then shift_start
    shifts.sort(key=lambda s: (s.get("shift_date", ""), s.get("shift_start", "")))
    return {"shifts": shifts}


if __name__ == "__main__":
    sample_employees = [
        {"name": "Alice Smith",  "role": "Cashier",         "hourly_rate": 15, "hours_per_week": 20},
        {"name": "Bob Jones",    "role": "Cook",             "hourly_rate": 16, "hours_per_week": 30},
        {"name": "Carol White",  "role": "Shift Supervisor", "hourly_rate": 22, "hours_per_week": 40},
    ]
    print(json.dumps(run_crew_stub("fri_evening", sample_employees), indent=2))
    print(json.dumps(get_all_shifts(sample_employees), indent=2))
