"""
outcome_tracker.py — Closes the recommendation feedback loop.

When the CEO approves a recommendation, we record the expected outcome
(what metric should change, by how much, and in which direction).

On the next FRANK refresh cycle (~30 min), we compare the new dataset
snapshot against the expectation. If the expected signal materialised,
we feed a positive delayed reward to the bandit arm. If not, a penalty.

This turns SAGE from a system that learns from stated preferences into
one that learns from observed outcomes — a form of offline RL / delayed
reward bandits.

Outcome types tracked:
    "cost_reduction"    → flagged_item monthly_spend should decrease
    "staffing_fix"      → shift staffing_status should become "balanced"
    "review_response"   → avg_rating should not worsen on next cycle
    "revenue_recovery"  → deviation_pct should decrease
    "compliance_fix"    → compliance_alerts count should decrease
"""

import json
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List, Optional

_ROOT          = Path(__file__).resolve().parent.parent.parent
_OUTCOMES_PATH = _ROOT / "sage/data/pending_outcomes.json"

# How many refresh cycles to wait before measuring
MEASUREMENT_WINDOW_MINUTES = 60   # 2 refresh cycles
# Threshold for "change detected"
CHANGE_THRESHOLD_PCT = 0.03       # 3% change considered meaningful


@dataclass
class PendingOutcome:
    recommendation_id: str
    category:          str
    agent:             str
    urgency:           str
    action_taken:      str          # what the CEO approved
    outcome_type:      str          # cost_reduction | staffing_fix | etc.
    baseline_value:    float        # metric value at approval time
    expected_direction: str         # "decrease" | "increase" | "stable"
    approved_at:       str          # ISO-8601
    measure_after:     str          # ISO-8601 — earliest time to measure
    measured:          bool = False
    confirmed:         Optional[bool] = None
    measured_value:    Optional[float] = None
    measured_at:       Optional[str]   = None


def _load() -> List[PendingOutcome]:
    try:
        if _OUTCOMES_PATH.exists():
            raw = json.loads(_OUTCOMES_PATH.read_text())
            return [PendingOutcome(**o) for o in raw]
    except Exception:
        pass
    return []


def _save(outcomes: List[PendingOutcome]):
    _OUTCOMES_PATH.parent.mkdir(parents=True, exist_ok=True)
    _OUTCOMES_PATH.write_text(json.dumps([asdict(o) for o in outcomes], indent=2))


def _infer_outcome(rec: dict) -> Optional[tuple]:
    """
    Given a recommendation dict, infer (outcome_type, baseline_key, direction).
    Returns None if outcome cannot be automatically measured.
    """
    cat  = rec.get("category", "")
    agent = rec.get("agent", "")
    title = (rec.get("title", "") + " " + rec.get("description", "")).lower()

    if cat == "cost" or "overtime" in title or "cost" in title or agent == "SHELF":
        return "cost_reduction", rec.get("impact", 0), "decrease"
    if cat == "staffing" or agent == "CREW":
        return "staffing_fix", 1.0, "decrease"   # 1.0 = unbalanced, 0.0 = balanced
    if cat == "reputation" or agent == "VOICE":
        return "review_response", rec.get("impact", 0), "stable"
    if cat == "revenue" or agent == "PULSE":
        return "revenue_recovery", rec.get("impact", 0), "decrease"
    if cat == "compliance" or "health" in title or "safety" in title:
        return "compliance_fix", 1.0, "decrease"

    return None


def record_approved_outcome(rec: dict):
    """
    Call when the CEO approves a recommendation.
    Records a PendingOutcome that will be evaluated on the next refresh cycle.
    """
    outcome_info = _infer_outcome(rec)
    if not outcome_info:
        return

    outcome_type, baseline, direction = outcome_info
    now = datetime.now(timezone.utc)

    pending = PendingOutcome(
        recommendation_id=rec.get("id", "unknown"),
        category=rec.get("category", ""),
        agent=rec.get("agent", ""),
        urgency=rec.get("urgency", "medium"),
        action_taken=rec.get("title", ""),
        outcome_type=outcome_type,
        baseline_value=float(baseline or 0),
        expected_direction=direction,
        approved_at=now.isoformat(),
        measure_after=(now + timedelta(minutes=MEASUREMENT_WINDOW_MINUTES)).isoformat(),
    )

    outcomes = _load()
    # Avoid duplicates
    existing_ids = {o.recommendation_id for o in outcomes if not o.measured}
    if pending.recommendation_id not in existing_ids:
        outcomes.append(pending)
        _save(outcomes)


