import sys
import os
import json
from pathlib import Path
from typing import Optional

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

from sage.orchestrator.frank import run_frank

_ROOT            = Path(__file__).resolve().parent.parent.parent.parent
DATASET_PATH     = _ROOT / "sage/data/active_dataset.json"
LAST_OUTPUT_PATH = _ROOT / "sage/data/last_frank_output.json"


def load_active_dataset() -> Optional[dict]:
    try:
        if DATASET_PATH.exists():
            return json.loads(DATASET_PATH.read_text())
    except Exception:
        pass
    return None


def save_active_dataset(dataset: dict):
    DATASET_PATH.parent.mkdir(parents=True, exist_ok=True)
    DATASET_PATH.write_text(json.dumps(dataset, indent=2))


def save_frank_output(output: dict):
    LAST_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    LAST_OUTPUT_PATH.write_text(json.dumps(output, indent=2, default=str))


def load_frank_output() -> Optional[dict]:
    try:
        if LAST_OUTPUT_PATH.exists():
            return json.loads(LAST_OUTPUT_PATH.read_text())
    except Exception:
        pass
    return None


def _sanitize(obj):
    """Round-trip through JSON to strip numpy / non-serializable types."""
    import numpy as np

    class _Enc(json.JSONEncoder):
        def default(self, o):
            if isinstance(o, np.bool_):   return bool(o)
            if isinstance(o, np.integer): return int(o)
            if isinstance(o, np.floating):return float(o)
            if isinstance(o, np.ndarray): return o.tolist()
            return super().default(o)

    return json.loads(json.dumps(obj, cls=_Enc))


# ── Lightweight employee briefing — no external API calls ─────────────────────

_ROLE_TASKS = {
    "cashier": [
        "Count & verify opening cash in drawer",
        "Process all transactions accurately",
        "Handle customer complaints promptly",
        "Log tips received at end of shift",
        "Balance drawer and close out register",
        "Clean register area before handoff",
    ],
    "cook": [
        "Check food inventory before service",
        "Prep stations per today's menu",
        "Log food safety temps every 2 hours",
        "Review specials and 86'd items",
        "Clean & sanitize workstation at close",
    ],
    "shift_supervisor": [
        "Brief staff on today's priorities",
        "Review last shift's handoff notes",
        "Approve any schedule change requests",
        "Monitor all cash drawer counts",
        "File end-of-shift report",
    ],
    "front_desk": [
        "Check reservation list and walk-ins",
        "Greet and seat customers",
        "Communicate wait times accurately",
        "Coordinate with kitchen on delays",
        "Update seating chart at end of shift",
    ],
    "delivery_driver": [
        "Check DoorDash / delivery queue",
        "Confirm pickup times with kitchen",
        "Track tips per delivery run",
        "Report any failed deliveries",
        "Submit mileage log at end of shift",
    ],
    "default": [
        "Complete opening checklist",
        "Review today's specials",
        "Check inventory levels",
        "Assist team during rush",
        "Prep for evening service",
    ],
}


def _role_tasks(role: str) -> list:
    r = (role or "").lower().replace(" ", "_")
    aliases = {
        "supervisor": "shift_supervisor", "manager": "shift_supervisor",
        "driver": "delivery_driver", "delivery": "delivery_driver",
    }
    key = aliases.get(r, r)
    return _ROLE_TASKS.get(key, _ROLE_TASKS["default"])


