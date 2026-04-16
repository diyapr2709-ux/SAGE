import json
from pathlib import Path
from datetime import datetime
from typing import Any


# =========================
# DATA LOADING
# =========================

def load_json_file(path: str | Path) -> list[dict]:
    file_path = Path(path)
    if not file_path.exists():
        raise FileNotFoundError(f"Dataset file not found: {file_path}")

    with file_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        raise ValueError(f"{file_path} must contain a JSON array.")
    return data


def load_dataset(
    employees_path: str | Path,
    shifts_path: str | Path,
    attendance_path: str | Path,
) -> dict[str, list[dict]]:
    return {
        "employees": load_json_file(employees_path),
        "shifts": load_json_file(shifts_path),
        "attendance": load_json_file(attendance_path),
    }


# =========================
# BASIC HELPERS
# =========================

def time_to_minutes(time_str: str) -> int:
    hours, minutes = map(int, time_str.split(":"))
    return hours * 60 + minutes


def calculate_duration_hours(start_time: str, end_time: str) -> float:
    return (time_to_minutes(end_time) - time_to_minutes(start_time)) / 60.0


def get_day_name(date_str: str) -> str:
    return datetime.strptime(date_str, "%Y-%m-%d").strftime("%A")


def matches_role(employee: dict, required_role: str) -> bool:
    return employee["employee_role"] == required_role


def matches_preference(employee: dict, shift_date: str, shift_start: str, shift_end: str) -> bool:
    shift_day = get_day_name(shift_date)

    if shift_day not in employee["preferred_days"]:
        return False

    shift_start_min = time_to_minutes(shift_start)
    shift_end_min = time_to_minutes(shift_end)
    preferred_start_min = time_to_minutes(employee["preferred_start"])
    preferred_end_min = time_to_minutes(employee["preferred_end"])

    return preferred_start_min <= shift_start_min and shift_end_min <= preferred_end_min


def calculate_worked_hours(clock_in: str, clock_out: str) -> float:
    return calculate_duration_hours(clock_in, clock_out)


# =========================
# ATTENDANCE PROCESSING
# =========================

def build_attendance_summary(attendance_records: list[dict]) -> list[dict]:
    result = []

    for record in attendance_records:
        worked_hours = calculate_worked_hours(record["clock_in"], record["clock_out"])
        result.append(
            {
                "employee_name": record["employee_name"],
                "shift_id": record["shift_id"],
                "clock_in": record["clock_in"],
                "clock_out": record["clock_out"],
                "worked_hours": worked_hours,
            }
        )

    return result


def build_attendance_hours_by_employee(attendance_records: list[dict]) -> dict[str, float]:
    attendance_summary = build_attendance_summary(attendance_records)
    totals: dict[str, float] = {}

    for record in attendance_summary:
        totals.setdefault(record["employee_name"], 0.0)
        totals[record["employee_name"]] += record["worked_hours"]

    return totals


def apply_attendance_to_employees(employees: list[dict], attendance_records: list[dict]) -> list[dict]:
    hours_by_employee = build_attendance_hours_by_employee(attendance_records)
    updated = []

    for employee in employees:
        worked_hours = hours_by_employee.get(employee["name"], 0.0)
        employee_copy = employee.copy()
        employee_copy["attendance_worked_hours"] = worked_hours
        employee_copy["updated_hours_assigned"] = employee["current_hours_assigned"] + worked_hours
        updated.append(employee_copy)

    return updated


# =========================
# SHIFT ELIGIBILITY LOGIC
# =========================

def check_hour_cap(employee: dict, shift_start: str, shift_end: str) -> dict:
    shift_hours = calculate_duration_hours(shift_start, shift_end)
    base_hours = employee.get("updated_hours_assigned", employee["current_hours_assigned"])
    projected_hours = base_hours + shift_hours
    within_hour_cap = projected_hours <= employee["max_hours_per_week"]

    if within_hour_cap:
        hour_cap_note = (
            f"Allowed: projected weekly hours would be {projected_hours:.1f} "
            f"out of {employee['max_hours_per_week']}."
        )
    else:
        hour_cap_note = (
            f"Not allowed: projected weekly hours would be {projected_hours:.1f}, "
            f"which exceeds the limit of {employee['max_hours_per_week']}."
        )

    return {
        "shift_hours": shift_hours,
        "projected_hours": projected_hours,
        "within_hour_cap": within_hour_cap,
        "hour_cap_note": hour_cap_note,
    }


