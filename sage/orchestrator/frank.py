"""
FRANK — SAGE Orchestrator
==========================
LangGraph supervisor node that:
- Runs all 4 agents (PULSE, VOICE, SHELF, CREW)
- Extracts and ranks recommendations by financial impact
- Resolves conflicts between agent signals
- Enforces $200 approval threshold
- Generates WhatsApp morning briefing
- Routes employee feedback to individuals
- Logs full reasoning trace
"""

import json
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from enum import Enum

try:
    from sage.preferences.owner_model import (
        load_model as _load_pref_model,
        score_recommendation as _score_rec,
        personalize_conflict_urgency as _personalize_urgency,
    )
    _PREFS_AVAILABLE = True
except Exception:
    _PREFS_AVAILABLE = False

from langgraph.graph import StateGraph, END
from typing_extensions import TypedDict

# ── AGENT IMPORTS ─────────────────────────────────────────────────────────────
from sage.agents.pulse import pulse_tool
from sage.agents.voice import run as voice_run
from sage.agents.shelf import run_shelf as shelf_run
from sage.agents.crew_stub import run_crew_stub

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ── DATA MODELS ───────────────────────────────────────────────────────────────

class ApprovalStatus(Enum):
    AUTO_APPROVED    = "auto_approved"
    REQUIRES_APPROVAL = "requires_approval"
    PENDING          = "pending"

@dataclass
class Recommendation:
    id:               str
    agent:            str
    category:         str   # revenue|reputation|cost|staffing|employee|compliance|composite
    title:            str
    description:      str
    financial_impact: float
    approval_status:  ApprovalStatus
    urgency:          str = "medium"   # critical|high|medium|low
    raw_data:         Dict[str, Any] = field(default_factory=dict)
    merged_from:      List[str] = field(default_factory=list)
    owner:            str = "Owner"    # who should act on this
    deadline:         str = ""

@dataclass
class ConflictResolution:
    conflict_type:       str
    signals_involved:    List[str]
    resolution_strategy: str
    outcome:             str

# ── STATE ─────────────────────────────────────────────────────────────────────

class FrankState(TypedDict):
    business_config:          Dict[str, Any]
    pulse_output:             Optional[Dict[str, Any]]
    voice_output:             Optional[Dict[str, Any]]
    shelf_output:             Optional[Dict[str, Any]]
    crew_output:              Optional[Dict[str, Any]]
    raw_recommendations:      List[Recommendation]
    resolved_recommendations: List[Recommendation]
    conflicts:                List[ConflictResolution]
    employee_alerts:          List[Dict]   # per-employee direct messages
    briefing_text:            str
    trace_log:                List[str]

# ── AGENT NODES ───────────────────────────────────────────────────────────────

def run_pulse(state: FrankState) -> FrankState:
    logger.info("Running PULSE...")
    try:
        output = pulse_tool.invoke("")
        state["pulse_output"] = output
        state["trace_log"].append(f"PULSE: alert={output.get('alert')}, impact=${output.get('financial_impact',0)}")
    except Exception as e:
        logger.warning(f"PULSE failed: {e}")
        state["pulse_output"] = {"alert": False, "financial_impact": 0, "deviation_pct": 0, "forecast_72hr": [], "rush_hours": [], "goals": {}}
        state["trace_log"].append(f"PULSE failed: {e} — using empty output")
    return state

def run_voice(state: FrankState) -> FrankState:
    logger.info("Running VOICE...")
    config = state["business_config"]
    try:
        output = voice_run(
            business_id=config.get("business_id", "demo_business"),
            business_type=config.get("business_type", "restaurant"),
            location=config.get("location", "San Francisco"),
            cluster=config.get("cluster", "A")
        )
        state["voice_output"] = output
        state["trace_log"].append(f"VOICE: flag={output.get('flag')}, impact=${output.get('financial_impact',0)}, cluster={output.get('cluster','A')}")
    except Exception as e:
        logger.warning(f"VOICE failed: {e}")
        state["voice_output"] = {"flag": False, "financial_impact": 0, "replies": [], "pricing_alerts": [], "temporal_alerts": [], "trends": {}}
        state["trace_log"].append(f"VOICE failed: {e} — using empty output")
    return state