def evaluate_pending_outcomes(fresh_dataset: dict) -> List[dict]:
    """
    Called on every refresh cycle.
    Checks pending outcomes that are past their measure_after time.
    Returns list of measurement results for logging/API.
    Feeds confirmed/missed signals back into the bandit.
    """
    from sage.preferences.bandit import apply_outcome

    outcomes = _load()
    now = datetime.now(timezone.utc)
    results = []

    for outcome in outcomes:
        if outcome.measured:
            continue

        try:
            measure_after = datetime.fromisoformat(outcome.measure_after)
            if measure_after.tzinfo is None:
                measure_after = measure_after.replace(tzinfo=timezone.utc)
        except Exception:
            continue

        if now < measure_after:
            continue

        # Time to measure
        confirmed, measured_val = _measure(outcome, fresh_dataset)
        outcome.measured      = True
        outcome.confirmed     = confirmed
        outcome.measured_value = measured_val
        outcome.measured_at   = now.isoformat()

        # Feed back into bandit
        apply_outcome(
            category=outcome.category,
            agent=outcome.agent,
            urgency=outcome.urgency,
            confirmed=confirmed,
        )

        results.append({
            "recommendation_id": outcome.recommendation_id,
            "action_taken":      outcome.action_taken[:60],
            "outcome_type":      outcome.outcome_type,
            "baseline":          outcome.baseline_value,
            "measured":          measured_val,
            "confirmed":         confirmed,
            "direction":         outcome.expected_direction,
        })

    _save(outcomes)
    return results


def _measure(outcome: PendingOutcome, dataset: dict) -> tuple:
    """
    Extract the relevant metric from the fresh dataset and compare to baseline.
    Returns (confirmed: bool, measured_value: float).
    """
    llm = dataset.get("llm_outputs", {})
    shelf = llm.get("shelf", {})
    voice = llm.get("voice", {})

    try:
        if outcome.outcome_type == "cost_reduction":
            # Check total monthly flagged spend
            ci = shelf.get("cost_intelligence", {})
            current = float(ci.get("total_monthly_flagged", outcome.baseline_value))
            pct_change = (outcome.baseline_value - current) / (outcome.baseline_value + 1)
            confirmed = pct_change >= CHANGE_THRESHOLD_PCT
            return confirmed, round(current, 2)

        elif outcome.outcome_type == "staffing_fix":
            # Check if any shift moved to balanced
            crew = dataset.get("crew_snapshot", {})
            shifts = crew.get("shifts", [])
            balanced = sum(1 for s in shifts if s.get("staffing_status") == "balanced")
            confirmed = balanced > 0
            return confirmed, float(balanced)

        elif outcome.outcome_type == "review_response":
            # Check avg_rating didn't worsen
            current_rating = float(voice.get("avg_rating", 4.0))
            # Baseline is the impact value (use rating as proxy)
            confirmed = current_rating >= 3.5   # didn't drop below threshold
            return confirmed, current_rating

        elif outcome.outcome_type == "revenue_recovery":
            # Check deviation_pct from pulse
            pulse_snapshot = dataset.get("pulse_snapshot", {})
            dev = abs(float(pulse_snapshot.get("deviation_pct", 0.1)))
            confirmed = dev < 0.08   # less than 8% deviation
            return confirmed, round(dev, 4)

        elif outcome.outcome_type == "compliance_fix":
            # Check compliance_alerts count dropped
            alerts = voice.get("compliance_alerts", [])
            current = float(len(alerts))
            confirmed = current < outcome.baseline_value or current == 0
            return confirmed, current

    except Exception:
        pass

    return False, 0.0


def get_outcome_summary() -> dict:
    """Return outcome statistics for the API."""
    outcomes = _load()
    measured = [o for o in outcomes if o.measured]
    pending  = [o for o in outcomes if not o.measured]
    confirmed_count = sum(1 for o in measured if o.confirmed)

    return {
        "total_tracked":  len(outcomes),
        "measured":       len(measured),
        "pending":        len(pending),
        "confirmed":      confirmed_count,
        "missed":         len(measured) - confirmed_count,
        "confirmation_rate": round(confirmed_count / len(measured), 3) if measured else None,
        "recent": [
            {
                "action": o.action_taken[:50],
                "outcome_type": o.outcome_type,
                "confirmed": o.confirmed,
                "measured_at": o.measured_at,
            }
            for o in sorted(measured, key=lambda x: x.measured_at or "", reverse=True)[:5]
        ],
    }
