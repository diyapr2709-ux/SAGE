import sys
import os
# Add project root to Python path so we can import from 'sage' and 'orchestrator'
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

from orchestrator.frank import run_frank

def get_daily_briefing(business_config=None):
    """Run the full FRANK pipeline and return formatted data for the dashboard."""
    if business_config is None:
        business_config = {
            "business_id": "Marathon Deli",
            "business_type": "restaurant",
            "location": "College Park"
        }
    result = run_frank(
        business_id=business_config["business_id"],
        business_type=business_config["business_type"],
        location=business_config["location"]
    )

    # Safely extract nested data
    pulse = result.get("pulse_output") or {}
    voice = result.get("voice_output") or {}
    shelf = result.get("shelf_output") or {}
    crew = result.get("crew_output") or {}

    return {
        "briefing_text": result.get("briefing_text", ""),
        "recommendations": [
            {
                "id": rec.id,
                "agent": rec.agent,
                "title": rec.title,
                "description": rec.description,
                "impact": rec.financial_impact,
                "requires_approval": rec.approval_status.value == "requires_approval"
            }
            for rec in result.get("resolved_recommendations", [])
        ],
        "forecast_72hr": pulse.get("forecast_72hr", []),
        "deviation_pct": pulse.get("deviation_pct", 0),
        "alert": pulse.get("alert", False),
        "goals": pulse.get("goals", {}),
        "pulse_summary": pulse.get("summary", ""),
        "reviews": voice.get("replies", []),
        "pricing_alerts": voice.get("pricing_alerts", []),
        "temporal_alerts": voice.get("temporal_alerts", []),
        "shelf_flags": shelf if shelf.get("flag") else None,
        "staffing": crew
    }