def run_shelf(state: FrankState) -> FrankState:
    logger.info("Running SHELF...")
    config = state["business_config"]
    try:
        output = shelf_run(
            business_name=config.get("business_id", "demo_business"),
            business_type=config.get("business_type", "restaurant"),
            location=config.get("location", ""),
            voice_output=state.get("voice_output"),        # pass VOICE output
            dataset=config.get("dataset"),                 # pass custom dataset if provided
            custom_dataset_path=config.get("dataset_path"),
            repo=config.get("repo"),
            employees=config.get("employees"),
        )
        state["shelf_output"] = output
        state["trace_log"].append(f"SHELF: flag={output.get('flag')}, impact=${output.get('financial_impact',0)}, cluster={output.get('cluster','A')}")
    except Exception as e:
        logger.warning(f"SHELF failed: {e}")
        state["shelf_output"] = {"flag": False, "financial_impact": 0, "cost_intelligence": {}, "employee_intelligence": {}, "escalations": {}}
        state["trace_log"].append(f"SHELF failed: {e} — using empty output")
    return state

def run_crew(state: FrankState) -> FrankState:
    logger.info("Running CREW...")
    employees = state["business_config"].get("employees") or []
    try:
        output = run_crew_stub("understaffed_evening", employees)
        state["crew_output"] = output
        state["trace_log"].append(f"CREW: status={output.get('staffing_status')}, impact=${output.get('financial_impact',0)}")
    except Exception as e:
        logger.warning(f"CREW failed: {e}")
        state["crew_output"] = {"staffing_status": "balanced", "financial_impact": 0, "shift_id": "stub", "adjustment": "none"}
        state["trace_log"].append(f"CREW failed: {e} — using empty output")
    return state

# ── RECOMMENDATION EXTRACTORS ─────────────────────────────────────────────────

def extract_pulse_recommendations(pulse: Dict) -> List[Recommendation]:
    recs = []
    if pulse.get("alert"):
        recs.append(Recommendation(
            id="pulse_alert", agent="PULSE", category="revenue",
            title="Revenue Anomaly Detected",
            description=f"Deviation: {pulse.get('deviation_pct',0)*100:.1f}% from forecast. Impact: ${pulse.get('financial_impact',0)}",
            financial_impact=pulse.get("financial_impact", 0),
            approval_status=ApprovalStatus.AUTO_APPROVED,
            urgency="high", raw_data=pulse
        ))
    for rush in pulse.get("rush_hours", []):
        recs.append(Recommendation(
            id=f"pulse_rush_{rush['window'].replace(' ','_')}", agent="PULSE", category="staffing",
            title=f"Rush Hour: {rush['window']}",
            description=f"Expected revenue: ${rush.get('expected_revenue',0)}. Consider staffing up.",
            financial_impact=rush.get("expected_revenue", 0) * 0.15,
            approval_status=ApprovalStatus.REQUIRES_APPROVAL,
            urgency="medium", raw_data=rush
        ))
    daily_gap = pulse.get("goals", {}).get("daily", {}).get("gap", 0)
    if daily_gap < 0:
        recs.append(Recommendation(
            id="pulse_daily_gap", agent="PULSE", category="revenue",
            title="Behind Daily Target",
            description=f"Projected to miss daily goal by ${abs(daily_gap):.0f}.",
            financial_impact=abs(daily_gap),
            approval_status=ApprovalStatus.REQUIRES_APPROVAL,
            urgency="high", raw_data=pulse.get("goals", {}).get("daily", {})
        ))
    return recs

