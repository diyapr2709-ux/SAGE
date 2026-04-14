from sage.schemas.crew_signal import CrewSignal


def run_crew_stub(scenario: str = "understaffed_evening") -> dict:
    scenarios = {
        "understaffed_evening": CrewSignal(
            shift_id="fri_evening_01",
            staffing_status="understaffed",
            adjustment="Add 1 cashier from 5 PM to 8 PM",
            financial_impact=140.0,
        ),
        "overstaffed_morning": CrewSignal(
            shift_id="mon_morning_01",
            staffing_status="overstaffed",
            adjustment="Reduce 1 staff member from 9 AM to 11 AM",
            financial_impact=65.0,
        ),
        "balanced_afternoon": CrewSignal(
            shift_id="wed_afternoon_01",
            staffing_status="balanced",
            adjustment="No change needed",
            financial_impact=0.0,
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