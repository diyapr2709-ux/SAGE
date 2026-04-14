import pytest
from sage.agents.shelf_stub import run_shelf_stub


def test_shelf_stub_keys():
    result = run_shelf_stub()

    assert "item_id" in result
    assert "margin_pct" in result
    assert "flag" in result
    assert "recommended_action" in result
    assert "impact" in result


def test_shelf_stub_types():
    result = run_shelf_stub()

    assert isinstance(result["item_id"], str)
    assert isinstance(result["margin_pct"], float)
    assert isinstance(result["flag"], bool)
    assert isinstance(result["recommended_action"], str)
    assert isinstance(result["impact"], float)


def test_shelf_scenarios():
    flagged = run_shelf_stub("price_increase_flag")
    healthy = run_shelf_stub("healthy_margin")
    critical = run_shelf_stub("critical_margin_drop")

    assert flagged["flag"] is True
    assert healthy["flag"] is False
    assert critical["flag"] is True


def test_shelf_invalid_scenario():
    with pytest.raises(ValueError):
        run_shelf_stub("bad_scenario")