def extract_voice_recommendations(voice: Dict) -> List[Recommendation]:
    recs = []
    cluster = voice.get("cluster", "A")

    if cluster == "A":
        # review replies
        for reply in voice.get("replies", []):
            if reply.get("priority") in ["critical", "high"]:
                recs.append(Recommendation(
                    id=f"voice_reply_{reply.get('review_id','x')}",
                    agent="VOICE", category="reputation",
                    title=f"Respond to {reply.get('rating','?')}★ review from {reply.get('author','')}",
                    description=reply.get("draft_reply","")[:120],
                    financial_impact=150.0 if reply.get("priority") == "critical" else 50.0,
                    approval_status=ApprovalStatus.REQUIRES_APPROVAL,
                    urgency=reply.get("priority","medium"), raw_data=reply
                ))
        # pricing alerts
        for alert in voice.get("pricing_alerts", []):
            recs.append(Recommendation(
                id=f"voice_pricing_{alert.get('alert_id','x')}",
                agent="VOICE", category="cost",
                title=alert.get("recommended_action","Pricing action"),
                description=alert.get("detail",""),
                financial_impact=alert.get("financial_impact", 0),
                approval_status=ApprovalStatus.REQUIRES_APPROVAL,
                urgency=alert.get("urgency","medium"), raw_data=alert,
                deadline=alert.get("deadline","")
            ))
        # temporal alerts
        for alert in voice.get("temporal_alerts", []):
            recs.append(Recommendation(
                id=f"voice_temporal_{alert.get('alert_id','x')}",
                agent="VOICE", category="staffing",
                title=alert.get("recommended_action",""),
                description=alert.get("insight",""),
                financial_impact=alert.get("financial_impact", 0),
                approval_status=ApprovalStatus.REQUIRES_APPROVAL,
                urgency="high", raw_data=alert,
                deadline=alert.get("window","")
            ))
        # health alerts
        for alert in voice.get("health_alerts", []):
            recs.append(Recommendation(
                id=f"voice_health_{alert.get('alert_id','x')}",
                agent="VOICE", category="compliance",
                title=alert.get("recommended_action","Health action"),
                description=alert.get("detail",""),
                financial_impact=500.0 if alert.get("severity") == "critical" else 100.0,
                approval_status=ApprovalStatus.REQUIRES_APPROVAL,
                urgency=alert.get("severity","medium"), raw_data=alert
            ))
        # menu recommendations
        for rec in voice.get("menu_recommendations", []):
            recs.append(Recommendation(
                id=f"voice_menu_{rec.get('type','x')}_{rec.get('item','x').replace(' ','_')}",
                agent="VOICE", category="cost",
                title=f"{rec.get('type','').title()}: {rec.get('item','')}",
                description=rec.get("reason",""),
                financial_impact=rec.get("financial_impact", 0),
                approval_status=ApprovalStatus.REQUIRES_APPROVAL,
                urgency=rec.get("priority","medium"), raw_data=rec
            ))
        # social alerts
        for alert in voice.get("social_alerts", []):
            recs.append(Recommendation(
                id=f"voice_social_{alert.get('alert_id','x')}",
                agent="VOICE", category="reputation",
                title=alert.get("recommended_action",""),
                description=alert.get("detail",""),
                financial_impact=100.0,
                approval_status=ApprovalStatus.REQUIRES_APPROVAL,
                urgency=alert.get("urgency","medium"), raw_data=alert
            ))
        # loyalty alerts
        for alert in voice.get("loyalty_alerts", []):
            recs.append(Recommendation(
                id=f"voice_loyalty_{alert.get('alert_id','x')}",
                agent="VOICE", category="reputation",
                title=alert.get("recommended_action",""),
                description=alert.get("detail",""),
                financial_impact=alert.get("ltv_at_risk", 0),
                approval_status=ApprovalStatus.REQUIRES_APPROVAL,
                urgency="high", raw_data=alert
            ))
        # pulse signals from VOICE (demand forecast adjustments)
        pulse_signals = voice.get("pulse_signals", {})
        for dm in pulse_signals.get("demand_multipliers", []):
            if dm.get("multiplier", 1) > 1.2:
                recs.append(Recommendation(
                    id=f"voice_demand_{dm.get('date','x')}",
                    agent="VOICE", category="staffing",
                    title=f"Demand spike: {dm.get('event','')}",
                    description=f"{dm.get('date','')} — {dm.get('multiplier',1):.1f}x normal demand expected",
                    financial_impact=500.0,
                    approval_status=ApprovalStatus.REQUIRES_APPROVAL,
                    urgency="high", raw_data=dm
                ))

    else:  # Cluster B
        # strategic alerts
        for alert in voice.get("strategic_alerts", []):
            recs.append(Recommendation(
                id=f"voice_strategic_{alert.get('alert_id','x')}",
                agent="VOICE", category="cost",
                title=alert.get("recommended_action",""),
                description=alert.get("insight",""),
                financial_impact=abs(alert.get("financial_impact", 0)),
                approval_status=ApprovalStatus.REQUIRES_APPROVAL,
                urgency=alert.get("priority","medium"),
                owner=alert.get("owner","CEO"),
                raw_data=alert
            ))
        # policy alerts
        for alert in voice.get("policy_alerts", []):
            if alert.get("applies_to_product", True):
                recs.append(Recommendation(
                    id=f"voice_policy_{alert.get('policy_id','x')}",
                    agent="VOICE", category="compliance",
                    title=alert.get("title","Policy alert"),
                    description=alert.get("summary",""),
                    financial_impact=10000.0 if alert.get("compliance_risk") == "high" else 2000.0,
                    approval_status=ApprovalStatus.REQUIRES_APPROVAL,
                    urgency="critical" if alert.get("compliance_risk") == "high" else "medium",
                    owner=alert.get("owner","CEO"),
                    deadline=str(alert.get("days_until_deadline","")) + " days",
                    raw_data=alert
                ))
        # market intelligence
        for signal in voice.get("market_intelligence", []):
            if signal.get("urgency") in ["high","critical"]:
                recs.append(Recommendation(
                    id=f"voice_market_{signal.get('signal_id','x')}",
                    agent="VOICE", category="revenue",
                    title=signal.get("recommended_action",""),
                    description=signal.get("summary",""),
                    financial_impact=abs(signal.get("financial_impact", 0)),
                    approval_status=ApprovalStatus.REQUIRES_APPROVAL,
                    urgency=signal.get("urgency","medium"),
                    owner=signal.get("owner","CEO"),
                    raw_data=signal
                ))

    return recs