def get_employee_briefing(dataset: dict) -> dict:
    """Build employee view from dataset only — always fast, no EXA/Claude calls."""
    employees = dataset.get("employees", [])

    star_kw = ["outstanding", "exceptional", "rising star", "100/100",
               "consistently praised", "specifically request", "excellent"]
    eotw = {}
    for emp in employees:
        notes = (emp.get("performance_notes") or "").lower()
        if any(kw in notes for kw in star_kw):
            eotw = {"name": emp["name"], "role": emp.get("role", ""), "score": 95}
            break
    if not eotw and employees:
        eotw = {"name": employees[0]["name"], "role": employees[0].get("role", ""), "score": 80}

    warn_rules = [
        ("overtime",     "Working overtime this week — review hours with manager.", "high"),
        ("near-miss",    "Health-code concern on record — retraining required.",    "high"),
        ("late arrival", "Punctuality flagged — please check schedule.",            "medium"),
        ("needs review", "Performance review scheduled.",                           "medium"),
    ]
    warnings = []
    for emp in employees:
        notes = (emp.get("performance_notes") or "").lower()
        for kw, msg, urgency in warn_rules:
            if kw in notes:
                warnings.append({
                    "employee": emp["name"], "role": emp.get("role", ""),
                    "message": msg, "urgency": urgency,
                })
                break

    rec_kw = ["outstanding", "exceptional", "100/100", "consistently praised",
              "rising star", "specifically request", "high upsell",
              "high doordash ratings", "excellent customer feedback"]
    recognitions = []
    for emp in employees:
        notes = (emp.get("performance_notes") or "").lower()
        if any(kw in notes for kw in rec_kw):
            recognitions.append({
                "employee": emp["name"], "role": emp.get("role", ""),
                "message": emp.get("performance_notes", ""),
                "urgency": "low",
            })

    rush_hours = []
    try:
        from sage.agents.pulse import emit_pulse_signal, MARATHON_DELI
        pulse = emit_pulse_signal(MARATHON_DELI)
        rush_hours = [r["window"] for r in pulse.get("rush_hours", [])]
    except Exception:
        rush_hours = []

    business_name = dataset.get("business_id", "your business")
    frank_line = (
        f"{eotw['name']} is this week's star performer! "
        f"Rush windows tonight: {rush_hours[0] if rush_hours else 'check schedule'}."
        if eotw else
        f"{business_name} is on pace today. Next rush: {rush_hours[0] if rush_hours else 'check schedule'}."
    )

    # Build team overview — each employee with role + shift info
    team_today = []
    for emp in employees:
        role = emp.get("role", "")
        r = role.lower().replace(" ", "_")
        from sage.agents.crew_stub import ROLE_DEFAULTS, _DEFAULT_ROLE_DEFAULTS, _normalize_role
        rd = ROLE_DEFAULTS.get(_normalize_role(r), _DEFAULT_ROLE_DEFAULTS)
        team_today.append({
            "name": emp["name"],
            "role": role,
            "hours_per_week": emp.get("hours_per_week", rd.get("default_max_hours", 20)),
            "shift_start": rd["preferred_start"],
            "shift_end": rd["preferred_end"],
            "preferred_days": rd["preferred_days"],
        })

    # Primary tasks — use first employee's role as a hint (employee-facing view)
    primary_role = employees[0].get("role", "") if employees else ""

    return {
        "frank_line": frank_line,
        "employee_of_the_week": eotw,
        "warnings": warnings,
        "recognitions": recognitions,
        "rush_hours": rush_hours,
        "tasks": _role_tasks(primary_role),
        "role_tasks_map": {emp["name"]: _role_tasks(emp.get("role", "")) for emp in employees},
        "team_today": team_today,
    }


# ── Fallback briefing — PULSE + CREW only ─────────────────────────────────────

def get_fallback_briefing(dataset: dict) -> dict:
    """Returns PULSE + CREW data when full FRANK pipeline is unavailable."""
    from sage.agents.pulse import emit_pulse_signal, MARATHON_DELI
    from sage.agents.crew_stub import get_all_shifts

    pulse, crew = {}, {}
    try:
        pulse = emit_pulse_signal(MARATHON_DELI)
    except Exception:
        pass
    try:
        employees = dataset.get("employees", [])
        crew = get_all_shifts(employees) if employees else {}
    except Exception:
        pass

    return _sanitize({
        "briefing_text": (
            "FRANK analysis queued — run the full pipeline to unlock VOICE & SHELF insights.\n"
            "PULSE and CREW data are live below."
        ),
        "recommendations": [],
        "conflicts": [],
        "forecast_72hr":       pulse.get("forecast_72hr", []),
        "deviation_pct":       pulse.get("deviation_pct", 0),
        "alert":               pulse.get("alert", False),
        "goals":               pulse.get("goals", {}),
        "rush_hours":          pulse.get("rush_hours", []),
        "pulse_summary":       pulse.get("summary", ""),
        "reviews":             [],
        "pricing_alerts":      [],
        "temporal_alerts":     [],
        "shelf_flags":         None,
        "cost_intelligence":   {},
        "employee_intelligence": {},
        "employee_feedback":   {},
        "employee_of_the_week": {},
        "health_score":        None,
        "staffing":            crew,
        "employee_alerts":     [],
    })