def build_selection_status(role_match: bool, preference_match: bool, within_hour_cap: bool, shift: dict, employee: dict) -> dict:
    if not role_match:
        return {
            "can_select_shift": False,
            "selection_note": (
                f"This shift requires {shift['required_role']}, "
                f"but your role is {employee['employee_role']}."
            ),
        }

    if not preference_match:
        return {
            "can_select_shift": False,
            "selection_note": "This shift does not match your preferred work hours.",
        }

    if not within_hour_cap:
        return {
            "can_select_shift": False,
            "selection_note": "Choosing this shift would exceed your allowed weekly hours.",
        }

    return {
        "can_select_shift": True,
        "selection_note": "You can select this shift.",
    }


def build_employee_shift_view(employee: dict, shifts: list[dict]) -> list[dict]:
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

        selection_result = build_selection_status(
            role_match=role_match,
            preference_match=preference_match,
            within_hour_cap=hour_cap_result["within_hour_cap"],
            shift=shift,
            employee=employee,
        )

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
                "hour_cap_note": hour_cap_result["hour_cap_note"],
                "can_select_shift": selection_result["can_select_shift"],
                "selection_note": selection_result["selection_note"],
            }
        )

    return result


# =========================
# ORCHESTRATOR OUTPUT
# =========================

def build_shift_eligibility_summary(employees: list[dict], employee_views: dict[str, list[dict]], shifts: list[dict]) -> list[dict]:
    shift_summary = []

    for shift in shifts:
        eligible_employees = []
        blocked_employees = []

        for employee in employees:
            employee_name = employee["name"]
            shifts_for_employee = employee_views[employee_name]

            matching_shift = next(
                s for s in shifts_for_employee if s["shift_id"] == shift["shift_id"]
            )

            employee_status = {
                "employee_name": employee_name,
                "can_select_shift": matching_shift["can_select_shift"],
                "selection_note": matching_shift["selection_note"],
            }

            if matching_shift["can_select_shift"]:
                eligible_employees.append(employee_status)
            else:
                blocked_employees.append(employee_status)

        recommended_employee_name = (
            eligible_employees[0]["employee_name"] if eligible_employees else None
        )

        shift_summary.append(
            {
                "shift_id": shift["shift_id"],
                "shift_date": shift["shift_date"],
                "shift_start": shift["shift_start"],
                "shift_end": shift["shift_end"],
                "required_role": shift["required_role"],
                "has_eligible_employee": len(eligible_employees) > 0,
                "recommended_employee_name": recommended_employee_name,
                "eligible_employees": eligible_employees,
                "blocked_employees": blocked_employees,
            }
        )

    return shift_summary


def build_weekly_schedule_output(
    employees: list[dict],
    shifts: list[dict],
    attendance_records: list[dict],
    cluster_name: str = "custom",
) -> dict:
    employees_with_attendance = apply_attendance_to_employees(employees, attendance_records)

    employee_views: dict[str, list[dict]] = {}
    selectable_shift_count = 0
    blocked_shift_count = 0

    for employee in employees_with_attendance:
        shift_view = build_employee_shift_view(employee, shifts)
        employee_views[employee["name"]] = shift_view

        for shift in shift_view:
            if shift["can_select_shift"]:
                selectable_shift_count += 1
            else:
                blocked_shift_count += 1

    shift_eligibility_summary = build_shift_eligibility_summary(
        employees_with_attendance,
        employee_views,
        shifts,
    )

    week_start = min(shift["shift_date"] for shift in shifts) if shifts else None

    return {
        "cluster": cluster_name,
        "week_start": week_start,
        "open_shifts": shifts,
        "attendance_summary": build_attendance_summary(attendance_records),
        "employees_after_attendance": employees_with_attendance,
        "employee_views": employee_views,
        "shift_eligibility_summary": shift_eligibility_summary,
        "summary": {
            "total_open_shifts": len(shifts),
            "total_employees": len(employees),
            "selectable_shift_count": selectable_shift_count,
            "blocked_shift_count": blocked_shift_count,
        },
    }


# =========================
# MAIN RUNNER
# =========================

if __name__ == "__main__":
    # Change these paths to your teammate's custom dataset files.
    employees_file = "data/employees.json"
    shifts_file = "data/shifts.json"
    attendance_file = "data/attendance.json"

    dataset = load_dataset(
        employees_path=employees_file,
        shifts_path=shifts_file,
        attendance_path=attendance_file,
    )

    output = build_weekly_schedule_output(
        employees=dataset["employees"],
        shifts=dataset["shifts"],
        attendance_records=dataset["attendance"],
        cluster_name="custom_dataset",
    )
    print("CREW AGENT OUTPUT:")
    
    print(json.dumps(output, indent=4))