def extract_shelf_recommendations(shelf: Dict) -> List[Recommendation]:
    recs = []
    cost = shelf.get("cost_intelligence", {})

    # flagged cost items
    for item in cost.get("flagged_items", []):
        recs.append(Recommendation(
            id=f"shelf_cost_{item.get('item','x').replace(' ','_')}",
            agent="SHELF", category="cost",
            title=item.get("recommended_action", f"Review {item.get('item','')}"),
            description=f"{item.get('item','')} margin at {item.get('current_margin_pct',0):.1f}% — {item.get('root_cause','')}",
            financial_impact=abs(item.get("financial_impact", item.get("monthly_impact", 0))),
            approval_status=ApprovalStatus.REQUIRES_APPROVAL,
            urgency=item.get("urgency","medium"),
            raw_data=item,
            owner="Owner"
        ))

    # cost creep alerts
    for alert in cost.get("cost_creep_alerts", []):
        recs.append(Recommendation(
            id=f"shelf_creep_{alert.get('item','x').replace(' ','_')}",
            agent="SHELF", category="cost",
            title=f"Cost creep: {alert.get('item','')} up {alert.get('increase_3mo_pct',0):.1f}% in 3mo",
            description=f"Supplier: {alert.get('supplier','')} — {alert.get('action','')}",
            financial_impact=alert.get("increase_3mo_pct", 0) * 50,
            approval_status=ApprovalStatus.REQUIRES_APPROVAL,
            urgency="high", raw_data=alert
        ))

    # employee intelligence flags
    emp_intel = shelf.get("employee_intelligence", {})
    for emp in emp_intel.get("employees", []):
        if emp.get("flags"):
            recs.append(Recommendation(
                id=f"shelf_emp_{emp.get('name','x').replace(' ','_')}",
                agent="SHELF", category="employee",
                title=f"{emp.get('name','')} ({emp.get('role','')}): {emp.get('flags',[None])[0] or ''}",
                description=" | ".join(emp.get("flags",[])),
                financial_impact=emp.get("monthly_cost", 0) * 0.1,
                approval_status=ApprovalStatus.REQUIRES_APPROVAL,
                urgency=emp.get("urgency","medium"),
                owner=emp.get("name",""),
                raw_data=emp
            ))

    # strategic recommendations from SHELF
    strat = shelf.get("strategic_recommendations", {})
    for action in strat.get("immediate", []):
        if action.get("requires_ceo_approval"):
            recs.append(Recommendation(
                id=f"shelf_strat_{action.get('owner','x').replace(' ','_')}_{len(recs)}",
                agent="SHELF", category="cost",
                title=action.get("action",""),
                description=f"Owner: {action.get('owner','')} · Due in {action.get('deadline_days',0)} days",
                financial_impact=action.get("financial_impact", 0),
                approval_status=ApprovalStatus.REQUIRES_APPROVAL,
                urgency="high",
                owner=action.get("owner","Owner"),
                deadline=f"{action.get('deadline_days',0)} days",
                raw_data=action
            ))

    return recs

def extract_crew_recommendations(crew: Dict) -> List[Recommendation]:
    recs = []
    if crew.get("staffing_status") != "balanced":
        recs.append(Recommendation(
            id=f"crew_{crew.get('shift_id','x')}",
            agent="CREW", category="staffing",
            title=f"Staffing: {crew.get('adjustment','')}",
            description=f"{crew.get('shift_date','')} {crew.get('shift_start','')}–{crew.get('shift_end','')}",
            financial_impact=crew.get("financial_impact", 0),
            approval_status=ApprovalStatus.REQUIRES_APPROVAL,
            urgency="high", raw_data=crew
        ))
    return recs

