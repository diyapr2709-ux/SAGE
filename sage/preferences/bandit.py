"""
bandit.py — Thompson Sampling bandit for recommendation ranking.

Each "arm" is a (category, agent, urgency) tuple.
At ranking time we sample θ ~ Beta(α, β) for each rec's arm and sort by θ.
This gives principled explore/exploit:
  - Arms with little data → wide Beta → high variance → sometimes ranked up (exploration)
  - Well-observed arms → tight Beta → reflects true owner approval rate (exploitation)

On approval  → α += 1  (reward)
On rejection → β += 1  (no-reward)
On edit      → α += 0.5, β += 0.5  (partial signal)

Outcome loop integration:
  When a downstream outcome is confirmed (rec action led to measurable improvement)
  → α += OUTCOME_BONUS
  When outcome is missed (approved but no improvement)
  → β += OUTCOME_PENALTY

Reference: Thompson (1933); Chapelle & Li (2011) NeurIPS.
"""

import json
import random
import math
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Dict, Optional, Tuple

_ROOT         = Path(__file__).resolve().parent.parent.parent
_BANDIT_PATH  = _ROOT / "sage/data/bandit_state.json"

OUTCOME_BONUS   = 1.5   # extra α when approved rec is confirmed effective
OUTCOME_PENALTY = 1.0   # extra β when approved rec had no measurable effect
PRIOR_ALPHA     = 1.0   # uniform prior (Beta(1,1) = Uniform[0,1])
PRIOR_BETA      = 1.0


@dataclass
class Arm:
    alpha: float = PRIOR_ALPHA
    beta:  float = PRIOR_BETA

    @property
    def n(self) -> int:
        return int(self.alpha + self.beta - PRIOR_ALPHA - PRIOR_BETA)

    @property
    def mean(self) -> float:
        return self.alpha / (self.alpha + self.beta)

    @property
    def uncertainty(self) -> float:
        a, b = self.alpha, self.beta
        n = a + b
        return math.sqrt(a * b / (n * n * (n + 1))) if n > 2 else 0.5

    def sample(self, rng: Optional[random.Random] = None) -> float:
        r = rng or random
        # Use the standard Beta sampler via ratio-of-gammas
        try:
            x = r.gammavariate(self.alpha, 1.0)
            y = r.gammavariate(self.beta,  1.0)
            return x / (x + y) if (x + y) > 0 else 0.5
        except Exception:
            return self.mean


@dataclass
class BanditState:
    arms: Dict[str, Arm] = field(default_factory=dict)
    total_pulls: int = 0
    last_updated: str = ""


def _arm_key(category: str, agent: str, urgency: str) -> str:
    return f"{category}|{agent}|{urgency}"


def _load() -> BanditState:
    try:
        if _BANDIT_PATH.exists():
            raw = json.loads(_BANDIT_PATH.read_text())
            arms = {k: Arm(**v) for k, v in raw.get("arms", {}).items()}
            return BanditState(
                arms=arms,
                total_pulls=raw.get("total_pulls", 0),
                last_updated=raw.get("last_updated", ""),
            )
    except Exception:
        pass
    return BanditState()


def _save(state: BanditState):
    _BANDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
    _BANDIT_PATH.write_text(json.dumps({
        "arms": {k: asdict(v) for k, v in state.arms.items()},
        "total_pulls": state.total_pulls,
        "last_updated": state.last_updated,
    }, indent=2))


def _get_or_create_arm(state: BanditState, key: str) -> Arm:
    if key not in state.arms:
        state.arms[key] = Arm()
    return state.arms[key]


# ── Public API ─────────────────────────────────────────────────────────────────

def sample_score(category: str, agent: str, urgency: str) -> float:
    """
    Draw a Thompson sample for this (category, agent, urgency) arm.
    Use this score to rank recommendations — higher = show first.
    """
    state = _load()
    key = _arm_key(category, agent, urgency)
    arm = _get_or_create_arm(state, key)
    return arm.sample()


def update_arm(category: str, agent: str, urgency: str, action: str):
    """
    Update arm posterior based on owner action.
    action: "approved" | "rejected" | "edited"
    """
    from datetime import datetime, timezone
    state = _load()
    key = _arm_key(category, agent, urgency)
    arm = _get_or_create_arm(state, key)

    if action == "approved":
        arm.alpha += 1.0
    elif action == "rejected":
        arm.beta  += 1.0
    elif action == "edited":
        arm.alpha += 0.5
        arm.beta  += 0.5

    state.total_pulls += 1
    state.last_updated = datetime.now(timezone.utc).isoformat()
    _save(state)


def apply_outcome(category: str, agent: str, urgency: str, confirmed: bool):
    """
    Delayed reward signal after an approved recommendation's outcome is measured.
    confirmed=True → action worked → extra α
    confirmed=False → no measurable effect → extra β
    """
    from datetime import datetime, timezone
    state = _load()
    key = _arm_key(category, agent, urgency)
    arm = _get_or_create_arm(state, key)

    if confirmed:
        arm.alpha += OUTCOME_BONUS
    else:
        arm.beta  += OUTCOME_PENALTY

    state.last_updated = datetime.now(timezone.utc).isoformat()
    _save(state)


def rank_recommendations(recs: list) -> list:
    """
    Thompson-sample each rec's arm and sort by sampled score.
    Each call to this is a single Thompson Sampling episode.
    """
    state = _load()
    rng = random.Random()

    def _score(r: dict) -> float:
        key = _arm_key(
            r.get("category", ""),
            r.get("agent", ""),
            r.get("urgency", "medium"),
        )
        arm = _get_or_create_arm(state, key)
        ts_score  = arm.sample(rng)
        # Blend with financial impact (log-scaled, normalised to [0,1])
        impact = float(r.get("impact", r.get("financial_impact", 0)) or 0)
        impact_norm = min(1.0, math.log1p(impact) / math.log1p(5000))
        # 70% Thompson sample (exploration/exploitation), 30% impact signal
        return 0.70 * ts_score + 0.30 * impact_norm

    scored = [(r, _score(r)) for r in recs]
    scored.sort(key=lambda x: -x[1])
    result = [r for r, _ in scored]
    # Attach the score so the API can surface it
    for (r, s) in scored:
        r["bandit_score"] = round(s, 4)
    return result


def get_arm_stats() -> dict:
    """Return all arm statistics — for research/analysis use."""
    state = _load()
    return {
        "total_pulls": state.total_pulls,
        "last_updated": state.last_updated,
        "arms": {
            k: {
                "alpha": v.alpha, "beta": v.beta,
                "mean": round(v.mean, 4),
                "uncertainty": round(v.uncertainty, 4),
                "n_observations": v.n,
            }
            for k, v in state.arms.items()
        },
    }
