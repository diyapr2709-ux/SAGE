"""
fusion.py — Cross-agent evidence fusion via Bayesian belief propagation.

Core idea: when multiple independent agents corroborate the same underlying
issue, the posterior probability of that issue being real compounds multiplicatively,
not additively. A 3-agent corroboration is not 3× more confident than a single
agent — it's P(issue)^(1/n_agents) updated through independent likelihoods.

Fusion model:
    P(issue | e1, e2, ..., ek) ∝ P(e1|issue) · P(e2|issue) · ... · P(ek|issue) · P(issue)

Where each agent's signal has a known reliability (sensitivity/specificity drawn from
its historical approval rate in owner_model).

Practical output:
    Each recommendation gets a `corroboration_score` in [0, 1].
    Recs that share a `cross_ref` tag across agents have compounded scores.
    Single-agent recs get score 0.0 (no boost, ranked by bandit alone).

Signal groups (cross-ref keys):
    "daniel_near_miss"    → VOICE (2 reviews mention cooler) + SHELF (health flag) + CREW (Daniel on shift)
    "thu_understaffing"   → VOICE (Thursday wait mention)   + CREW (understaffed gap) + PULSE (Thu peak)
    "gyro_price_hold"     → VOICE (Chipotle comparison)     + SHELF (margin flag)
    "overtime_labor"      → SHELF (overtime flag)            + CREW (supervisor hours)
"""

import math
from typing import Dict, List, Optional


# Agent reliability priors — updated from owner_model if available
_DEFAULT_RELIABILITY = {
    "PULSE": 0.72,
    "VOICE": 0.68,
    "SHELF": 0.80,
    "CREW":  0.75,
    "FRANK": 0.70,
}

# Cross-reference signal groups: tag → list of (agent, description)
SIGNAL_GROUPS: Dict[str, List[str]] = {
    "daniel_near_miss":  ["VOICE", "SHELF", "CREW"],
    "thu_understaffing": ["VOICE", "CREW",  "PULSE"],
    "gyro_price_hold":   ["VOICE", "SHELF"],
    "overtime_labor":    ["SHELF", "CREW"],
    "delivery_gap":      ["VOICE", "CREW"],
    "food_safety":       ["VOICE", "SHELF"],
}

# Prior probability that any flagged issue is real (conservative)
P_ISSUE_PRIOR = 0.40


def _load_agent_reliability() -> Dict[str, float]:
    """Pull approval-rate-based reliability from owner_model if available."""
    try:
        from sage.preferences.owner_model import load_model
        model = load_model()
        return {ag: model.agent_weights.get(ag, _DEFAULT_RELIABILITY.get(ag, 0.70))
                for ag in _DEFAULT_RELIABILITY}
    except Exception:
        return _DEFAULT_RELIABILITY.copy()


def bayesian_corroboration_score(agents_signalling: List[str],
                                  reliability: Optional[Dict[str, float]] = None) -> float:
    """
    Compute P(issue is real | k independent agents all signal it).

    Uses naive Bayes assumption (agent signals are conditionally independent
    given the issue). For each agent signalling:
        likelihood ratio = sensitivity / (1 - specificity)
    where sensitivity ≈ reliability and specificity ≈ reliability.

    Returns posterior P(issue | evidence) in [0, 1].
    """
    if not agents_signalling:
        return 0.0

    rel = reliability or _load_agent_reliability()

    # Log-odds form for numerical stability
    log_odds = math.log(P_ISSUE_PRIOR / (1 - P_ISSUE_PRIOR + 1e-9))

    for agent in agents_signalling:
        r = rel.get(agent, 0.70)
        # Likelihood ratio: P(signal | issue) / P(signal | no issue)
        # sensitivity = r, specificity = r → LR = r / (1 - r)
        lr = r / (1 - r + 1e-9)
        log_odds += math.log(lr + 1e-9)

    posterior_odds = math.exp(log_odds)
    posterior = posterior_odds / (1 + posterior_odds)
    return round(min(0.99, max(0.0, posterior)), 4)


def fuse_recommendations(recs: list) -> list:
    """
    Scan recommendations for cross-ref tags.
    For each signal group with ≥2 agents represented, compute corroboration score.
    Inject `corroboration_score` and `corroborated_by` fields into matching recs.
    Recs with high corroboration get an urgency upgrade if warranted.
    """
    rel = _load_agent_reliability()

    # Index recs by cross_ref tag
    cross_ref_map: Dict[str, List[dict]] = {}
    for rec in recs:
        tag = rec.get("cross_ref") or _infer_cross_ref(rec)
        if tag:
            rec["_cross_ref_tag"] = tag
            cross_ref_map.setdefault(tag, []).append(rec)

    # Also scan reviews embedded in recs (VOICE recs carry review cross_refs)
    # and build a set of active agents per cross_ref tag
    active_agents_per_tag: Dict[str, List[str]] = {}
    for tag, tag_recs in cross_ref_map.items():
        agents = list({r.get("agent", "FRANK") for r in tag_recs})
        # Also add agents from SIGNAL_GROUPS definition that aren't recs yet
        # (e.g. PULSE signal that didn't become a standalone rec)
        active_agents_per_tag[tag] = agents

    for rec in recs:
        tag = rec.get("_cross_ref_tag")
        if not tag:
            rec["corroboration_score"] = 0.0
            rec["corroborated_by"] = []
            continue

        agents = active_agents_per_tag.get(tag, [rec.get("agent", "FRANK")])
        score  = bayesian_corroboration_score(agents, rel)
        rec["corroboration_score"] = score
        rec["corroborated_by"] = agents

        # Urgency upgrade if score > 0.80 and currently medium
        if score > 0.80 and rec.get("urgency") == "medium":
            rec["urgency"] = "high"
            rec["urgency_upgraded"] = True
        elif score > 0.90 and rec.get("urgency") == "high":
            rec["urgency"] = "critical"
            rec["urgency_upgraded"] = True

    # Clean up internal tag
    for rec in recs:
        rec.pop("_cross_ref_tag", None)

    return recs


def _infer_cross_ref(rec: dict) -> Optional[str]:
    """
    Heuristic: infer cross_ref tag from rec title/description if not explicit.
    """
    text = (rec.get("title", "") + " " + rec.get("description", "")).lower()

    if any(w in text for w in ["cooler", "health code", "food safety", "daniel"]):
        return "daniel_near_miss"
    if any(w in text for w in ["thursday", "understaffed", "thu night"]):
        return "thu_understaffing"
    if any(w in text for w in ["chipotle", "gyro price", "price hold"]):
        return "gyro_price_hold"
    if any(w in text for w in ["overtime", "michael", "ot hours"]):
        return "overtime_labor"
    if any(w in text for w in ["delivery", "doordash", "jordan"]):
        return "delivery_gap"
    return None


def get_fusion_summary(recs: list) -> dict:
    """Return a summary of corroboration events for the API/dashboard."""
    corroborated = [r for r in recs if r.get("corroboration_score", 0) > 0]
    upgraded     = [r for r in recs if r.get("urgency_upgraded")]
    return {
        "total_recs": len(recs),
        "corroborated": len(corroborated),
        "urgency_upgraded": len(upgraded),
        "high_confidence": [
            {
                "title": r.get("title", "")[:60],
                "corroboration_score": r["corroboration_score"],
                "corroborated_by": r["corroborated_by"],
            }
            for r in sorted(corroborated, key=lambda x: -x["corroboration_score"])[:5]
        ],
    }