def collect_recommendations(state: FrankState) -> FrankState:
    recs = []
    if state.get("pulse_output"): recs.extend(extract_pulse_recommendations(state["pulse_output"]))
    if state.get("voice_output"): recs.extend(extract_voice_recommendations(state["voice_output"]))
    if state.get("shelf_output"): recs.extend(extract_shelf_recommendations(state["shelf_output"]))
    if state.get("crew_output"):  recs.extend(extract_crew_recommendations(state["crew_output"]))
    state["raw_recommendations"] = recs
    state["trace_log"].append(f"Collected {len(recs)} raw recommendations")
    return state

# ── CONFLICT RESOLUTION ───────────────────────────────────────────────────────

def resolve_conflicts(state: FrankState) -> FrankState:
    """
    Conflict resolution rules:
    1. PULSE revenue alert + CREW understaffing → merge into composite
    2. VOICE pricing alert + SHELF cost creep for same item → merge
    3. SHELF employee flag + VOICE review complaint for same person → merge
    4. Duplicate actions (same item from multiple agents) → deduplicate, keep highest impact
    """
    raw   = state["raw_recommendations"]
    final = []
    conflicts = []

    pulse_alert    = next((r for r in raw if r.id == "pulse_alert"), None)
    crew_understaff = next((r for r in raw if r.agent == "CREW" and "understaffed" in r.raw_data.get("staffing_status","")), None)
    used_ids = set()

    # Load preference model once for all personalization calls
    _pref = None
    if _PREFS_AVAILABLE:
        try:
            _pref = _load_pref_model()
        except Exception:
            pass

    # Rule 1: PULSE + CREW merge
    if pulse_alert and crew_understaff:
        base_urgency = "critical"
        urgency = _personalize_urgency("revenue_staffing_mismatch", base_urgency, _pref) if _pref else base_urgency
        merged = Recommendation(
            id="merged_pulse_crew", agent="FRANK", category="composite",
            title="Revenue Shortfall + Understaffing",
            description=f"Revenue off {pulse_alert.raw_data.get('deviation_pct',0)*100:.1f}% AND shift understaffed. Add staff to recover both.",
            financial_impact=pulse_alert.financial_impact + crew_understaff.financial_impact,
            approval_status=ApprovalStatus.REQUIRES_APPROVAL,
            urgency=urgency,
            merged_from=[pulse_alert.id, crew_understaff.id]
        )
        final.append(merged)
        used_ids.update([pulse_alert.id, crew_understaff.id])
        conflicts.append(ConflictResolution("revenue_staffing_mismatch", [pulse_alert.id, crew_understaff.id], "merge", "Composite recommendation created"))
        state["trace_log"].append("Merged PULSE alert + CREW understaffing → composite")

    # Rule 2: VOICE pricing + SHELF cost creep for same item
    voice_pricing = {r.raw_data.get("item",""): r for r in raw if r.agent == "VOICE" and r.category == "cost"}
    shelf_creep   = {r.raw_data.get("item",""): r for r in raw if r.agent == "SHELF" and "creep" in r.id}
    for item, vr in voice_pricing.items():
        if item in shelf_creep:
            sr = shelf_creep[item]
            base_urgency = "high"
            urgency = _personalize_urgency("pricing_cost_overlap", base_urgency, _pref) if _pref else base_urgency
            merged = Recommendation(
                id=f"merged_pricing_{item.replace(' ','_')}",
                agent="FRANK", category="composite",
                title=f"Pricing + Cost alert: {item}",
                description=f"VOICE: {vr.description[:80]} | SHELF: {sr.description[:80]}",
                financial_impact=vr.financial_impact + sr.financial_impact,
                approval_status=ApprovalStatus.REQUIRES_APPROVAL,
                urgency=urgency,
                merged_from=[vr.id, sr.id]
            )
            final.append(merged)
            used_ids.update([vr.id, sr.id])
            conflicts.append(ConflictResolution("pricing_cost_overlap", [vr.id, sr.id], "merge", f"Item {item} flagged by both VOICE and SHELF"))
            state["trace_log"].append(f"Merged VOICE pricing + SHELF cost creep for {item}")

    # Rule 3: SHELF employee flag + VOICE negative review for same name
    shelf_emp = {r.raw_data.get("name",""): r for r in raw if r.agent == "SHELF" and r.category == "employee"}
    voice_reviews = [r for r in raw if r.agent == "VOICE" and r.category == "reputation" and r.raw_data.get("review_cross_ref")]
    for name, er in shelf_emp.items():
        for vr in voice_reviews:
            review_text = vr.raw_data.get("original_review","").lower()
            if name.lower() in review_text or any(role_kw in review_text for role_kw in ["cook","driver","cashier"]):
                base_urgency = "high"
                urgency = _personalize_urgency("employee_review_overlap", base_urgency, _pref) if _pref else base_urgency
                merged = Recommendation(
                    id=f"merged_employee_{name.replace(' ','_')}",
                    agent="FRANK", category="composite",
                    title=f"Employee + Review issue: {name}",
                    description=f"SHELF flags: {er.description[:80]} | VOICE review: {vr.description[:80]}",
                    financial_impact=er.financial_impact + vr.financial_impact,
                    approval_status=ApprovalStatus.REQUIRES_APPROVAL,
                    urgency=urgency,
                    owner=name,
                    merged_from=[er.id, vr.id]
                )
                final.append(merged)
                used_ids.update([er.id, vr.id])
                conflicts.append(ConflictResolution("employee_review_overlap", [er.id, vr.id], "merge", f"{name} flagged by both SHELF and VOICE"))
                state["trace_log"].append(f"Merged SHELF employee + VOICE review for {name}")
                break

    # add all remaining unused recommendations
    for r in raw:
        if r.id not in used_ids:
            final.append(r)

    state["resolved_recommendations"] = final
    state["conflicts"] = conflicts
    return state

