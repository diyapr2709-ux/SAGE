import pytest
from sage.agents.crew_stub import run_crew_stub


def test_crew_stub_keys():
    result = run_crew_stub()

    assert "shift_id" in result
    assert "shift_date" in result
    assert "shift_start" in result
    assert "shift_end" in result
    assert "staffing_status" in result
    assert "adjustment" in result
    assert "financial_impact" in result
    assert "employees" in result
    assert "preference_summary" in result


def test_crew_stub_types():
    result = run_crew_stub()

    assert isinstance(result["shift_id"], str)
    assert isinstance(result["shift_date"], str)
    assert isinstance(result["shift_start"], str)
    assert isinstance(result["shift_end"], str)
    assert isinstance(result["staffing_status"], str)
    assert isinstance(result["adjustment"], str)
    assert isinstance(result["financial_impact"], float)
    assert isinstance(result["employees"], list)
    assert isinstance(result["preference_summary"], str)


def test_crew_employee_structure():
    result = run_crew_stub()
    assert len(result["employees"]) > 0

    first_employee = result["employees"][0]

    assert "name" in first_employee
    assert "employee_type" in first_employee
    assert "employee_role" in first_employee
    assert "preferred_days" in first_employee
    assert "preferred_start" in first_employee
    assert "preferred_end" in first_employee
    assert "max_hours_per_week" in first_employee
    assert "current_hours_assigned" in first_employee
    assert "preference_match" in first_employee
    assert "shift_hours" in first_employee
    assert "projected_hours" in first_employee
    assert "within_hour_cap" in first_employee
    assert "hour_cap_note" in first_employee
    assert "can_select_shift" in first_employee
    assert "selection_note" in first_employee

    assert isinstance(first_employee["name"], str)
    assert isinstance(first_employee["employee_type"], str)
    assert isinstance(first_employee["employee_role"], str)
    assert isinstance(first_employee["preferred_days"], list)
    assert isinstance(first_employee["preferred_start"], str)
    assert isinstance(first_employee["preferred_end"], str)
    assert isinstance(first_employee["max_hours_per_week"], int)
    assert isinstance(first_employee["current_hours_assigned"], int)
    assert isinstance(first_employee["preference_match"], bool)
    assert isinstance(first_employee["shift_hours"], float)
    assert isinstance(first_employee["projected_hours"], float)
    assert isinstance(first_employee["within_hour_cap"], bool)
    assert isinstance(first_employee["hour_cap_note"], str)
    assert isinstance(first_employee["can_select_shift"], bool)
    assert isinstance(first_employee["selection_note"], str)


def test_crew_scenarios():
    under = run_crew_stub("understaffed_evening")
    over = run_crew_stub("overstaffed_morning")
    balanced = run_crew_stub("balanced_afternoon")

    assert under["staffing_status"] == "understaffed"
    assert over["staffing_status"] == "overstaffed"
    assert balanced["staffing_status"] == "balanced"

    assert len(under["employees"]) == 2
    assert len(over["employees"]) == 2
    assert len(balanced["employees"]) == 3


def test_crew_preference_matches():
    under = run_crew_stub("understaffed_evening")
    over = run_crew_stub("overstaffed_morning")
    balanced = run_crew_stub("balanced_afternoon")

    assert under["employees"][0]["preference_match"] is True
    assert under["employees"][1]["preference_match"] is False

    assert over["employees"][0]["preference_match"] is False
    assert over["employees"][1]["preference_match"] is True

    assert balanced["employees"][0]["preference_match"] is True
    assert balanced["employees"][1]["preference_match"] is True
    assert balanced["employees"][2]["preference_match"] is True


def test_crew_preference_summary():
    under = run_crew_stub("understaffed_evening")
    over = run_crew_stub("overstaffed_morning")
    balanced = run_crew_stub("balanced_afternoon")

    assert under["preference_summary"] == "1 of 2 employees match their preferred hours"
    assert over["preference_summary"] == "1 of 2 employees match their preferred hours"
    assert balanced["preference_summary"] == "3 of 3 employees match their preferred hours"


def test_crew_hour_cap_and_selection():
    under = run_crew_stub("understaffed_evening")
    over = run_crew_stub("overstaffed_morning")
    balanced = run_crew_stub("balanced_afternoon")

    assert under["employees"][0]["within_hour_cap"] is True
    assert under["employees"][0]["can_select_shift"] is True
    assert under["employees"][0]["selection_note"] == "You can select this shift."

    assert under["employees"][1]["within_hour_cap"] is False
    assert under["employees"][1]["can_select_shift"] is False
    assert under["employees"][1]["selection_note"] == "This shift does not match your preferred work hours."

    assert over["employees"][0]["within_hour_cap"] is False
    assert over["employees"][0]["can_select_shift"] is False

    assert over["employees"][1]["within_hour_cap"] is True
    assert over["employees"][1]["can_select_shift"] is True

    assert balanced["employees"][2]["within_hour_cap"] is False
    assert balanced["employees"][2]["can_select_shift"] is False
    assert balanced["employees"][2]["selection_note"] == "Choosing this shift would exceed your allowed weekly hours."


def test_crew_invalid_scenario():
    with pytest.raises(ValueError):
        run_crew_stub("random_bad_scenario")