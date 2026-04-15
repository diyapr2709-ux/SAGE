import json
from sage.data.cluster_a_data import get_cluster_a_employees
from sage.data.cluster_b_data import get_cluster_b_employees
from sage.tools.weekly_shifts import get_weekly_open_shifts
from sage.tools.crew_preferences import matches_preference
from sage.tools.crew_hours import check_hour_cap


def get_sample_employees(cluster: str = "A") -> list[dict]:
    if cluster == "A":
        return get_cluster_a_employees()
    if cluster == "B":
        return get_cluster_b_employees()
    raise ValueError("cluster must be 'A' or 'B'")


def matches_role(employee: dict, required_role: str) -> bool:
    return employee["employee_role"] == required_role


def build_employee_shift_view(employee: dict, cluster: str = "A") -> list[dict]:
    shifts = get_weekly_open_shifts(cluster)
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


if __name__ == "__main__":
    print("CLUSTER A EMPLOYEE SHIFT VIEWS:")
    for employee in get_sample_employees("A"):
        print(f"\nEMPLOYEE SHIFT VIEW: {employee['name']}")
        print(json.dumps(build_employee_shift_view(employee, "A"), indent=4))

    print("\nCLUSTER B EMPLOYEE SHIFT VIEWS:")
    for employee in get_sample_employees("B"):
        print(f"\nEMPLOYEE SHIFT VIEW: {employee['name']}")
        print(json.dumps(build_employee_shift_view(employee, "B"), indent=4))