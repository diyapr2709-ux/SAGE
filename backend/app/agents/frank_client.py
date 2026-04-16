import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

from sage.orchestrator.frank import run_frank


import json

def _sanitize(obj):
    """Round-trip through JSON to strip all numpy / non-serializable types."""
    import numpy as np

    class _Enc(json.JSONEncoder):
        def default(self, o):
            if isinstance(o, np.bool_):
                return bool(o)
            if isinstance(o, np.integer):
                return int(o)
            if isinstance(o, np.floating):
                return float(o)
            if isinstance(o, np.ndarray):
                return o.tolist()
            return super().default(o)

    return json.loads(json.dumps(obj, cls=_Enc))


def get_daily_briefing(business_config=None):
    """Run the full FRANK pipeline and return formatted data for the dashboard."""
    if business_config is None:
        business_config = {
            "business_id": "Marathon Deli",
            "business_type": "restaurant",
            "location": "College Park MD",
            "cluster": "A",
            "employees": [
                {"name": "Aarav Patel",    "role": "Cashier",         "hourly_rate": 14, "hours_per_week": 18, "performance_notes": "excellent customer feedback, consistent"},
                {"name": "Michael Rivera", "role": "Shift Supervisor", "hourly_rate": 22, "hours_per_week": 40, "performance_notes": "strong leader, slight overtime"},
                {"name": "Sophia Kim",     "role": "Cashier",          "hourly_rate": 14, "hours_per_week": 12, "performance_notes": "reliable, good upsell rate"},
                {"name": "Daniel Brooks",  "role": "Cook",             "hourly_rate": 16, "hours_per_week": 25, "performance_notes": "fast prep, one health-code near-miss"},
                {"name": "Emily Chen",     "role": "Front Desk",       "hourly_rate": 13, "hours_per_week": 12, "performance_notes": "student worker, friendly"},
            ],
            "dataset": {"monthly_revenue": 85000, "delivery_fees": {"doordash_pct": 30}},
        }
    result = run_frank(
        business_id=business_config.get("business_id", "demo_business"),
        business_type=business_config.get("business_type", "restaurant"),
        location=business_config.get("location", ""),
        cluster=business_config.get("cluster", "A"),
        employees=business_config.get("employees"),
        dataset=business_config.get("dataset"),
    )

    # Safely extract nested data
    pulse = result.get("pulse_output") or {}
    voice = result.get("voice_output") or {}
    shelf = result.get("shelf_output") or {}
    crew = result.get("crew_output") or {}

    emp_intel = shelf.get("employee_intelligence", {})
    emp_feedback = shelf.get("employee_feedback", {})

    return _sanitize({
        "briefing_text": result.get("briefing_text", ""),
        "recommendations": [
            {
                "id": rec.id,
                "agent": rec.agent,
                "category": rec.category,
                "title": rec.title,
                "description": rec.description,
                "impact": rec.financial_impact,
                "urgency": rec.urgency,
                "requires_approval": rec.approval_status.value == "requires_approval",
                "owner": rec.owner,
                "deadline": rec.deadline,
                "merged_from": rec.merged_from,
            }
            for rec in result.get("resolved_recommendations", [])
        ],
        "conflicts": [
            {
                "conflict_type": c.conflict_type,
                "resolution_strategy": c.resolution_strategy,
                "outcome": c.outcome,
            }
            for c in result.get("conflicts", [])
        ],
        "forecast_72hr": pulse.get("forecast_72hr", []),
        "deviation_pct": pulse.get("deviation_pct", 0),
        "alert": pulse.get("alert", False),
        "goals": pulse.get("goals", {}),
        "rush_hours": pulse.get("rush_hours", []),
        "pulse_summary": pulse.get("summary", ""),
        "reviews": voice.get("replies", []),
        "pricing_alerts": voice.get("pricing_alerts", []),
        "temporal_alerts": voice.get("temporal_alerts", []),
        "shelf_flags": shelf if shelf.get("flag") else None,
        "cost_intelligence": shelf.get("cost_intelligence", {}),
        "employee_intelligence": emp_intel,
        "employee_feedback": emp_feedback,
        "employee_of_the_week": emp_intel.get("employee_of_the_week", {}),
        "health_score": shelf.get("executive_summary", {}).get("business_health_score"),
        "staffing": crew,
        "employee_alerts": result.get("employee_alerts", []),
    })