from sage.agents.pulse import (
    generate_mock_data,
    emit_pulse_signal,
    is_open,
    BusinessConfig,
    MARATHON_DELI
)
import pandas as pd


def test_forecast_length():
    signal = emit_pulse_signal(MARATHON_DELI)
    assert len(signal["forecast_72hr"]) == 72


def test_schema_keys():
    signal = emit_pulse_signal(MARATHON_DELI)
    assert all(k in signal for k in ["forecast_72hr", "deviation_pct", "alert", "financial_impact"])


def test_closed_hours_zero_revenue():
    df = generate_mock_data(MARATHON_DELI)
    closed = df[df["ds"].dt.hour == 6]  # 6am, marathon deli is closed
    assert (closed["y"] == 0.0).all()


def test_late_night_higher_than_daytime():
    df = generate_mock_data(MARATHON_DELI)
    late_night = df[df["ds"].dt.hour == 23]["y"].mean()
    daytime = df[df["ds"].dt.hour == 14]["y"].mean()
    assert late_night > daytime


def test_custom_business_config():
    cafe = BusinessConfig(
        name="Test Cafe",
        type="cafe",
        open_hour=7,
        close_hour=20,
        peak_hours=[8, 9, 12, 13],
        base_hourly_revenue=80.0,
        weekday_multipliers={i: 1.0 for i in range(7)}
    )
    df = generate_mock_data(cafe)
    closed = df[df["ds"].dt.hour == 3]["y"]  # 3am, cafe closed
    assert (closed == 0.0).all()


def test_is_open_midnight_wrap():
    # marathon deli open 11am-3am next day
    assert is_open(pd.Timestamp("2026-04-14 23:00"), MARATHON_DELI)
    assert is_open(pd.Timestamp("2026-04-14 02:00"), MARATHON_DELI)
    assert not is_open(pd.Timestamp("2026-04-14 06:00"), MARATHON_DELI)