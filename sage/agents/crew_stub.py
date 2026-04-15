import json
from sage.schemas.crew_signal import CrewSignal, EmployeeAssignment
from sage.tools.crew_preferences import matches_preference


def build_preference_summary(signal_dict: dict) -> str:
    total = len(signal_dict["employees"])
    matched = sum(1 for employee in signal_dict["employees"] if employee["preference_match"])
    return f"{matched} of {total} employees match their preferred hours"


def add_preference_flags(signal_dict: dict) -> dict:
    for employee in signal_dict["employees"]:
        employee["preference_match"] = matches_preference(
            employee,
            signal_dict["shift_date"],
            signal_dict["shift_start"],
            signal_dict["shift_end"],
        )

    signal_dict["preference_summary"] = build_preference_summary(signal_dict)
    return signal_dict


def run_crew_stub(scenario: str = "understaffed_evening") -> dict:
    scenarios = {
        "understaffed_evening": CrewSignal(
            shift_id="fri_evening_01",
            shift_date="2026-04-17",
            shift_start="17:00",
            shift_end="20:00",
            staffing_status="understaffed",
            adjustment="Add 1 cashier",
            financial_impact=140.0,
            employees=[
                EmployeeAssignment(
                    name="Aarav Patel",
                    employee_type="part_time",
                    employee_role="cashier",
                    preferred_days=["Friday", "Saturday", "Sunday"],
                    preferred_start="16:00",
                    preferred_end="22:00",
                    max_hours_per_week=20,
                ),
                EmployeeAssignment(
                    name="Michael Rivera",
                    employee_type="full_time",
                    employee_role="shift_supervisor",
                    preferred_days=["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                    preferred_start="09:00",
                    preferred_end="18:00",
                    max_hours_per_week=40,
                ),
            ],
        ),
        "overstaffed_morning": CrewSignal(
            shift_id="mon_morning_01",
            shift_date="2026-04-20",
            shift_start="09:00",
            shift_end="11:00",
            staffing_status="overstaffed",
            adjustment="Reduce 1 staff member",
            financial_impact=65.0,
            employees=[
                EmployeeAssignment(
                    name="Emily Chen",
                    employee_type="student_worker",
                    employee_role="front_desk",
                    preferred_days=["Monday", "Wednesday", "Friday"],
                    preferred_start="10:00",
                    preferred_end="16:00",
                    max_hours_per_week=15,
                ),
                EmployeeAssignment(
                    name="Daniel Brooks",
                    employee_type="part_time",
                    employee_role="cashier",
                    preferred_days=["Monday", "Tuesday", "Thursday"],
                    preferred_start="08:00",
                    preferred_end="14:00",
                    max_hours_per_week=25,
                ),
            ],
        ),
        "balanced_afternoon": CrewSignal(
            shift_id="wed_afternoon_01",
            shift_date="2026-04-22",
            shift_start="13:00",
            shift_end="16:00",
            staffing_status="balanced",
            adjustment="No change needed",
            financial_impact=0.0,
            employees=[
                EmployeeAssignment(
                    name="Sophia Kim",
                    employee_type="part_time",
                    employee_role="cashier",
                    preferred_days=["Wednesday", "Thursday", "Saturday"],
                    preferred_start="12:00",
                    preferred_end="18:00",
                    max_hours_per_week=18,
                ),
                EmployeeAssignment(
                    name="Michael Rivera",
                    employee_type="full_time",
                    employee_role="shift_supervisor",
                    preferred_days=["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                    preferred_start="09:00",
                    preferred_end="18:00",
                    max_hours_per_week=40,
                ),
                EmployeeAssignment(
                    name="Emily Chen",
                    employee_type="student_worker",
                    employee_role="front_desk",
                    preferred_days=["Monday", "Wednesday", "Friday"],
                    preferred_start="10:00",
                    preferred_end="16:00",
                    max_hours_per_week=15,
                ),
            ],
        ),
    }

    if scenario not in scenarios:
        raise ValueError(
            f"Unknown scenario '{scenario}'. Valid scenarios are: {list(scenarios.keys())}"
        )

    signal = scenarios[scenario].model_dump()
    return add_preference_flags(signal)


if __name__ == "__main__":
    print("Default scenario:")
    print(json.dumps(run_crew_stub(), indent=4))

    print("\nOverstaffed scenario:")
    print(json.dumps(run_crew_stub("overstaffed_morning"), indent=4))

    print("\nBalanced scenario:")
    print(json.dumps(run_crew_stub("balanced_afternoon"), indent=4))