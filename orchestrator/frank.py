"""
FRANK Orchestrator for SAGE (Small Business Autonomous Growth Engine)
Implements LangGraph supervisor node, conflict resolution, briefing assembly,
and $200 approval threshold enforcement.
"""

import json
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum

from langgraph.graph import StateGraph, END
from typing_extensions import TypedDict

# Import agent functions
from sage.agents.pulse import pulse_tool
from sage.agents.voice import run as voice_run
from sage.agents.shelf_stub import run_shelf_stub
from sage.agents.crew_stub import run_crew_stub

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


# ---------- Data Models ----------
class ApprovalStatus(Enum):
    AUTO_APPROVED = "auto_approved"
    REQUIRES_APPROVAL = "requires_approval"
    PENDING = "pending"


@dataclass
class Recommendation:
    """Unified recommendation from any agent."""
    id: str
    agent: str
    category: str  # "revenue", "reputation", "cost", "staffing", "composite"
    title: str
    description: str
    financial_impact: float
    approval_status: ApprovalStatus
    raw_data: Dict[str, Any] = field(default_factory=dict)
    merged_from: List[str] = field(default_factory=list)  # IDs of merged signals


@dataclass
class ConflictResolution:
    """Record of how a conflict was resolved."""
    conflict_type: str
    signals_involved: List[str]
    resolution_strategy: str
    outcome: str


# ---------- State Definition ----------
class FrankState(TypedDict):
    """State shared across LangGraph nodes."""
    business_config: Dict[str, Any]
    pulse_output: Optional[Dict[str, Any]]
    voice_output: Optional[Dict[str, Any]]
    shelf_output: Optional[Dict[str, Any]]
    crew_output: Optional[Dict[str, Any]]
    raw_recommendations: List[Recommendation]
    resolved_recommendations: List[Recommendation]
    conflicts: List[ConflictResolution]
    briefing_text: str
    trace_log: List[str]


# ---------- Agent Invocation Nodes ----------
def run_pulse(state: FrankState) -> FrankState:
    """Invoke PULSE agent."""
    logger.info("Running PULSE agent...")
    config = state["business_config"]
    # pulse_tool is a LangChain tool; invoke with empty string (uses default config)
    pulse_output = pulse_tool.invoke("")
    state["pulse_output"] = pulse_output
    state["trace_log"].append(f"PULSE executed: alert={pulse_output['alert']}, impact=${pulse_output['financial_impact']}")
    return state


def run_voice(state: FrankState) -> FrankState:
    """Invoke VOICE agent (Cluster A)."""
    logger.info("Running VOICE agent...")
    config = state["business_config"]
    voice_output = voice_run(
        business_id=config.get("business_id", "demo_business"),
        business_type=config.get("business_type", "restaurant"),
        location=config.get("location", "San Francisco"),
        cluster="A"
    )
    state["voice_output"] = voice_output
    state["trace_log"].append(f"VOICE executed: flag={voice_output['flag']}, impact=${voice_output['financial_impact']}")
    return state


def run_shelf(state: FrankState) -> FrankState:
    """Invoke SHELF stub."""
    logger.info("Running SHELF stub...")
    # Use default scenario; in production could be configurable
    shelf_output = run_shelf_stub("price_increase_flag")
    state["shelf_output"] = shelf_output
    state["trace_log"].append(f"SHELF executed: flag={shelf_output['flag']}, impact=${shelf_output['impact']}")
    return state


def run_crew(state: FrankState) -> FrankState:
    """Invoke CREW stub."""
    logger.info("Running CREW stub...")
    crew_output = run_crew_stub("understaffed_evening")
    state["crew_output"] = crew_output
    state["trace_log"].append(f"CREW executed: status={crew_output['staffing_status']}, impact=${crew_output['financial_impact']}")
    return state


