import pandas as pd
import numpy as np
from statsforecast import StatsForecast
from statsforecast.models import MSTL
from langchain_core.tools import tool
from dataclasses import dataclass, field
from datetime import datetime, timedelta


@dataclass
class RevenueGoal:
    daily_target: float
    weekly_target: float


@dataclass
class BusinessConfig:
    name: str
    type: str
    open_hour: int
    close_hour: int
    peak_hours: list[int]
    base_hourly_revenue: float
    weekday_multipliers: dict
    goals: RevenueGoal = field(default_factory=lambda: RevenueGoal(3000.0, 18000.0))


MARATHON_DELI = BusinessConfig(
    name="Marathon Deli",
    type="restaurant",
    open_hour=11,
    close_hour=3,
    peak_hours=[22, 23, 0, 1, 2],
    base_hourly_revenue=150.0,
    weekday_multipliers={
        0: 0.8,
        1: 0.8,
        2: 0.9,
        3: 1.3,
        4: 1.6,
        5: 1.7,
        6: 0.9
    },
    goals=RevenueGoal(
        daily_target=3000.0,
        weekly_target=18000.0
    )
)


def is_open(ts: pd.Timestamp, config: BusinessConfig) -> bool:
    h = ts.hour
    if config.close_hour < config.open_hour:
        return h >= config.open_hour or h < config.close_hour
    return config.open_hour <= h < config.close_hour


def hour_multiplier(ts: pd.Timestamp, config: BusinessConfig) -> float:
    h = ts.hour
    if not is_open(ts, config):
        return 0.0
    if h in config.peak_hours:
        return 2.8
    peak_adjacent = set()
    for p in config.peak_hours:
        peak_adjacent.add((p - 1) % 24)
        peak_adjacent.add((p + 1) % 24)
    if h in peak_adjacent - set(config.peak_hours):
        return 1.6
    return 0.9


def generate_mock_data(config: BusinessConfig = MARATHON_DELI) -> pd.DataFrame:
    dates = pd.date_range(end=pd.Timestamp.today(), periods=90 * 24, freq="h")
    np.random.seed(42)

    revenue = []
    for ts in dates:
        base = config.base_hourly_revenue
        base *= hour_multiplier(ts, config)
        base *= config.weekday_multipliers.get(ts.dayofweek, 1.0)
        if base > 0:
            noise = np.random.normal(0, base * 0.1)
            revenue.append(max(0, base + noise))
        else:
            revenue.append(0.0)

    df = pd.DataFrame({
        "unique_id": config.name.lower().replace(" ", "_"),
        "ds": dates,
        "y": revenue
    })
    return df


def predict_rush_hours(forecast: pd.DataFrame, config: BusinessConfig) -> list[dict]:
    fc = forecast.copy()
    fc["ds"] = pd.to_datetime(fc["ds"])
    fc = fc[fc.apply(lambda r: is_open(r["ds"], config), axis=1)]

    fc["window"] = fc["ds"].dt.floor("2h")
    windows = fc.groupby("window")["MSTL"].sum().reset_index()
    windows.columns = ["window_start", "expected_revenue"]

    top3 = windows.nlargest(3, "expected_revenue")

    rush_hours = []
    for _, row in top3.iterrows():
        window_end = row["window_start"] + timedelta(hours=2)
        rush_hours.append({
            "window": f"{row['window_start'].strftime('%a %b %d %I:%M %p')} - {window_end.strftime('%I:%M %p')}",
            "expected_revenue": round(float(row["expected_revenue"]), 2),
            "urgency": "high" if row["expected_revenue"] > config.base_hourly_revenue * 4 else "medium"
        })

    return rush_hours


