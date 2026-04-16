import json
from sage.tools.crew_preferences import time_to_minutes
from sage.data.attendance_data import get_sample_attendance_records


def calculate_worked_hours(clock_in: str, clock_out: str) -> float:
    start_minutes = time_to_minutes(clock_in)
    end_minutes = time_to_minutes(clock_out)
    return (end_minutes - start_minutes) / 60


def build_attendance_summary(cluster: str = "A") -> list[dict]:
    records = get_sample_attendance_records(cluster)
    result = []

    for record in records:
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


if __name__ == "__main__":
    print("CLUSTER A ATTENDANCE:")
    print(json.dumps(build_attendance_summary("A"), indent=4))

    print("\nCLUSTER B ATTENDANCE:")
    print(json.dumps(build_attendance_summary("B"), indent=4))