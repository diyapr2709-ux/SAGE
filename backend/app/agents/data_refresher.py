"""
data_refresher.py — Autonomous 30-minute data refresh for Marathon Deli.

Simulates pulling external paradigm data from:
  - Google/Yelp reviews (rotating pool, time-aware)
  - Competitor pricing intel (Chipotle, Subway, Wingstop on Rte 1)
  - Market COGS fluctuations (lamb, pita, feta, cooking oil)
  - Staffing pressure signals by day/time
  - UMD academic calendar events

Every 30 minutes: refreshes LLM dataset on disk → reloads in memory → re-runs FRANK.
"""

import json
import random
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

_ROOT = Path(__file__).resolve().parent.parent.parent.parent

# ── Review pool (simulates live Google/Yelp scrape) ──────────────────────────

_GOOGLE_REVIEWS = [
    {
        "id": "g_001",
        "platform": "Google",
        "author": "TerpFan2024",
        "rating": 5,
        "text": "Best late-night spot near UMD. The gyro is massive and the staff is super fast after midnight.",
        "sentiment": "positive",
        "tags": ["gyro", "late_night", "speed"],
        "cross_ref": None,
    },
    {
        "id": "g_002",
        "platform": "Google",
        "author": "CollegeParkLocal",
        "rating": 4,
        "text": "Love this place but Thursday nights around 11 PM there's always a huge wait. Need more staff then.",
        "sentiment": "mixed",
        "tags": ["staffing", "thursday_late", "wait_time"],
        "cross_ref": "thu_understaffing",
    },
    {
        "id": "g_003",
        "platform": "Google",
        "author": "GreekFoodLover",
        "rating": 5,
        "text": "Fatima's shawarma is unreal. Came back three Fridays in a row just for that. Marathon is a gem.",
        "sentiment": "positive",
        "tags": ["shawarma", "fatima", "repeat_customer"],
        "cross_ref": None,
    },
    {
        "id": "g_004",
        "platform": "Google",
        "author": "NightOwlUMD",
        "rating": 3,
        "text": "Food is great but had a cold gyro once — felt like it sat too long. Staff was apologetic though.",
        "sentiment": "mixed",
        "tags": ["food_temp", "gyro", "service_recovery"],
        "cross_ref": None,
    },
    {
        "id": "g_005",
        "platform": "Google",
        "author": "HealthWatcher99",
        "rating": 3,
        "text": "Tasty food but I once noticed the cooler temperature warning light on. Hope they're on top of safety.",
        "sentiment": "negative",
        "tags": ["health_code", "cooler", "safety"],
        "cross_ref": "daniel_near_miss",
    },
    {
        "id": "g_006",
        "platform": "Google",
        "author": "CampusEatsReviewer",
        "rating": 5,
        "text": "Jordan delivered my order in under 20 min from 2 miles away. Fastest campus delivery I've seen.",
        "sentiment": "positive",
        "tags": ["delivery", "jordan", "speed"],
        "cross_ref": None,
    },
    {
        "id": "g_007",
        "platform": "Google",
        "author": "StudyBreakSnacker",
        "rating": 4,
        "text": "Sophia always remembers to ask if you want baklava with your order. Great upsell, great girl.",
        "sentiment": "positive",
        "tags": ["upsell", "sophia", "baklava"],
        "cross_ref": None,
    },
]

_YELP_REVIEWS = [
    {
        "id": "y_001",
        "platform": "Yelp",
        "author": "FoodieMaryland",
        "rating": 5,
        "text": "Priya at the register is literally the nicest cashier ever. Marathon keeps good people.",
        "sentiment": "positive",
        "tags": ["priya", "staff", "customer_service"],
        "cross_ref": None,
    },
    {
        "id": "y_002",
        "platform": "Yelp",
        "author": "CuriousEater301",
        "rating": 2,
        "text": "Went around 1 AM and my cheese steak tasted off — like slightly warm cheese. Won't be back.",
        "sentiment": "negative",
        "tags": ["food_quality", "cheese_steak", "food_safety"],
        "cross_ref": "daniel_near_miss",
    },
    {
        "id": "y_003",
        "platform": "Yelp",
        "author": "UMD_Alumni_Fan",
        "rating": 5,
        "text": "Been going here since 2019. Aarav is still there and still the fastest checkout on campus.",
        "sentiment": "positive",
        "tags": ["aarav", "cashier", "loyalty"],
        "cross_ref": None,
    },
    {
        "id": "y_004",
        "platform": "Yelp",
        "author": "BudgetStudentEats",
        "rating": 4,
        "text": "$14 for a gyro wrap seems steep vs Chipotle at $11 nearby. Worth it for the taste but the gap is growing.",
        "sentiment": "mixed",
        "tags": ["pricing", "competitor_chipotle", "value"],
        "cross_ref": "gyro_price_hold",
    },
    {
        "id": "y_005",
        "platform": "Yelp",
        "author": "LateNightRegular",
        "rating": 5,
        "text": "Open until 3 AM and quality stays consistent. Michael keeps the night crew sharp.",
        "sentiment": "positive",
        "tags": ["michael", "late_night", "consistency"],
        "cross_ref": None,
    },
]