def track_goals(df: pd.DataFrame, forecast: pd.DataFrame, config: BusinessConfig) -> dict:
    today = pd.Timestamp.today().normalize()
    week_start = today - timedelta(days=today.dayofweek)

    today_actual = df[df["ds"].dt.normalize() == today]["y"].sum()
    remaining_today = forecast[
        (forecast["ds"].dt.normalize() == today) &
        (forecast["ds"] > pd.Timestamp.now())
    ]["MSTL"].sum()
    projected_today = today_actual + remaining_today

    week_actual = df[df["ds"].dt.normalize() >= week_start]["y"].sum()
    remaining_week = forecast[forecast["ds"].dt.normalize() >= week_start]["MSTL"].sum()
    projected_week = week_actual + remaining_week

    daily_gap = config.goals.daily_target - projected_today
    weekly_gap = config.goals.weekly_target - projected_week

    return {
        "daily": {
            "target": config.goals.daily_target,
            "actual_so_far": round(today_actual, 2),
            "projected": round(projected_today, 2),
            "gap": round(daily_gap, 2),
            "on_pace": daily_gap <= 0
        },
        "weekly": {
            "target": config.goals.weekly_target,
            "actual_so_far": round(week_actual, 2),
            "projected": round(projected_week, 2),
            "gap": round(weekly_gap, 2),
            "on_pace": weekly_gap <= 0
        }
    }


def generate_summary(goals: dict, rush_hours: list[dict], deviation_pct: float, alert: bool) -> str:
    lines = []
    lines.append(f"PULSE BRIEFING — {datetime.now().strftime('%A %b %d, %I:%M %p')}")
    lines.append("")

    d = goals["daily"]
    w = goals["weekly"]

    pace_icon = "✅" if d["on_pace"] else "⚠️"
    lines.append(f"{pace_icon} TODAY: ${d['actual_so_far']} earned, ${d['projected']} projected vs ${d['target']} target")
    if not d["on_pace"]:
        lines.append(f"   Behind by ${abs(d['gap'])} — push a promo or prep for late night surge")

    pace_icon = "✅" if w["on_pace"] else "⚠️"
    lines.append(f"{pace_icon} THIS WEEK: ${w['actual_so_far']} earned, ${w['projected']} projected vs ${w['target']} target")
    lines.append("")

    if alert:
        lines.append(f"🚨 ANOMALY: Revenue is {round(deviation_pct*100, 1)}% off expected pattern — investigate immediately")
        lines.append("")

    lines.append("⏰ PREDICTED RUSH WINDOWS (next 72hrs):")
    for r in rush_hours:
        lines.append(f"   {r['window']} — ${r['expected_revenue']} expected [{r['urgency'].upper()}]")

    return "\n".join(lines)


def emit_pulse_signal(config: BusinessConfig = MARATHON_DELI) -> dict:
    df = generate_mock_data(config)

    sf = StatsForecast(models=[MSTL(season_length=24)], freq="h")
    sf.fit(df)
    forecast = sf.predict(h=72)

    history = df.iloc[:-72].copy()
    sf2 = StatsForecast(models=[MSTL(season_length=24)], freq="h")
    sf2.fit(history)
    expected = sf2.predict(h=72)

    actual_mean = df.iloc[-72:]["y"].mean()
    expected_mean = expected["MSTL"].mean()
    deviation_pct = abs(actual_mean - expected_mean) / (expected_mean + 1e-9)
    alert = deviation_pct > 0.10
    financial_impact = deviation_pct * expected["MSTL"].sum()

    rush_hours = predict_rush_hours(forecast, config)
    goals = track_goals(df, forecast, config)
    summary = generate_summary(goals, rush_hours, deviation_pct, alert)

    return {
        "forecast_72hr": forecast["MSTL"].tolist(),
        "deviation_pct": round(float(deviation_pct), 4),
        "alert": bool(alert),
        "financial_impact": round(float(financial_impact), 2),
        "rush_hours": rush_hours,
        "goals": goals,
        "summary": summary
    }


@tool
def pulse_tool(input: str) -> dict:
    """Run PULSE revenue forecast, goal tracking, rush hour prediction and anomaly detection."""
    return emit_pulse_signal(MARATHON_DELI)