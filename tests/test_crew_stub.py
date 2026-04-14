import pytest
from sage.agents.crew_stub import run_crew_stub


def test_crew_stub_keys():
    result = run_crew_stub()

    assert "shift_id" in result
    assert "staffing_status" in result
    assert "adjustment" in result
    assert "financial_impact" in result


def test_crew_stub_types():
    result = run_crew_stub()

    assert isinstance(result["shift_id"], str)
    assert isinstance(result["staffing_status"], str)
    assert isinstance(result["adjustment"], str)
    assert isinstance(result["financial_impact"], float)


def test_crew_scenarios():
    under = run_crew_stub("understaffed_evening")
    over = run_crew_stub("overstaffed_morning")
    balanced = run_crew_stub("balanced_afternoon")

    assert under["staffing_status"] == "understaffed"
    assert over["staffing_status"] == "overstaffed"
    assert balanced["staffing_status"] == "balanced"

def test_crew_invalid_scenario():
    with pytest.raises(ValueError):
        run_crew_stub("random_bad_scenario")