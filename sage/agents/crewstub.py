from sage.schemas.crew_signal import CrewSignal

def run_crew_stub():
    signal = CrewSignal(
        shift_id="fri_evening_01",
        staffing_status="understaffed",
        adjustment="Add 1 cashier from 5 PM to 8 PM",
        financial_impact=140.0
    )
    return signal.model_dump()
  