# ---------- Recommendation Extraction ----------
def extract_pulse_recommendations(pulse_output: Dict) -> List[Recommendation]:
    """Convert PULSE output to unified recommendations."""
    recs = []
    
    # Main revenue alert
    if pulse_output.get("alert"):
        rec = Recommendation(
            id="pulse_alert",
            agent="PULSE",
            category="revenue",
            title="Revenue Anomaly Detected",
            description=f"Revenue deviation: {pulse_output['deviation_pct']*100:.1f}% from expected. Financial impact: ${pulse_output['financial_impact']}",
            financial_impact=pulse_output["financial_impact"],
            approval_status=ApprovalStatus.AUTO_APPROVED,  # Informational only
            raw_data=pulse_output
        )
        recs.append(rec)
    
    # Rush hour staffing suggestions (could be merged later)
    for rush in pulse_output.get("rush_hours", []):
        rec = Recommendation(
            id=f"pulse_rush_{rush['window'].replace(' ', '_')}",
            agent="PULSE",
            category="staffing",
            title=f"Rush Hour: {rush['window']}",
            description=f"Expected revenue: ${rush['expected_revenue']}. Consider staffing adjustment.",
            financial_impact=rush["expected_revenue"] * 0.15,  # estimated incremental
            approval_status=ApprovalStatus.REQUIRES_APPROVAL,
            raw_data=rush
        )
        recs.append(rec)
    
    # Goal gaps
    goals = pulse_output.get("goals", {})
    daily_gap = goals.get("daily", {}).get("gap", 0)
    if daily_gap < 0:  # behind target
        rec = Recommendation(
            id="pulse_daily_gap",
            agent="PULSE",
            category="revenue",
            title="Behind Daily Target",
            description=f"Projected to miss daily goal by ${abs(daily_gap)}. Consider promotion.",
            financial_impact=abs(daily_gap),
            approval_status=ApprovalStatus.REQUIRES_APPROVAL,
            raw_data=goals["daily"]
        )
        recs.append(rec)
    
    return recs


def extract_voice_recommendations(voice_output: Dict) -> List[Recommendation]:
    """Convert VOICE output to unified recommendations."""
    recs = []
    
    # Review replies
    for reply in voice_output.get("replies", []):
        if reply.get("priority") in ["critical", "high"]:
            rec = Recommendation(
                id=f"voice_reply_{reply['review_id']}",
                agent="VOICE",
                category="reputation",
                title=f"Respond to {reply['rating']}★ review",
                description=reply["draft_reply"][:100] + "...",
                financial_impact=50.0 if reply["priority"] == "high" else 150.0,
                approval_status=ApprovalStatus.REQUIRES_APPROVAL,
                raw_data=reply
            )
            recs.append(rec)
    
    # Pricing alerts
    for alert in voice_output.get("pricing_alerts", []):
        rec = Recommendation(
            id=f"voice_pricing_{alert['alert_id']}",
            agent="VOICE",
            category="cost",
            title=alert["recommended_action"],
            description=alert["detail"],
            financial_impact=alert.get("financial_impact", 0.0),
            approval_status=ApprovalStatus.REQUIRES_APPROVAL,
            raw_data=alert
        )
        recs.append(rec)
    
    # Temporal alerts
    for alert in voice_output.get("temporal_alerts", []):
        rec = Recommendation(
            id=f"voice_temporal_{alert['alert_id']}",
            agent="VOICE",
            category="staffing",
            title=alert["recommended_action"],
            description=alert["insight"],
            financial_impact=alert.get("financial_impact", 0.0),
            approval_status=ApprovalStatus.REQUIRES_APPROVAL,
            raw_data=alert
        )
        recs.append(rec)
    
    # Health alerts
    for alert in voice_output.get("health_alerts", []):
        rec = Recommendation(
            id=f"voice_health_{alert['alert_id']}",
            agent="VOICE",
            category="cost",  # or compliance
            title=alert["recommended_action"],
            description=alert["detail"],
            financial_impact=0.0,  # non-financial
            approval_status=ApprovalStatus.REQUIRES_APPROVAL,
            raw_data=alert
        )
        recs.append(rec)
    
    # Menu recommendations
    for menu_rec in voice_output.get("menu_recommendations", []):
        rec = Recommendation(
            id=f"voice_menu_{menu_rec['type']}_{menu_rec['item']}",
            agent="VOICE",
            category="cost",
            title=f"{menu_rec['type'].title()}: {menu_rec['item']}",
            description=menu_rec["reason"],
            financial_impact=menu_rec.get("financial_impact", 0.0),
            approval_status=ApprovalStatus.REQUIRES_APPROVAL,
            raw_data=menu_rec
        )
        recs.append(rec)
    
    # Social alerts
    for alert in voice_output.get("social_alerts", []):
        rec = Recommendation(
            id=f"voice_social_{alert['alert_id']}",
            agent="VOICE",
            category="reputation",
            title=alert["recommended_action"],
            description=alert["detail"],
            financial_impact=100.0,  # placeholder
            approval_status=ApprovalStatus.REQUIRES_APPROVAL,
            raw_data=alert
        )
        recs.append(rec)
    
    # Loyalty alerts
    for alert in voice_output.get("loyalty_alerts", []):
        rec = Recommendation(
            id=f"voice_loyalty_{alert['alert_id']}",
            agent="VOICE",
            category="reputation",
            title=alert["recommended_action"],
            description=alert["detail"],
            financial_impact=alert.get("ltv_at_risk", 0.0),
            approval_status=ApprovalStatus.REQUIRES_APPROVAL,
            raw_data=alert
        )
        recs.append(rec)
    
    return recs


