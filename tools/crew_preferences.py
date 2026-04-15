from datetime import datetime


def get_day_name(date_str: str) -> str:
    return datetime.strptime(date_str, "%Y-%m-%d").strftime("%A")


def time_to_minutes(time_str: str) -> int:
    hours, minutes = map(int, time_str.split(":"))
    return hours * 60 + minutes


def matches_preference(employee: dict, shift_date: str, shift_start: str, shift_end: str) -> bool:
    shift_day = get_day_name(shift_date)

    if shift_day not in employee["preferred_days"]:
        return False

    shift_start_min = time_to_minutes(shift_start)
    shift_end_min = time_to_minutes(shift_end)
    preferred_start_min = time_to_minutes(employee["preferred_start"])
    preferred_end_min = time_to_minutes(employee["preferred_end"])

    return preferred_start_min <= shift_start_min and shift_end_min <= preferred_end_min


if __name__ == "__main__":
    sample_employee = {
        "name": "Aarav Patel",
        "employee_type": "part_time",
        "employee_role": "cashier",
        "preferred_days": ["Friday", "Saturday", "Sunday"],
        "preferred_start": "16:00",
        "preferred_end": "22:00",
        "max_hours_per_week": 20,
    }

    print(matches_preference(sample_employee, "2026-04-17", "17:00", "20:00"))  # True
    print(matches_preference(sample_employee, "2026-04-20", "17:00", "20:00"))  # False
    print(matches_preference(sample_employee, "2026-04-17", "14:00", "20:00"))  # False