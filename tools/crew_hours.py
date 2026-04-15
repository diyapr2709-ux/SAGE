from sage.tools.crew_preferences import time_to_minutes


def calculate_shift_hours(shift_start: str, shift_end: str) -> float:
    start_minutes = time_to_minutes(shift_start)
    end_minutes = time_to_minutes(shift_end)
    return (end_minutes - start_minutes) / 60


def check_hour_cap(employee: dict, shift_start: str, shift_end: str) -> dict:
    shift_hours = calculate_shift_hours(shift_start, shift_end)
    projected_hours = employee["current_hours_assigned"] + shift_hours
    allowed = projected_hours <= employee["max_hours_per_week"]

    if allowed:
        note = (
            f"Allowed: projected weekly hours would be {projected_hours:.1f} "
            f"out of {employee['max_hours_per_week']}."
        )
    else:
        note = (
            f"Not allowed: projected weekly hours would be {projected_hours:.1f}, "
            f"which exceeds the limit of {employee['max_hours_per_week']}."
        )

    return {
        "shift_hours": shift_hours,
        "projected_hours": projected_hours,
        "within_hour_cap": allowed,
        "hour_cap_note": note,
    }


if __name__ == "__main__":
    sample_employee = {
        "name": "Aarav Patel",
        "current_hours_assigned": 14,
        "max_hours_per_week": 20,
    }

    print(check_hour_cap(sample_employee, "17:00", "20:00"))