def extract_shelf_recommendations(shelf_output: Dict) -> List[Recommendation]:
    """Convert SHELF stub output to unified recommendations."""
    recs = []
    if shelf_output.get("flag"):
        rec = Recommendation(
            id=f"shelf_{shelf_output['item_id']}",
            agent="SHELF",
            category="cost",
            title=shelf_output["recommended_action"],
            description=f"Item {shelf_output['item_id']} margin at {shelf_output['margin_pct']}%",
            financial_impact=shelf_output["impact"],
            approval_status=ApprovalStatus.REQUIRES_APPROVAL,
            raw_data=shelf_output
        )
        recs.append(rec)
    return recs


def extract_crew_recommendations(crew_output: Dict) -> List[Recommendation]:
    """Convert CREW stub output to unified recommendations."""
    recs = []
    if crew_output.get("staffing_status") != "balanced":
        rec = Recommendation(
            id=f"crew_{crew_output['shift_id']}",
            agent="CREW",
            category="staffing",
            title=f"Staffing adjustment: {crew_output['adjustment']}",
            description=f"{crew_output['shift_date']} {crew_output['shift_start']}-{crew_output['shift_end']}",
            financial_impact=crew_output["financial_impact"],
            approval_status=ApprovalStatus.REQUIRES_APPROVAL,
            raw_data=crew_output
        )
        recs.append(rec)
    return recs


def collect_recommendations(state: FrankState) -> FrankState:
    """Extract all raw recommendations from agent outputs."""
    recs = []
    if state.get("pulse_output"):
        recs.extend(extract_pulse_recommendations(state["pulse_output"]))
    if state.get("voice_output"):
        recs.extend(extract_voice_recommendations(state["voice_output"]))
    if state.get("shelf_output"):
        recs.extend(extract_shelf_recommendations(state["shelf_output"]))
    if state.get("crew_output"):
        recs.extend(extract_crew_recommendations(state["crew_output"]))
    
    state["raw_recommendations"] = recs
    state["trace_log"].append(f"Collected {len(recs)} raw recommendations")
    return state


# ---------- Conflict Resolution ----------
def resolve_conflicts(state: FrankState) -> FrankState:
    """
    Detect and resolve conflicts between recommendations.
    Current rule: if PULSE alert (revenue anomaly) and CREW understaffing exist,
    merge into a single composite recommendation.
    """
    raw_recs = state["raw_recommendations"]
    conflicts = []
    
    # Find PULSE alert and CREW understaffing
    pulse_alert = None
    crew_understaff = None
    other_recs = []
    
    for rec in raw_recs:
        if rec.id == "pulse_alert":
            pulse_alert = rec
        elif rec.agent == "CREW" and "understaffed" in rec.raw_data.get("staffing_status", ""):
            crew_understaff = rec
        else:
            other_recs.append(rec)
    
    if pulse_alert and crew_understaff:
        # Merge them
        merged_title = "Revenue Anomaly + Understaffing Detected"
        merged_desc = (
            f"Revenue is off by {pulse_alert.raw_data['deviation_pct']*100:.1f}% "
            f"and shift {crew_understaff.raw_data['shift_id']} is understaffed. "
            f"Recommend increasing staff for that shift."
        )
        merged_impact = pulse_alert.financial_impact + crew_understaff.financial_impact
        merged_rec = Recommendation(
            id="merged_pulse_crew",
            agent="FRANK",
            category="composite",
            title=merged_title,
            description=merged_desc,
            financial_impact=merged_impact,
            approval_status=ApprovalStatus.REQUIRES_APPROVAL,
            raw_data={
                "pulse": pulse_alert.raw_data,
                "crew": crew_understaff.raw_data
            },
            merged_from=[pulse_alert.id, crew_understaff.id]
        )
        other_recs.append(merged_rec)
        conflicts.append(ConflictResolution(
            conflict_type="revenue_staffing_mismatch",
            signals_involved=[pulse_alert.id, crew_understaff.id],
            resolution_strategy="merge",
            outcome="Created composite recommendation"
        ))
        state["trace_log"].append(f"Merged PULSE alert and CREW understaffing into composite rec")
    else:
        other_recs = raw_recs  # no merge
    
    state["resolved_recommendations"] = other_recs
    state["conflicts"] = conflicts
    return state