# ── APPROVAL + RANKING ────────────────────────────────────────────────────────

def apply_approval_threshold(state: FrankState) -> FrankState:
    # Use owner's learned action threshold if available; fall back to $200 hard-code
    threshold = 200.0
    if _PREFS_AVAILABLE:
        try:
            pref_model = _load_pref_model()
            threshold = pref_model.action_threshold
        except Exception:
            pass

    for rec in state["resolved_recommendations"]:
        if rec.financial_impact > threshold:
            rec.approval_status = ApprovalStatus.REQUIRES_APPROVAL
            state["trace_log"].append(
                f"'{rec.title}' impact ${rec.financial_impact:.0f} > learned threshold ${threshold:.0f} → approval required"
            )
        elif rec.financial_impact == 0:
            rec.approval_status = ApprovalStatus.AUTO_APPROVED
    return state


def rank_recommendations(state: FrankState) -> FrankState:
    """
    Rank by predicted owner approval probability when preference model is available;
    otherwise fall back to urgency-then-impact ordering.
    """
    if _PREFS_AVAILABLE:
        try:
            pref_model = _load_pref_model()
            if pref_model.total_decisions >= 3:
                # Enough history — reorder by predicted approval probability
                for rec in state["resolved_recommendations"]:
                    rec._approval_score = _score_rec(
                        {"category": rec.category, "agent": rec.agent,
                         "financial_impact": rec.financial_impact, "urgency": rec.urgency},
                        pref_model
                    )
                state["resolved_recommendations"].sort(
                    key=lambda r: -getattr(r, "_approval_score", 0)
                )
                state["trace_log"].append(
                    f"Ranked by owner preference model (threshold=${pref_model.action_threshold:.0f}, "
                    f"30d approval rate={pref_model.approval_rate_30d:.0%}, "
                    f"drift={'YES' if pref_model.drift_detected else 'no'})"
                )
                return state
        except Exception:
            pass

    # Fallback: urgency → financial impact
    urgency_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    state["resolved_recommendations"].sort(
        key=lambda r: (urgency_order.get(r.urgency, 2), -r.financial_impact)
    )
    state["trace_log"].append("Ranked by urgency then financial impact (no preference model yet)")
    return state

# ── EMPLOYEE ALERT ROUTING ────────────────────────────────────────────────────

def route_employee_alerts(state: FrankState) -> FrankState:
    """Extract per-employee messages from SHELF feedback for direct delivery"""
    shelf = state.get("shelf_output") or {}
    feedback = shelf.get("employee_feedback", {})
    alerts = []
    for warning in feedback.get("warnings", []):
        alerts.append({
            "to":       warning.get("employee"),
            "role":     warning.get("role"),
            "urgency":  warning.get("urgency"),
            "message":  warning.get("message_to_employee",""),
            "action":   warning.get("action",""),
            "financial_impact": warning.get("financial_impact", 0),
        })
    for recognition in feedback.get("recognitions", []):
        alerts.append({
            "to":       recognition.get("employee"),
            "role":     recognition.get("role"),
            "urgency":  "none",
            "message":  recognition.get("message_to_employee",""),
            "action":   "Keep it up",
            "financial_impact": 0,
        })
    state["employee_alerts"] = alerts
    state["trace_log"].append(f"Routed {len(alerts)} employee alerts")
    return state

# ── BRIEFING FORMATTER ────────────────────────────────────────────────────────

