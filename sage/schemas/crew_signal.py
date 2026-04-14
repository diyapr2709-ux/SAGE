from pydantic import BaseModel


class CrewSignal(BaseModel):
    shift_id: str
    staffing_status: str
    adjustment: str
    financial_impact: float


if __name__ == "__main__":
    sample = CrewSignal(
        shift_id="fri_evening_01",
        staffing_status="understaffed",
        adjustment="Add 1 cashier from 5 PM to 8 PM",
        financial_impact=140.0,
    )
    print(sample.model_dump())