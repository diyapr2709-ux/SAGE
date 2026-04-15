from sage.schemas.crew_signal import CrewSignal, EmployeeAssignment


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
                ),
                EmployeeAssignment(
                    name="Michael Rivera",
                    employee_type="full_time",
                    employee_role="shift_supervisor",
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
                ),
                EmployeeAssignment(
                    name="Daniel Brooks",
                    employee_type="part_time",
                    employee_role="cashier",
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
                ),
                EmployeeAssignment(
                    name="Michael Rivera",
                    employee_type="full_time",
                    employee_role="shift_supervisor",
                ),
                EmployeeAssignment(
                    name="Emily Chen",
                    employee_type="student_worker",
                    employee_role="front_desk",
                ),
            ],
        ),
    }

    if scenario not in scenarios:
        raise ValueError(
            f"Unknown scenario '{scenario}'. Valid scenarios are: {list(scenarios.keys())}"
        )

    signal = scenarios[scenario]
    return signal.model_dump()


if __name__ == "__main__":
    print("Default scenario:")
    print(run_crew_stub())

    print("\nOverstaffed scenario:")
    print(run_crew_stub("overstaffed_morning"))

    print("\nBalanced scenario:")
    print(run_crew_stub("balanced_afternoon"))