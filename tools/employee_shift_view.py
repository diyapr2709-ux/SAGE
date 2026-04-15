import json
from sage.tools.weekly_shifts import get_weekly_open_shifts
from sage.tools.crew_preferences import matches_preference
from sage.tools.crew_hours import check_hour_cap

def matches_role(employee: dict, required_role: str) -> bool:
    return employee["employee_role"] == required_role


def build_employee_shift_view(employee: dict) -> list[dict]:
    shifts = get_weekly_open_shifts()
    result = []

    for shift in shifts:
        role_match = matches_role(employee, shift["required_role"])

        preference_match = matches_preference(
            employee,
            shift["shift_date"],
            shift["shift_start"],
            shift["shift_end"],
        )

        hour_cap_result = check_hour_cap(
            employee,
            shift["shift_start"],
            shift["shift_end"],
        )

        if not role_match:
            can_select_shift = False
            selection_note = (
                f"This shift requires {shift['required_role']}, "
                f"but your role is {employee['employee_role']}."
            )
        elif not preference_match:
            can_select_shift = False
            selection_note = "This shift does not match your preferred work hours."
        elif not hour_cap_result["within_hour_cap"]:
            can_select_shift = False
            selection_note = "Choosing this shift would exceed your allowed weekly hours."
        else:
            can_select_shift = True
            selection_note = "You can select this shift."

        result.append(
            {
                "shift_id": shift["shift_id"],
                "shift_date": shift["shift_date"],
                "shift_start": shift["shift_start"],
                "shift_end": shift["shift_end"],
                "required_role": shift["required_role"],
                "role_match": role_match,
                "preference_match": preference_match,
                "shift_hours": hour_cap_result["shift_hours"],
                "projected_hours": hour_cap_result["projected_hours"],
                "within_hour_cap": hour_cap_result["within_hour_cap"],
                "can_select_shift": can_select_shift,
                "selection_note": selection_note,
            }
        )

    return result


def get_sample_employees() -> list[dict]:
    return [
        {
            "name": "Aarav Patel",
            "employee_type": "part_time",
            "employee_role": "cashier",
            "preferred_days": ["Friday", "Saturday", "Sunday"],
            "preferred_start": "16:00",
            "preferred_end": "22:00",
            "max_hours_per_week": 20,
            "current_hours_assigned": 14,
        },
        {
            "name": "Emily Chen",
            "employee_type": "student_worker",
            "employee_role": "front_desk",
            "preferred_days": ["Monday", "Wednesday", "Friday"],
            "preferred_start": "10:00",
            "preferred_end": "16:00",
            "max_hours_per_week": 15,
            "current_hours_assigned": 15,
        },
        {
            "name": "Daniel Brooks",
            "employee_type": "part_time",
            "employee_role": "cashier",
            "preferred_days": ["Monday", "Tuesday", "Thursday"],
            "preferred_start": "08:00",
            "preferred_end": "14:00",
            "max_hours_per_week": 25,
            "current_hours_assigned": 22,
        },
    ]


if __name__ == "__main__":
    for employee in get_sample_employees():
        print(f"\nEMPLOYEE SHIFT VIEW: {employee['name']}")
        print(json.dumps(build_employee_shift_view(employee), indent=4))