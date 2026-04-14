import pytest
from sage.tools.demo_payload import build_demo_payload


def test_demo_payload_keys():
    payload = build_demo_payload()

    assert "crew" in payload
    assert "shelf" in payload


def test_demo_payload_alert_mode():
    payload = build_demo_payload("alert_mode")

    assert payload["crew"]["staffing_status"] == "understaffed"
    assert payload["shelf"]["flag"] is True


def test_demo_payload_calm_mode():
    payload = build_demo_payload("calm_mode")

    assert payload["crew"]["staffing_status"] == "balanced"
    assert payload["shelf"]["flag"] is False


def test_demo_payload_critical_mode():
    payload = build_demo_payload("critical_mode")

    assert payload["crew"]["staffing_status"] == "overstaffed"
    assert payload["shelf"]["flag"] is True


def test_demo_payload_invalid_mode():
    with pytest.raises(ValueError):
        build_demo_payload("bad_mode")


from sage.tools.demo_payload import build_frank_inputs

def test_build_frank_inputs_structure():
    result = build_frank_inputs("alert_mode")

    assert isinstance(result, list)
    assert len(result) == 2
    assert result[0]["agent"] == "CREW"
    assert result[1]["agent"] == "SHELF"


def test_build_frank_inputs_data_keys():
    result = build_frank_inputs("alert_mode")

    assert "shift_id" in result[0]["data"]
    assert "item_id" in result[1]["data"]