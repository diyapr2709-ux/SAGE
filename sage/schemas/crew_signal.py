import json
from pydantic import BaseModel


class EmployeeAssignment(BaseModel):
    name: str
    employee_type: str
    employee_role: str
    preferred_days: list[str]
    preferred_start: str
    preferred_end: str
    max_hours_per_week: int


class CrewSignal(BaseModel):
    shift_id: str
    shift_date: str
    shift_start: str
    shift_end: str
    staffing_status: str
    adjustment: str
    financial_impact: float
    employees: list[EmployeeAssignment]
    preference_summary: str = ""


if __name__ == "__main__":
    sample = CrewSignal(
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
                preferred_days=["Friday", "Saturday", "Sunday"],
                preferred_start="16:00",
                preferred_end="22:00",
                max_hours_per_week=20,
            ),
            EmployeeAssignment(
                name="Michael Rivera",
                employee_type="full_time",
                employee_role="shift_supervisor",
                preferred_days=["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                preferred_start="09:00",
                preferred_end="18:00",
                max_hours_per_week=40,
            ),
        ],
    )
    print(json.dumps(sample.model_dump(), indent=4))