# ---------- Approval Threshold and Ranking ----------
def apply_approval_threshold(state: FrankState) -> FrankState:
    """Enforce $200 limit: mark actions above threshold as requiring approval."""
    resolved = state["resolved_recommendations"]
    for rec in resolved:
        # Auto-approve informational items with zero/negative impact? We'll treat all non-zero as requiring approval
        if rec.financial_impact > 200.0:
            rec.approval_status = ApprovalStatus.REQUIRES_APPROVAL
            state["trace_log"].append(f"Rec '{rec.title}' impact ${rec.financial_impact} > $200, requires approval")
        elif rec.financial_impact == 0.0:
            rec.approval_status = ApprovalStatus.AUTO_APPROVED
        else:
            # For demo, all positive impact actions require approval (owner confirmation)
            rec.approval_status = ApprovalStatus.REQUIRES_APPROVAL
    return state


def rank_recommendations(state: FrankState) -> FrankState:
    """Sort recommendations by financial impact descending."""
    state["resolved_recommendations"].sort(key=lambda x: x.financial_impact, reverse=True)
    state["trace_log"].append("Ranked recommendations by financial impact")
    return state


# ---------- Briefing Formatter ----------
def format_whatsapp_briefing(state: FrankState) -> FrankState:
    """Generate WhatsApp-friendly briefing text."""
    config = state["business_config"]
    recs = state["resolved_recommendations"]
    
    lines = []
    lines.append(f"☕ *SAGE Morning Briefing* — {datetime.now().strftime('%A, %b %d')}")
    lines.append(f"Business: {config.get('business_id', 'Demo Business')}")
    lines.append("")
    
    # Summary stats
    total_impact = sum(r.financial_impact for r in recs)
    requires_approval = [r for r in recs if r.approval_status == ApprovalStatus.REQUIRES_APPROVAL]
    auto_approved = [r for r in recs if r.approval_status == ApprovalStatus.AUTO_APPROVED]
    
    lines.append(f"📊 *At a Glance*")
    lines.append(f"• {len(recs)} recommendations")
    lines.append(f"• {len(requires_approval)} require your approval")
    lines.append(f"• Total potential impact: ${total_impact:.2f}")
    lines.append("")
    
    # High priority (requires approval, high impact)
    if requires_approval:
        lines.append("*🔔 Actions Needing Approval*")
        for rec in requires_approval[:5]:  # top 5
            impact_str = f"${rec.financial_impact:.2f}" if rec.financial_impact else "—"
            lines.append(f"• *{rec.title}*")
            lines.append(f"  _{rec.description}_")
            lines.append(f"  Impact: {impact_str} | Agent: {rec.agent}")
            if rec.merged_from:
                lines.append(f"  (Merged from: {', '.join(rec.merged_from)})")
            lines.append("")
    
    # Auto-approved (informational)
    if auto_approved:
        lines.append("*ℹ️ Informational*")
        for rec in auto_approved[:3]:
            lines.append(f"• {rec.title}: {rec.description}")
        lines.append("")
    
    # Pulse summary if available
    if state.get("pulse_output") and state["pulse_output"].get("summary"):
        lines.append("*📈 Revenue Forecast*")
        lines.append(state["pulse_output"]["summary"])
        lines.append("")
    
    lines.append("_Reply with 'approve X' or 'ignore X' to manage_")
    
    briefing = "\n".join(lines)
    state["briefing_text"] = briefing
    state["trace_log"].append("WhatsApp briefing formatted")
    return state