# ── Full FRANK pipeline ────────────────────────────────────────────────────────

def run_with_dataset(dataset: dict) -> dict:
    """Run the full FRANK pipeline using an uploaded dataset dict."""
    result = run_frank(
        business_id=dataset.get("business_id", ""),
        business_type=dataset.get("business_type", "restaurant"),
        location=dataset.get("location", ""),
        cluster=dataset.get("cluster", "A"),
        employees=dataset.get("employees"),
        dataset=dataset.get("dataset"),
    )

    pulse = result.get("pulse_output") or {}
    voice = result.get("voice_output") or {}
    shelf = result.get("shelf_output") or {}
    crew  = result.get("crew_output")  or {}

    emp_intel    = shelf.get("employee_intelligence", {})
    emp_feedback = shelf.get("employee_feedback", {})

    try:
        from sage.preferences.owner_model import load_model as _lpm, score_recommendation as _sr
        _pref_model = _lpm()
    except Exception:
        _pref_model = None

    out = _sanitize({
        "briefing_text":       result.get("briefing_text", ""),
        "recommendations": [
            {
                "id":                rec.id,
                "agent":             rec.agent,
                "category":          rec.category,
                "title":             rec.title,
                "description":       rec.description,
                "impact":            rec.financial_impact,
                "urgency":           rec.urgency,
                "requires_approval": rec.approval_status.value == "requires_approval",
                "owner":             rec.owner,
                "deadline":          rec.deadline,
                "merged_from":       rec.merged_from,
                "approval_score":    _sr({"category": rec.category, "agent": rec.agent,
                                          "financial_impact": rec.financial_impact, "urgency": rec.urgency},
                                         _pref_model) if _pref_model else None,
            }
            for rec in result.get("resolved_recommendations", [])
        ],
        "conflicts": [
            {
                "conflict_type":       c.conflict_type,
                "resolution_strategy": c.resolution_strategy,
                "outcome":             c.outcome,
            }
            for c in result.get("conflicts", [])
        ],
        "forecast_72hr":         pulse.get("forecast_72hr", []),
        "deviation_pct":         pulse.get("deviation_pct", 0),
        "alert":                 pulse.get("alert", False),
        "goals":                 pulse.get("goals", {}),
        "rush_hours":            pulse.get("rush_hours", []),
        "pulse_summary":         pulse.get("summary", ""),
        "reviews":               voice.get("replies", []),
        "pricing_alerts":        voice.get("pricing_alerts", []),
        "temporal_alerts":       voice.get("temporal_alerts", []),
        "shelf_flags":           shelf if shelf.get("flag") else None,
        "cost_intelligence":     shelf.get("cost_intelligence", {}),
        "employee_intelligence": emp_intel,
        "employee_feedback":     emp_feedback,
        "employee_of_the_week":  emp_intel.get("employee_of_the_week", {}),
        "health_score":          shelf.get("executive_summary", {}).get("business_health_score"),
        "staffing":              crew,
        "employee_alerts":       result.get("employee_alerts", []),
        "dataset":               {"business_id": dataset.get("business_id"), "location": dataset.get("location"), "monthly_revenue": dataset.get("monthly_revenue")},
    })
    save_frank_output(out)
    return out


# ── LLM dataset pipeline — uses pre-computed VOICE + SHELF outputs ────────────

