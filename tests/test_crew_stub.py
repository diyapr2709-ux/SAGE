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


def test_crew_employee_structure():
    result = run_crew_stub()
    assert len(result["employees"]) > 0

    first_employee = result["employees"][0]
    assert "name" in first_employee
    assert "employee_type" in first_employee
    assert "employee_role" in first_employee

    assert isinstance(first_employee["name"], str)
    assert isinstance(first_employee["employee_type"], str)
    assert isinstance(first_employee["employee_role"], str)


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


def test_crew_invalid_scenario():
    with pytest.raises(ValueError):
        run_crew_stub("random_bad_scenario")