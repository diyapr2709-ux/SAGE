from pydantic import BaseModel

class CrewSignal(BaseModel):
    shift_id: str
    staffing_status: str
    adjustment: str
    financial_impact: float
