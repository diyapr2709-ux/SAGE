from pydantic import BaseModel


class EmployeeAssignment(BaseModel):
    name: str
    employee_type: str
    employee_role: str


class CrewSignal(BaseModel):
    shift_id: str
    shift_date: str
    shift_start: str
    shift_end: str
    staffing_status: str
    adjustment: str
    financial_impact: float
    employees: list[EmployeeAssignment]


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
            ),
            EmployeeAssignment(
                name="Michael Rivera",
                employee_type="full_time",
                employee_role="shift_supervisor",
            ),
        ],
    )
    print(sample.model_dump())