def run_with_llm_dataset(dataset: dict) -> dict:
    """
    Run the full FRANK pipeline using pre-computed LLM outputs baked into the dataset.
    PULSE and CREW run live; VOICE and SHELF use dataset["llm_outputs"] directly,
    so no EXA or Claude API calls are needed.
    """
    from sage.agents.pulse import emit_pulse_signal, MARATHON_DELI
    from sage.agents.crew_stub import run_crew_stub, get_all_shifts

    llm = dataset.get("llm_outputs", {})
    voice = llm.get("voice", {})
    shelf = llm.get("shelf", {})
    employees = dataset.get("employees", [])

    # PULSE — live deterministic model
    pulse = {}
    try:
        pulse = emit_pulse_signal(MARATHON_DELI)
    except Exception:
        pass

    # CREW — live, built from dataset employees
    crew = {}
    try:
        crew = get_all_shifts(employees) if employees else {}
    except Exception:
        pass

    emp_intel    = shelf.get("employee_intelligence", {})
    emp_feedback = shelf.get("employee_feedback", {})
    # Fall back: refresher format puts eotw directly at shelf level
    if not emp_intel.get("employee_of_the_week") and shelf.get("employee_of_the_week"):
        emp_intel = {**emp_intel, "employee_of_the_week": shelf["employee_of_the_week"]}
    health = (shelf.get("executive_summary", {}).get("business_health_score")
              or shelf.get("business_health_score"))

    # Build recommendations from all four agent outputs
    recs = []

    # PULSE recs
    if pulse.get("alert"):
        recs.append({
            "id": "pulse_alert", "agent": "PULSE", "category": "revenue",
            "title": "Revenue Anomaly Detected",
            "description": f"Deviation: {pulse.get('deviation_pct', 0)*100:.1f}% from forecast.",
            "impact": pulse.get("financial_impact", 0),
            "urgency": "high", "requires_approval": True,
            "owner": "Owner", "deadline": "", "merged_from": [],
        })

    # VOICE recs — from pre-computed reviews
    for reply in voice.get("replies", []):
        if reply.get("priority") in ["critical", "high"]:
            recs.append({
                "id": f"voice_reply_{reply.get('review_id','x')}",
                "agent": "VOICE", "category": "reputation",
                "title": f"Respond to {reply.get('rating','?')}★ review from {reply.get('author','')}",
                "description": reply.get("draft_reply", "")[:120],
                "impact": 150.0 if reply.get("priority") == "critical" else 50.0,
                "urgency": reply.get("priority", "medium"),
                "requires_approval": True,
                "owner": "Manager", "deadline": "", "merged_from": [],
            })
    for alert in voice.get("pricing_alerts", []):
        recs.append({
            "id": f"voice_pricing_{alert.get('alert_id','x')}",
            "agent": "VOICE", "category": "cost",
            "title": alert.get("recommended_action", "Pricing action"),
            "description": alert.get("detail", ""),
            "impact": alert.get("financial_impact", 0),
            "urgency": alert.get("urgency", "medium"),
            "requires_approval": True,
            "owner": "Owner", "deadline": alert.get("deadline", ""), "merged_from": [],
        })

    # SHELF recs — from pre-computed cost intelligence
    cost = shelf.get("cost_intelligence", {})
    for item in cost.get("flagged_items", []):
        recs.append({
            "id": f"shelf_cost_{item.get('item','x').replace(' ','_')}",
            "agent": "SHELF", "category": "cost",
            "title": item.get("recommended_action", f"Review {item.get('item','')}"),
            "description": f"{item.get('item','')} — {item.get('root_cause','')}",
            "impact": abs(item.get("financial_impact", item.get("monthly_impact", 0))),
            "urgency": item.get("urgency", "medium"),
            "requires_approval": True,
            "owner": "Owner", "deadline": "", "merged_from": [],
        })

    # CREW rec
    if crew.get("shifts"):
        first = crew["shifts"][0]
        if first.get("staffing_status") != "balanced":
            recs.append({
                "id": f"crew_{first.get('shift_id','x')}",
                "agent": "CREW", "category": "staffing",
                "title": f"Staffing: {first.get('adjustment','')}",
                "description": f"{first.get('shift_date','')} {first.get('shift_start','')}–{first.get('shift_end','')}",
                "impact": first.get("financial_impact", 0),
                "urgency": "high", "requires_approval": True,
                "owner": "Manager", "deadline": "", "merged_from": [],
            })

    # Score and sort: use owner preference model if available, else urgency+impact
    try:
        from sage.preferences.owner_model import load_model as _lpm, score_recommendation as _sr, reorder_recommendations as _ro
        _pref_model = _lpm()
        for r in recs:
            r["approval_score"] = _sr({"category": r["category"], "agent": r["agent"],
                                        "financial_impact": r["impact"], "urgency": r["urgency"]}, _pref_model)
        if _pref_model.total_decisions >= 3:
            recs = _ro(recs, _pref_model)
        else:
            _order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
            recs.sort(key=lambda r: (_order.get(r["urgency"], 2), -r["impact"]))
    except Exception:
        _order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        recs.sort(key=lambda r: (_order.get(r["urgency"], 2), -r["impact"]))

    total_impact = sum(r["impact"] for r in recs)

    from datetime import datetime
    briefing_lines = [
        f"SAGE Morning Briefing — {datetime.now().strftime('%A, %b %d %Y')}",
        f"Business: {dataset.get('business_id','')}",
        "",
        f"Health Score: {health}/100" if health else "",
        f"{len(recs)} recommendations | ${total_impact:,.0f} total impact",
        "",
    ]
    if recs:
        briefing_lines.append("Top actions:")
        for r in recs[:3]:
            briefing_lines.append(f"  [{r['agent']}] {r['title']} (${r['impact']:,.0f})")
    briefing_text = "\n".join(l for l in briefing_lines if l is not None)

    # Merge raw dataset employee fields (hourly_rate, hours_per_week) into emp_intel employees
    dataset_emp_map = {e["name"]: e for e in employees}
    merged_emp_list = []
    for emp in emp_intel.get("employees", []):
        raw = dataset_emp_map.get(emp.get("name", ""), {})
        merged = {**emp}
        if raw.get("hourly_rate") and not merged.get("hourly_rate"):
            merged["hourly_rate"] = raw["hourly_rate"]
        if raw.get("hours_per_week") and not merged.get("hours_per_week"):
            merged["hours_per_week"] = raw["hours_per_week"]
        merged_emp_list.append(merged)
    if merged_emp_list:
        emp_intel = {**emp_intel, "employees": merged_emp_list}

    # Pull monthly_revenue from wherever it lives in the dataset
    _sub = dataset.get("dataset", {})
    _monthly_rev = dataset.get("monthly_revenue") or _sub.get("monthly_revenue")
    if _monthly_rev and not cost.get("monthly_revenue"):
        cost = {**cost, "monthly_revenue": _monthly_rev}
    # Also expose top items if available
    if _sub.get("top_items") and not cost.get("top_items"):
        cost = {**cost, "top_items": _sub["top_items"]}

    output = _sanitize({
        "briefing_text":         briefing_text,
        "recommendations":       recs,
        "conflicts":             [],
        "forecast_72hr":         pulse.get("forecast_72hr", []),
        "deviation_pct":         pulse.get("deviation_pct", 0),
        "alert":                 pulse.get("alert", False),
        "goals":                 pulse.get("goals", {}),
        "rush_hours":            pulse.get("rush_hours", []),
        "pulse_summary":         pulse.get("summary", ""),
        "reviews":               voice.get("replies", []),
        "pricing_alerts":        voice.get("pricing_alerts", []),
        "temporal_alerts":       voice.get("temporal_alerts", []),
        "shelf_flags":           shelf if shelf.get("flag") else None,
        "cost_intelligence":     cost,
        "employee_intelligence": emp_intel,
        "employee_feedback":     emp_feedback,
        "employee_of_the_week":  emp_intel.get("employee_of_the_week", {}),
        "health_score":          health,
        "staffing":              crew,
        "employee_alerts":       emp_feedback.get("warnings", []),
        "dataset":               {"business_id": dataset.get("business_id"), "location": dataset.get("location"), "monthly_revenue": _monthly_rev},
    })
    save_frank_output(output)
    return output


# kept for backward compatibility with any remaining direct callers
def get_daily_briefing(business_config: Optional[dict] = None) -> dict:
    if business_config is None:
        dataset = load_active_dataset()
        if dataset is None:
            raise ValueError("No dataset uploaded. POST /run/dataset first.")
        business_config = dataset
    return run_with_dataset(business_config)