def format_whatsapp_briefing(state: FrankState) -> FrankState:
    config  = state["business_config"]
    recs    = state["resolved_recommendations"]
    shelf   = state.get("shelf_output") or {}
    voice   = state.get("voice_output") or {}

    requires_approval = [r for r in recs if r.approval_status == ApprovalStatus.REQUIRES_APPROVAL]
    auto_approved     = [r for r in recs if r.approval_status == ApprovalStatus.AUTO_APPROVED]
    total_impact      = sum(r.financial_impact for r in recs)
    critical          = [r for r in recs if r.urgency == "critical"]

    emp_intel   = shelf.get("employee_intelligence", {})
    eotw        = emp_intel.get("employee_of_the_week", {})
    fb_line     = shelf.get("employee_feedback", {}).get("frank_briefing_line", "")
    report_files = shelf.get("report_files", [])

    lines = []
    lines.append(f"SAGE Morning Briefing — {datetime.now().strftime('%A, %b %d %Y')}")
    lines.append(f"Business: {config.get('business_id','')}")
    lines.append("")

    # health score
    health = shelf.get("executive_summary", {}).get("business_health_score")
    if health:
        lines.append(f"Business Health: {health}/100")

    lines.append(f"{len(recs)} recommendations | {len(requires_approval)} need approval | ${total_impact:,.0f} total impact")
    lines.append("")

    # critical items first
    if critical:
        lines.append("CRITICAL — Act Today:")
        for r in critical[:3]:
            lines.append(f"  ! {r.title} (${r.financial_impact:,.0f})")
            if r.deadline: lines.append(f"    Deadline: {r.deadline}")
        lines.append("")

    # approval required
    if requires_approval:
        lines.append("Needs Your Approval:")
        for r in requires_approval[:5]:
            lines.append(f"  [{r.agent}] {r.title}")
            lines.append(f"    {r.description[:100]}")
            lines.append(f"    Impact: ${r.financial_impact:,.0f} | {r.urgency.upper()}")
            if r.merged_from: lines.append(f"    (Combined signal from: {', '.join(r.merged_from)})")
            lines.append("")

    # auto approved
    if auto_approved:
        lines.append("FYI (auto-logged):")
        for r in auto_approved[:3]:
            lines.append(f"  {r.title}")
        lines.append("")

    # employee section
    if fb_line:
        lines.append(f"Staff: {fb_line}")
    if eotw and eotw.get("name"):
        lines.append(f"Employee of the Week: {eotw['name']} ({eotw['role']}) — Score {eotw['score']}/100")
    lines.append("")

    # voice cross-references
    voice_crossref = shelf.get("voice_crossref", {})
    connections = voice_crossref.get("review_to_cost_connections", [])
    if connections:
        lines.append("Review-to-Cost Insights:")
        for c in connections[:2]:
            lines.append(f"  {c.get('combined_insight','')[:100]}")
        lines.append("")

    # revenue forecast
    pulse = state.get("pulse_output") or {}
    if pulse.get("summary"):
        lines.append(f"Revenue Forecast: {pulse['summary']}")
        lines.append("")

    # report files
    if report_files:
        lines.append(f"PDF Reports: {len(report_files)} generated in sage/reports/")
        lines.append("")

    lines.append("Reply: 'approve X' or 'ignore X' to manage recommendations")

    state["briefing_text"] = "\n".join(lines)
    state["trace_log"].append("Briefing formatted")
    return state

# ── SEND (stub) ───────────────────────────────────────────────────────────────

def send_briefing(state: FrankState) -> FrankState:
    """Send via Twilio WhatsApp — stub for demo"""
    logger.info("=== SAGE BRIEFING ===")
    print(state["briefing_text"])
    logger.info("=== END BRIEFING ===")

    # log employee alerts
    if state.get("employee_alerts"):
        logger.info(f"\n{len(state['employee_alerts'])} employee alerts to route:")
        for alert in state["employee_alerts"]:
            logger.info(f"  → {alert['to']} ({alert['role']}): {alert['message'][:80]}")

    state["trace_log"].append("Briefing sent (stub)")
    return state

# ── LANGGRAPH ─────────────────────────────────────────────────────────────────

