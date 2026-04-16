import json
from sage.tools.employee_shift_view import get_sample_employees
from sage.tools.attendance import build_attendance_summary


def apply_attendance_to_employees(cluster: str = "A") -> list[dict]:
    employees = get_sample_employees(cluster)
    attendance = build_attendance_summary(cluster)

    attendance_by_employee = {}
    for record in attendance:
        attendance_by_employee.setdefault(record["employee_name"], 0.0)
        attendance_by_employee[record["employee_name"]] += record["worked_hours"]

    updated = []
    for employee in employees:
        worked_hours = attendance_by_employee.get(employee["name"], 0.0)
        employee_copy = employee.copy()
        employee_copy["attendance_worked_hours"] = worked_hours
        employee_copy["updated_hours_assigned"] = employee["current_hours_assigned"] + worked_hours
        updated.append(employee_copy)

    return updated


if __name__ == "__main__":
    print("CLUSTER A UPDATED HOURS:")
    print(json.dumps(apply_attendance_to_employees("A"), indent=4))

    print("\nCLUSTER B UPDATED HOURS:")
    print(json.dumps(apply_attendance_to_employees("B"), indent=4))