# ── Competitor intel pool ─────────────────────────────────────────────────────

_COMPETITOR_SIGNALS = [
    {
        "competitor": "Chipotle (Route 1, 0.3mi)",
        "signal": "burrito bowl dropped to $10.95 — $2.55 below Marathon gyro wrap",
        "impact": "price_pressure",
        "recommended_action": "Hold gyro at $13.50 — emphasize portion size and local brand",
        "financial_note": "Matching would cost ~$3,400/mo in revenue",
    },
    {
        "competitor": "Wingstop (Route 1, 0.5mi)",
        "signal": "running 2-for-$14 wing deal on Thursdays — capturing late-night crowd",
        "impact": "traffic_diversion",
        "recommended_action": "Counter with Thursday-only $1 baklava add-on promo",
        "financial_note": "Estimated 12% Thursday traffic loss without response",
    },
    {
        "competitor": "Subway (Route 1, 0.2mi)",
        "signal": "$6 footlong sub promo through month end — aggressively underpricing",
        "impact": "lunch_traffic_risk",
        "recommended_action": "Marathon's differentiation is quality/variety — no need to match",
        "financial_note": "Subway targets different segment, low overlap risk",
    },
    {
        "competitor": "Tropical Smoothie Cafe (0.4mi)",
        "signal": "added late-night hours (until 2 AM) starting this week",
        "impact": "late_night_competition",
        "recommended_action": "Reinforce 3 AM close advantage, promote on UMD social media",
        "financial_note": "Marathon still has 1-hour advantage on close time",
    },
    {
        "competitor": "Raising Cane's (College Park, 1mi)",
        "signal": "delivery radius expanded to UMD campus via DoorDash",
        "impact": "delivery_competition",
        "recommended_action": "Leverage Jordan's 4.9★ DoorDash rating in targeted ads",
        "financial_note": "Jordan's avg delivery time 18min vs Cane's estimated 32min",
    },
]

# ── COGS fluctuation pool ─────────────────────────────────────────────────────

_COGS_BASE = {
    "lamb_shoulder": {"unit": "lb", "base_price": 8.40, "volatility": 0.08},
    "feta_cheese":   {"unit": "lb", "base_price": 6.20, "volatility": 0.05},
    "pita_bread":    {"unit": "case_48", "base_price": 22.50, "volatility": 0.04},
    "cooking_oil":   {"unit": "gal", "base_price": 14.80, "volatility": 0.06},
    "shawarma_spice":{"unit": "lb", "base_price": 12.00, "volatility": 0.03},
    "chicken":       {"unit": "lb", "base_price": 3.20, "volatility": 0.05},
}

_MARKET_EVENTS = [
    "Supply chain disruption affecting mid-Atlantic lamb suppliers — +8% expected",
    "Sysco delivery driver shortage in MD — pita lead time up 2 days",
    "Greek feta import tariff review in progress — monitor for Q3 impact",
    "Cooking oil futures up 4% this week on crop report",
    "Restaurant supply fair in DC next week — bulk purchasing opportunity",
    "USDA: chicken breast prices stabilizing after Q1 spike",
    "Maryland minimum wage increase to $15.50 effective July 1",
    "DoorDash expanding Marketplace fee to 32% for non-partner restaurants",
    "Grubhub offering 0% commission for first 30 days to new Market partners",
    "UMD Fall enrollment up 3% YoY — projected 12% traffic increase in September",
]

# ── UMD academic calendar signals ────────────────────────────────────────────