def build_frank_graph() -> StateGraph:
    wf = StateGraph(FrankState)
    wf.add_node("run_pulse",               run_pulse)
    wf.add_node("run_voice",               run_voice)
    wf.add_node("run_shelf",               run_shelf)
    wf.add_node("run_crew",                run_crew)
    wf.add_node("collect_recommendations", collect_recommendations)
    wf.add_node("resolve_conflicts",       resolve_conflicts)
    wf.add_node("apply_approval_threshold",apply_approval_threshold)
    wf.add_node("rank_recommendations",    rank_recommendations)
    wf.add_node("route_employee_alerts",   route_employee_alerts)
    wf.add_node("format_briefing",         format_whatsapp_briefing)
    wf.add_node("send_briefing",           send_briefing)

    wf.set_entry_point("run_pulse")
    wf.add_edge("run_pulse",               "run_voice")
    wf.add_edge("run_voice",               "run_shelf")   # VOICE output passed to SHELF
    wf.add_edge("run_shelf",               "run_crew")
    wf.add_edge("run_crew",                "collect_recommendations")
    wf.add_edge("collect_recommendations", "resolve_conflicts")
    wf.add_edge("resolve_conflicts",       "apply_approval_threshold")
    wf.add_edge("apply_approval_threshold","rank_recommendations")
    wf.add_edge("rank_recommendations",    "route_employee_alerts")
    wf.add_edge("route_employee_alerts",   "format_briefing")
    wf.add_edge("format_briefing",         "send_briefing")
    wf.add_edge("send_briefing",           END)

    return wf.compile()

# ── MAIN ──────────────────────────────────────────────────────────────────────

def run_frank(
    business_id:     str  = "demo_business",
    business_type:   str  = "restaurant",
    location:        str  = "San Francisco",
    cluster:         str  = "A",
    dataset:         dict = None,
    dataset_path:    str  = None,
    repo:            str  = None,
    employees:       list = None,
    config_overrides: dict = None,
) -> Dict[str, Any]:
    """
    Run full FRANK pipeline.

    Args:
        business_id:   Business name / ID
        business_type: restaurant|grocery|pharmacy|boutique|saas|law_firm|agency etc
        location:      City, State
        cluster:       A (consumer) or B (professional/startup)
        dataset:       Optional inline dict dataset for SHELF
        dataset_path:  Optional path to JSON/CSV dataset file
        repo:          GitHub repo for Cluster B (owner/repo)
        employees:     List of employee dicts
    """
    config = {
        "business_id":   business_id,
        "business_type": business_type,
        "location":      location,
        "cluster":       cluster,
        "dataset":       dataset,
        "dataset_path":  dataset_path,
        "repo":          repo,
        "employees":     employees,
    }
    if config_overrides:
        config.update(config_overrides)

    initial_state: FrankState = {
        "business_config":          config,
        "pulse_output":             None,
        "voice_output":             None,
        "shelf_output":             None,
        "crew_output":              None,
        "raw_recommendations":      [],
        "resolved_recommendations": [],
        "conflicts":                [],
        "employee_alerts":          [],
        "briefing_text":            "",
        "trace_log":                [f"FRANK started for {business_id} at {datetime.now().isoformat()}"]
    }

    graph      = build_frank_graph()
    final_state = graph.invoke(initial_state)

    # print trace
    logger.info("Trace:\n" + "\n".join(final_state["trace_log"]))

    return final_state


if __name__ == "__main__":
    import sys
    business = sys.argv[1] if len(sys.argv) > 1 else "Marathon Deli"
    location = sys.argv[2] if len(sys.argv) > 2 else "College Park MD"
    btype    = sys.argv[3] if len(sys.argv) > 3 else "restaurant"
    cluster  = sys.argv[4] if len(sys.argv) > 4 else "A"

    result = run_frank(
        business_id=business,
        location=location,
        business_type=btype,
        cluster=cluster,
        dataset={
            "monthly_revenue": 85000,
            "employees": [
                {"name": "Priya",  "role": "Cashier",        "hourly_rate": 14, "hours_per_week": 38, "performance_notes": "excellent customer feedback consistent"},
                {"name": "Carlos", "role": "Delivery Driver", "hourly_rate": 15, "hours_per_week": 30, "performance_notes": "3 late deliveries this month", "late_delivery_pct": 12},
                {"name": "Tom",    "role": "Manager",         "hourly_rate": 25, "hours_per_week": 50, "performance_notes": "overtime managing weekend rush alone"},
            ],
            "delivery_fees": {"doordash_pct": 30}
        }
    )

    if result["conflicts"]:
        print("\n=== CONFLICTS RESOLVED ===")
        for c in result["conflicts"]:
            print(f"  {c.conflict_type}: {c.resolution_strategy} → {c.outcome}")

    print(f"\n=== EMPLOYEE ALERTS ({len(result['employee_alerts'])}) ===")
    for a in result["employee_alerts"]:
        print(f"  → {a['to']}: {a['message'][:80]}")