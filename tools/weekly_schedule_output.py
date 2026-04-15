import json
from sage.tools.weekly_shifts import get_weekly_open_shifts
from sage.tools.employee_shift_view import get_sample_employees, build_employee_shift_view


def build_shift_eligibility_summary(employees: list[dict], employee_views: dict, cluster: str) -> list[dict]:
    open_shifts = get_weekly_open_shifts(cluster)
    shift_summary = []

    for shift in open_shifts:
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

        shift_summary.append(
            {
                "shift_id": shift["shift_id"],
                "shift_date": shift["shift_date"],
                "shift_start": shift["shift_start"],
                "shift_end": shift["shift_end"],
                "required_role": shift["required_role"],
                "has_eligible_employee": len(eligible_employees) > 0,
                "eligible_employees": eligible_employees,
                "blocked_employees": blocked_employees,
            }
        )

    return shift_summary


def build_weekly_schedule_output(cluster: str = "A") -> dict:
    employees = get_sample_employees(cluster)
    open_shifts = get_weekly_open_shifts(cluster)

    employee_views = {}
    selectable_shift_count = 0
    blocked_shift_count = 0

    for employee in employees:
        shift_view = build_employee_shift_view(employee, cluster)
        employee_views[employee["name"]] = shift_view

        for shift in shift_view:
            if shift["can_select_shift"]:
                selectable_shift_count += 1
            else:
                blocked_shift_count += 1

    shift_eligibility_summary = build_shift_eligibility_summary(
        employees, employee_views, cluster
    )

    return {
        "cluster": cluster,
        "week_start": "2026-04-17",
        "open_shifts": open_shifts,
        "employee_views": employee_views,
        "shift_eligibility_summary": shift_eligibility_summary,
        "summary": {
            "total_open_shifts": len(open_shifts),
            "total_employees": len(employees),
            "selectable_shift_count": selectable_shift_count,
            "blocked_shift_count": blocked_shift_count,
        },
    }


if __name__ == "__main__":
    print("CLUSTER A WEEKLY SCHEDULE OUTPUT:")
    print(json.dumps(build_weekly_schedule_output("A"), indent=4))

    print("\nCLUSTER B WEEKLY SCHEDULE OUTPUT:")
    print(json.dumps(build_weekly_schedule_output("B"), indent=4))