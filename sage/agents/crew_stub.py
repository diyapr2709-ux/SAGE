import json
from datetime import datetime, timedelta
from sage.schemas.crew_signal import CrewSignal, EmployeeAssignment
from sage.tools.crew_preferences import matches_preference
from sage.tools.crew_hours import check_hour_cap

# ── FULL EMPLOYEE ROSTER ──────────────────────────────────────────────────────

ROSTER = [
    EmployeeAssignment(
        name="Aarav Patel",
        employee_type="part_time",
        employee_role="cashier",
        preferred_days=["Friday", "Saturday", "Sunday"],
        preferred_start="16:00",
        preferred_end="23:00",
        max_hours_per_week=20,
        current_hours_assigned=14,
    ),
    EmployeeAssignment(
        name="Michael Rivera",
        employee_type="full_time",
        employee_role="shift_supervisor",
        preferred_days=["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        preferred_start="09:00",
        preferred_end="18:00",
        max_hours_per_week=40,
        current_hours_assigned=38,
    ),
    EmployeeAssignment(
        name="Sophia Kim",
        employee_type="part_time",
        employee_role="cashier",
        preferred_days=["Wednesday", "Thursday", "Saturday", "Sunday"],
        preferred_start="12:00",
        preferred_end="20:00",
        max_hours_per_week=18,
        current_hours_assigned=8,
    ),
    EmployeeAssignment(
        name="Daniel Brooks",
        employee_type="part_time",
        employee_role="cook",
        preferred_days=["Monday", "Tuesday", "Thursday", "Friday"],
        preferred_start="08:00",
        preferred_end="16:00",
        max_hours_per_week=25,
        current_hours_assigned=22,
    ),
    EmployeeAssignment(
        name="Emily Chen",
        employee_type="student_worker",
        employee_role="front_desk",
        preferred_days=["Monday", "Wednesday", "Friday"],
        preferred_start="10:00",
        preferred_end="17:00",
        max_hours_per_week=15,
        current_hours_assigned=12,
    ),
]


def build_preference_summary(signal_dict: dict) -> str:
    total = len(signal_dict["employees"])
    matched = sum(1 for e in signal_dict["employees"] if e["preference_match"])
    return f"{matched} of {total} employees match their preferred hours"


def build_selection_status(employee: dict) -> dict:
    if not employee["preference_match"]:
        return {
            "can_select_shift": False,
            "selection_note": "This shift does not match your preferred work hours.",
        }
    if not employee["within_hour_cap"]:
        return {
            "can_select_shift": False,
            "selection_note": "Choosing this shift would exceed your allowed weekly hours.",
        }
    return {
        "can_select_shift": True,
        "selection_note": "You can select this shift.",
    }


def add_preference_flags(signal_dict: dict) -> dict:
    for employee in signal_dict["employees"]:
        employee["preference_match"] = matches_preference(
            employee,
            signal_dict["shift_date"],
            signal_dict["shift_start"],
            signal_dict["shift_end"],
        )
        hour_cap_result = check_hour_cap(
            employee,
            signal_dict["shift_start"],
            signal_dict["shift_end"],
        )
        employee.update(hour_cap_result)
        selection_result = build_selection_status(employee)
        employee.update(selection_result)

    signal_dict["preference_summary"] = build_preference_summary(signal_dict)
    return signal_dict


def _next_weekday(weekday_name: str, from_date: datetime = None) -> str:
    """Return YYYY-MM-DD for the next occurrence of a weekday name."""
    names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    target = names.index(weekday_name)
    base = from_date or datetime.today()
    days_ahead = (target - base.weekday()) % 7 or 7
    return (base + timedelta(days=days_ahead)).strftime("%Y-%m-%d")


def run_crew_stub(scenario: str = "auto") -> dict:
    """
    Run a CREW staffing scenario.

    scenario options:
        "auto"                - picks based on current hour (morning/evening/late)
        "understaffed_evening" - Friday evening rush, understaffed
        "overstaffed_morning"  - Monday morning, overstaffed
        "balanced_afternoon"   - Wednesday afternoon, balanced
        "late_night_rush"      - Late-night understaffed (Fri/Sat)
    """
    # Auto-pick by time of day
    if scenario == "auto":
        hour = datetime.now().hour
        if hour < 12:
            scenario = "overstaffed_morning"
        elif hour < 17:
            scenario = "balanced_afternoon"
        elif hour < 22:
            scenario = "understaffed_evening"
        else:
            scenario = "late_night_rush"

    scenarios = {
        "understaffed_evening": CrewSignal(
            shift_id="fri_evening_01",
            shift_date=_next_weekday("Friday"),
            shift_start="17:00",
            shift_end="21:00",
            staffing_status="understaffed",
            adjustment="Add 1 cashier — rush hour coverage needed",
            financial_impact=140.0,
            employees=[
                ROSTER[0],  # Aarav – cashier, good fit
                ROSTER[1],  # Michael – supervisor
            ],
        ),
        "overstaffed_morning": CrewSignal(
            shift_id="mon_morning_01",
            shift_date=_next_weekday("Monday"),
            shift_start="09:00",
            shift_end="12:00",
            staffing_status="overstaffed",
            adjustment="Send 1 staff member home early — low foot traffic",
            financial_impact=65.0,
            employees=[
                ROSTER[1],  # Michael
                ROSTER[4],  # Emily – student, mismatch expected
                ROSTER[3],  # Daniel – cook
            ],
        ),
        "balanced_afternoon": CrewSignal(
            shift_id="wed_afternoon_01",
            shift_date=_next_weekday("Wednesday"),
            shift_start="13:00",
            shift_end="17:00",
            staffing_status="balanced",
            adjustment="No changes needed",
            financial_impact=0.0,
            employees=[
                ROSTER[2],  # Sophia
                ROSTER[1],  # Michael
                ROSTER[4],  # Emily
            ],
        ),
        "late_night_rush": CrewSignal(
            shift_id="fri_latenight_01",
            shift_date=_next_weekday("Friday"),
            shift_start="22:00",
            shift_end="02:00",
            staffing_status="understaffed",
            adjustment="Add 2 staff — late-night college rush (UMD)",
            financial_impact=280.0,
            employees=[
                ROSTER[0],  # Aarav – perfect fit
                ROSTER[2],  # Sophia – partial match
            ],
        ),
    }

    if scenario not in scenarios:
        raise ValueError(f"Unknown scenario '{scenario}'. Valid: {list(scenarios.keys())}")

    signal = scenarios[scenario].model_dump()
    return add_preference_flags(signal)


def get_all_shifts() -> list:
    """Return all 4 crew scenarios with preference flags — used by the dashboard week view."""
    results = []
    for name in ["understaffed_evening", "overstaffed_morning", "balanced_afternoon", "late_night_rush"]:
        s = run_crew_stub(name)
        s["scenario_name"] = name
        results.append(s)
    return results


if __name__ == "__main__":
    print("Auto scenario:")
    print(json.dumps(run_crew_stub("auto"), indent=2))
    print("\nAll shifts:")
    for s in get_all_shifts():
        print(f"  {s['scenario_name']}: {s['staffing_status']} — {s['shift_date']} {s['shift_start']}-{s['shift_end']}")