_UMD_EVENTS = [
    {"event": "Finals week", "impact": "high", "note": "Peak late-night demand, +35% orders expected 10PM-2AM"},
    {"event": "Spring break", "impact": "low", "note": "Campus empties — reduce staffing 40%, monitor costs"},
    {"event": "Move-in weekend", "impact": "high", "note": "Families on campus, add daytime staff for lunch rush"},
    {"event": "Homecoming", "impact": "high", "note": "Alumni weekend, expect 25% higher Fri-Sat volume"},
    {"event": "Regular semester week", "impact": "medium", "note": "Steady traffic, Thursday-Friday peaks as usual"},
    {"event": "Exam week", "impact": "medium_high", "note": "Study fuel demand rises, late-night orders +20%"},
]


# ── Main refresh function ─────────────────────────────────────────────────────

def generate_fresh_dataset(seed: Optional[int] = None) -> dict:
    """
    Generate a fresh LLM dataset snapshot for Marathon Deli.
    Uses time-based seed so data rotates naturally every 30 minutes.
    """
    now = datetime.now()
    if seed is None:
        # New seed every 30-minute window
        window = now.replace(minute=(now.minute // 30) * 30, second=0, microsecond=0)
        seed = int(hashlib.md5(window.isoformat().encode()).hexdigest(), 16) % (2**31)

    rng = random.Random(seed)
    hour = now.hour
    dow  = now.weekday()  # 0=Mon ... 6=Sun

    # Pick 3-4 reviews (mix of Google + Yelp, weight toward recent sentiment)
    all_reviews = _GOOGLE_REVIEWS + _YELP_REVIEWS
    sampled_reviews = rng.sample(all_reviews, k=min(4, len(all_reviews)))

    # Pick 2 competitor signals
    comp_signals = rng.sample(_COMPETITOR_SIGNALS, k=2)

    # Pick 2-3 market events
    market_events = rng.sample(_MARKET_EVENTS, k=3)

    # Pick UMD event context
    umd_event = rng.choice(_UMD_EVENTS)

    # Compute COGS with small random fluctuations
    cogs_snapshot = {}
    for item, meta in _COGS_BASE.items():
        pct_change = rng.uniform(-meta["volatility"], meta["volatility"] * 1.5)
        new_price  = round(meta["base_price"] * (1 + pct_change), 2)
        pct_str    = f"+{pct_change*100:.1f}%" if pct_change > 0 else f"{pct_change*100:.1f}%"
        cogs_snapshot[item] = {
            "unit": meta["unit"],
            "current_price": new_price,
            "vs_baseline": pct_str,
            "flagged": abs(pct_change) > 0.04,
        }

    # Build flagged SHELF items (field names match what run_with_llm_dataset expects)
    flagged_items = []
    monthly_revenue = 112000

    # Always flag lamb (highest COGS exposure)
    lamb_change = cogs_snapshot["lamb_shoulder"]["vs_baseline"]
    flagged_items.append({
        "item": "Lamb Shoulder (gyro/shawarma base)",
        "financial_impact": 1680,
        "monthly_impact":   1680,
        "root_cause":       f"Price {lamb_change} vs baseline — primary protein cost driver",
        "recommended_action": "Pre-order 2-week supply to lock in current price" if "+" in lamb_change else "Current pricing favorable — maintain",
        "urgency": "high" if "+" in lamb_change else "low",
        "flag": "cost_spike" if "+" in lamb_change else "stable",
    })

    # DoorDash fee flag
    dd_rate = rng.choice([0.28, 0.30, 0.30, 0.32])
    dd_spend = round(monthly_revenue * 0.13 * dd_rate)
    flagged_items.append({
        "item": "DoorDash Marketplace Commission",
        "financial_impact": dd_spend,
        "monthly_impact":   dd_spend,
        "root_cause":       f"{dd_rate*100:.0f}% commission on delivery revenue (~13% of total)",
        "recommended_action": "Negotiate direct delivery for orders >$25 or push Marathon app" if dd_rate >= 0.30 else "Commission within acceptable range",
        "urgency": "high" if dd_rate >= 0.30 else "low",
        "flag": "cost_spike" if dd_rate >= 0.30 else "stable",
    })

    # Overtime flag (Michael's hours)
    ot_hours = rng.randint(4, 9)
    ot_cost  = round(ot_hours * 22 * 1.5 * 4)
    flagged_items.append({
        "item": f"Overtime Labor — Michael Rivera ({ot_hours}h OT this week)",
        "financial_impact": ot_cost,
        "monthly_impact":   ot_cost,
        "root_cause":       f"Supervisor working {40 + ot_hours}h this week ({ot_hours}h above threshold)",
        "recommended_action": "Hire part-time evening cashier to absorb 4-6h/week OT" if ot_hours >= 6 else "Monitor — within acceptable buffer",
        "urgency": "high" if ot_hours >= 6 else "medium",
        "flag": "cost_spike" if ot_hours >= 6 else "watch",
    })

    # Determine Employee of the Week
    eotw_candidates = [
        {"name": "Fatima Hassan",  "score": rng.randint(88, 97), "reason": "Customer requests, exceptional shawarma quality"},
        {"name": "Priya Sharma",   "score": rng.randint(90, 100), "reason": "100/100 performance score, outstanding customer praise"},
        {"name": "Aarav Patel",    "score": rng.randint(80, 90),  "reason": "Students request his lane specifically, fast checkout"},
        {"name": "Jordan Lee",     "score": rng.randint(78, 88),  "reason": "4.9★ DoorDash rating, fastest campus delivery"},
        {"name": "Sophia Kim",     "score": rng.randint(72, 82),  "reason": "Highest baklava upsell rate, reliable afternoon shifts"},
    ]
    eotw = max(eotw_candidates, key=lambda x: x["score"])

    # Determine staffing pressure by current day/time
    if hour >= 22 or hour < 2:
        staffing_pressure = "high" if dow in [3, 4] else "medium"
        staffing_note = f"Late-night rush — {'Thu/Fri peak' if dow in [3, 4] else 'standard overnight'}"
    elif 11 <= hour <= 14:
        staffing_pressure = "medium"
        staffing_note = "Lunch rush window — monitor queue depth"
    else:
        staffing_pressure = "low"
        staffing_note = "Off-peak hours — standard coverage sufficient"

    # Compute aggregate sentiment from sampled reviews
    avg_rating = round(sum(r["rating"] for r in sampled_reviews) / len(sampled_reviews), 1)
    positive_count = sum(1 for r in sampled_reviews if r["sentiment"] == "positive")
    negative_count = sum(1 for r in sampled_reviews if r["sentiment"] == "negative")

    # Build pricing alerts
    pricing_alerts = []
    for sig in comp_signals:
        if sig["impact"] == "price_pressure":
            pricing_alerts.append({
                "alert_id": f"price_{rng.randint(100,999)}",
                "type": "competitor_pricing",
                "competitor": sig["competitor"],
                "signal": sig["signal"],
                "recommended_action": sig["recommended_action"],
                "financial_note": sig["financial_note"],
                "urgency": "high",
            })
        else:
            pricing_alerts.append({
                "alert_id": f"market_{rng.randint(100,999)}",
                "type": "market_signal",
                "competitor": sig["competitor"],
                "signal": sig["signal"],
                "recommended_action": sig["recommended_action"],
                "financial_note": sig["financial_note"],
                "urgency": "medium",
            })

    # Temporal shift alert
    temporal_alerts = []
    if staffing_pressure in ("high", "medium"):
        temporal_alerts.append({
            "alert_id": f"shift_{rng.randint(100,999)}",
            "type": "staffing_pressure",
            "window": staffing_note,
            "recommended_action": "Add one cook to Thursday 10PM-2AM shift",
            "financial_impact": 720,
            "urgency": staffing_pressure,
        })

    # Health/compliance alerts
    compliance_alerts = []
    if any(r.get("cross_ref") == "daniel_near_miss" for r in sampled_reviews):
        compliance_alerts.append({
            "alert_id": "compliance_001",
            "type": "health_code_risk",
            "employee": "Daniel Brooks",
            "issue": "Cooler temperature near-miss mentioned in 2 recent reviews",
            "action": "Schedule mandatory food safety retraining by end of week",
            "urgency": "high",
        })

    dataset = {
        "business_id":      "Marathon Deli",
        "business_type":    "deli",
        "location":         "College Park, MD",
        "address":          "7412 Baltimore Ave, College Park, MD 20740",
        "phone":            "(301) 474-0060",
        "established":      1972,
        "cluster":          "A",
        "monthly_revenue":  monthly_revenue,
        "avg_ticket_size":  14.5,
        "google_rating":    4.5,
        "review_count":     847,
        "hours":            "Mon-Sun 10AM-3AM",
        "specialties":      ["gyros", "cheese steaks", "baklava", "shawarma", "falafel"],
        "peak_hours":       ["11AM-2PM", "10PM-2AM"],
        "primary_audience": "UMD students, late-night crowd, local regulars",
        "employees": [
            {"name": "Priya Sharma",   "role": "Cashier",          "hourly_rate": 15, "hours_per_week": 20, "performance_notes": "consistently praised, 100/100 this quarter"},
            {"name": "Aarav Patel",    "role": "Cashier",          "hourly_rate": 14, "hours_per_week": 18, "performance_notes": "excellent customer feedback, fast checkout"},
            {"name": "Michael Rivera", "role": "Shift Supervisor", "hourly_rate": 22, "hours_per_week": 46, "performance_notes": f"strong leader, {ot_hours}h overtime this week — needs review"},
            {"name": "Sophia Kim",     "role": "Cashier",          "hourly_rate": 14, "hours_per_week": 12, "performance_notes": "reliable, high upsell rate on baklava"},
            {"name": "Daniel Brooks",  "role": "Cook",             "hourly_rate": 16, "hours_per_week": 25, "performance_notes": "fast prep, one health-code near-miss — needs retraining"},
            {"name": "Emily Chen",     "role": "Front Desk",       "hourly_rate": 13, "hours_per_week": 10, "performance_notes": "UMD student, limited Mon-Wed, excellent online orders"},
            {"name": "Jordan Lee",     "role": "Delivery Driver",  "hourly_rate": 15, "hours_per_week": 28, "performance_notes": "fastest delivery on campus, 4.9 DoorDash stars"},
            {"name": "Fatima Hassan",  "role": "Cook",             "hourly_rate": 17, "hours_per_week": 30, "performance_notes": "exceptional shawarma, customers request her dishes"},
        ],
        "llm_outputs": {
            "voice": {
                "generated_at": now.isoformat(),
                "source": "external_paradigm_refresh",
                "avg_rating": avg_rating,
                "positive_reviews": positive_count,
                "negative_reviews": negative_count,
                "umd_context": umd_event,
                "pricing_alerts": pricing_alerts,
                "temporal_alerts": temporal_alerts,
                "compliance_alerts": compliance_alerts,
                "market_events": market_events,
                "replies": sampled_reviews,
            },
            "shelf": {
                "generated_at": now.isoformat(),
                "source": "external_paradigm_refresh",
                "flag": True,
                "staffing_pressure": staffing_pressure,
                "staffing_note": staffing_note,
                "executive_summary": {
                    "business_health_score": rng.randint(70, 82),
                    "staffing_pressure": staffing_pressure,
                },
                "employee_intelligence": {
                    "employee_of_the_week": eotw,
                    "employees": [],
                },
                "employee_feedback": {
                    "warnings": [],
                },
                "competitor_landscape": comp_signals,
                "cost_intelligence": {
                    "flagged_items": flagged_items,
                    "cogs_snapshot": cogs_snapshot,
                    "monthly_revenue": monthly_revenue,
                    "cost_creep": {
                        "feta_cheese": f"+{abs(float(cogs_snapshot['feta_cheese']['vs_baseline'].replace('%','').replace('+',''))):.1f}%",
                        "pita_bread":  f"+{abs(float(cogs_snapshot['pita_bread']['vs_baseline'].replace('%','').replace('+',''))):.1f}%",
                    },
                    "total_monthly_flagged": sum(item["financial_impact"] for item in flagged_items),
                    "as_pct_revenue": round(sum(item["financial_impact"] for item in flagged_items) / monthly_revenue * 100, 1),
                },
            },
        },
    }

    return dataset


def run_refresh_cycle() -> dict:
    """
    Full refresh cycle:
      1. Generate fresh dataset
      2. Save to disk
      3. Reload into in-memory stores
      4. Run FRANK pipeline
    Returns summary of what changed.
    """
    from app.agents.dataset_pipe import pass_llm_dataset
    from app.agents.frank_client import run_with_llm_dataset

    now = datetime.now()
    dataset = generate_fresh_dataset()

    # Save + reload in-memory
    result = pass_llm_dataset(dataset)

    # Run FRANK
    frank_result = run_with_llm_dataset(dataset)

    summary = {
        "refreshed_at": now.isoformat(),
        "business_id": dataset["business_id"],
        "reviews_sampled": len(dataset["llm_outputs"]["voice"]["replies"]),
        "flagged_costs": len(dataset["llm_outputs"]["shelf"]["cost_intelligence"]["flagged_items"]),
        "avg_rating": dataset["llm_outputs"]["voice"]["avg_rating"],
        "employee_of_week": dataset["llm_outputs"]["shelf"]["employee_intelligence"]["employee_of_the_week"]["name"],
        "frank_ran": "briefing_text" in frank_result,
    }
    return summary