# ---------- Send (Stub) ----------
def send_briefing(state: FrankState) -> FrankState:
    """Send briefing via WhatsApp Business API (stub for demo)."""
    # In production, use Twilio WhatsApp API
    logger.info("=== SAGE BRIEFING (WhatsApp) ===")
    print(state["briefing_text"])
    logger.info("=== END BRIEFING ===")
    state["trace_log"].append("Briefing sent to WhatsApp (stub)")
    return state


# ---------- LangGraph Construction ----------
def build_frank_graph() -> StateGraph:
    """Build the LangGraph for FRANK orchestration."""
    workflow = StateGraph(FrankState)
    
    # Add nodes
    workflow.add_node("run_pulse", run_pulse)
    workflow.add_node("run_voice", run_voice)
    workflow.add_node("run_shelf", run_shelf)
    workflow.add_node("run_crew", run_crew)
    workflow.add_node("collect_recommendations", collect_recommendations)
    workflow.add_node("resolve_conflicts", resolve_conflicts)
    workflow.add_node("apply_approval_threshold", apply_approval_threshold)
    workflow.add_node("rank_recommendations", rank_recommendations)
    workflow.add_node("format_briefing", format_whatsapp_briefing)
    workflow.add_node("send_briefing", send_briefing)
    
    # Set entry point: run all agents in parallel (or sequentially)
    # Since we can't do true parallel in LangGraph easily, we'll chain.
    workflow.set_entry_point("run_pulse")
    workflow.add_edge("run_pulse", "run_voice")
    workflow.add_edge("run_voice", "run_shelf")
    workflow.add_edge("run_shelf", "run_crew")
    workflow.add_edge("run_crew", "collect_recommendations")
    workflow.add_edge("collect_recommendations", "resolve_conflicts")
    workflow.add_edge("resolve_conflicts", "apply_approval_threshold")
    workflow.add_edge("apply_approval_threshold", "rank_recommendations")
    workflow.add_edge("rank_recommendations", "format_briefing")
    workflow.add_edge("format_briefing", "send_briefing")
    workflow.add_edge("send_briefing", END)
    
    return workflow.compile()


# ---------- Main Orchestrator Function ----------
def run_frank(
    business_id: str = "demo_business",
    business_type: str = "restaurant",
    location: str = "San Francisco",
    config_overrides: Optional[Dict] = None
) -> Dict[str, Any]:
    """
    Run the full FRANK orchestration pipeline.
    Returns final state including briefing and trace log.
    """
    config = {
        "business_id": business_id,
        "business_type": business_type,
        "location": location,
    }
    if config_overrides:
        config.update(config_overrides)
    
    initial_state: FrankState = {
        "business_config": config,
        "pulse_output": None,
        "voice_output": None,
        "shelf_output": None,
        "crew_output": None,
        "raw_recommendations": [],
        "resolved_recommendations": [],
        "conflicts": [],
        "briefing_text": "",
        "trace_log": [f"FRANK started for {business_id} at {datetime.now().isoformat()}"]
    }
    
    graph = build_frank_graph()
    final_state = graph.invoke(initial_state)
    
    # Dump trace log for debugging
    logger.info("Trace log:\n" + "\n".join(final_state["trace_log"]))
    
    return final_state


# ---------- CLI Entrypoint ----------
if __name__ == "__main__":
    import sys
    business_id = sys.argv[1] if len(sys.argv) > 1 else "Sightglass Coffee"
    location = sys.argv[2] if len(sys.argv) > 2 else "San Francisco"
    btype = sys.argv[3] if len(sys.argv) > 3 else "restaurant"
    
    result = run_frank(business_id=business_id, location=location, business_type=btype)
    
    # Print conflicts if any
    if result["conflicts"]:
        print("\n=== CONFLICTS RESOLVED ===")
        for c in result["conflicts"]:
            print(f"- {c.conflict_type}: {c.resolution_strategy} -> {c.outcome}")
