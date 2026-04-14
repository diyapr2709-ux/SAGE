from anthropic import Anthropic
from exa_py import Exa
from dotenv import load_dotenv
from datetime import datetime
import requests
import json
import os

load_dotenv()
client = Anthropic()
exa    = Exa(api_key=os.getenv("EXA_API_KEY"))

# ── PROMOTION HISTORY ─────────────────────────────────────────────────────────
# Tracks last week's recommendations to measure ROI
# In production: replace with Redis (Mitra's stack)
PROMO_HISTORY_FILE = "sage/data/promo_history.json"

def load_promo_history() -> list:
    try:
        os.makedirs(os.path.dirname(PROMO_HISTORY_FILE), exist_ok=True)
        if os.path.exists(PROMO_HISTORY_FILE):
            with open(PROMO_HISTORY_FILE) as f:
                return json.load(f)
    except Exception:
        pass
    return []

def save_promo_history(history: list):
    try:
        os.makedirs(os.path.dirname(PROMO_HISTORY_FILE), exist_ok=True)
        with open(PROMO_HISTORY_FILE, "w") as f:
            json.dump(history, f, indent=2)
    except Exception as e:
        print(f"  [PROMO] Save error: {e}")

# ── TEMPORAL CONTEXT ──────────────────────────────────────────────────────────

def get_temporal_context() -> dict:
    now = datetime.now()
    return {
        "current_datetime": now.strftime("%Y-%m-%d %H:%M"),
        "day_of_week":      now.strftime("%A"),
        "time_of_day":      "morning" if now.hour < 12 else "afternoon" if now.hour < 17 else "evening",
        "week_number":      now.isocalendar()[1],
        "days_to_weekend":  (5 - now.weekday()) % 7,
        "is_weekend":       now.weekday() >= 5,
        "month":            now.strftime("%B"),
        "season":           get_season(now),
        "hour":             now.hour,
    }

def get_season(now: datetime) -> str:
    m = now.month
    if m in [12, 1, 2]: return "winter"
    if m in [3, 4, 5]:  return "spring"
    if m in [6, 7, 8]:  return "summer"
    return "fall"

# ── WEATHER — OpenWeatherMap ───────────────────────────────────────────────────

def fetch_weather(location: str) -> dict:
    try:
        key = os.getenv("OPENWEATHER_API_KEY")
        url = f"https://api.openweathermap.org/data/2.5/forecast?q={location}&appid={key}&units=imperial&cnt=16"
        data = requests.get(url, timeout=10).json()
        if data.get("cod") != "200":
            raise ValueError(data.get("message"))

        def impact(cond, temp):
            if any(w in cond.lower() for w in ["rain","snow","storm","drizzle"]): return "low"
            if temp > 95 or temp < 25: return "low"
            if temp > 85 or temp < 35: return "medium"
            return "high"

        def entry(item):
            return {
                "condition":           item["weather"][0]["description"],
                "temp_f":              int(item["main"]["temp"]),
                "humidity":            item["main"]["humidity"],
                "foot_traffic_impact": impact(item["weather"][0]["description"], item["main"]["temp"])
            }

        return {
            "today":    entry(data["list"][0]),
            "tomorrow": entry(data["list"][8]),
            "weekend":  entry(data["list"][14]),
        }
    except Exception as e:
        print(f"  [WEATHER] Error: {e} — using Open-Meteo fallback")
        return fetch_weather_fallback(location)

def fetch_weather_fallback(location: str) -> dict:
    """Open-Meteo — no key needed"""
    try:
        geo  = requests.get(f"https://geocoding-api.open-meteo.com/v1/search?name={location}&count=1", timeout=10).json()
        lat  = geo["results"][0]["latitude"]
        lon  = geo["results"][0]["longitude"]
        url  = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=weathercode,temperature_2m_max,precipitation_sum&timezone=auto&forecast_days=7"
        data = requests.get(url, timeout=10).json()
        days = data["daily"]

        def impact(precip, temp_c):
            temp_f = temp_c * 9/5 + 32
            if precip > 5: return "low"
            if temp_f > 90 or temp_f < 32: return "medium"
            return "high"

        def entry(i):
            return {
                "condition":           f"weathercode_{days['weathercode'][i]}",
                "temp_f":              int(days["temperature_2m_max"][i] * 9/5 + 32),
                "humidity":            0,
                "foot_traffic_impact": impact(days["precipitation_sum"][i], days["temperature_2m_max"][i])
            }

        return {"today": entry(0), "tomorrow": entry(1), "weekend": entry(5)}
    except Exception as e:
        print(f"  [WEATHER FALLBACK] Error: {e}")
        return {
            "today":    {"condition": "unknown", "temp_f": 65, "humidity": 50, "foot_traffic_impact": "medium"},
            "tomorrow": {"condition": "unknown", "temp_f": 65, "humidity": 50, "foot_traffic_impact": "medium"},
            "weekend":  {"condition": "unknown", "temp_f": 65, "humidity": 50, "foot_traffic_impact": "medium"},
        }

# ── EXA HELPERS ───────────────────────────────────────────────────────────────

def exa_search(query: str, num_results: int = 8, max_chars: int = 1500) -> str:
    """Safe Exa search — returns raw text or empty string on failure"""
    try:
        results = exa.search_and_contents(query, num_results=num_results, text={"max_characters": max_chars})
        return "\n\n".join([f"Source: {r.url}\nTitle: {r.title}\n{r.text}" for r in results.results if r.text])
    except Exception as e:
        print(f"  [EXA] Error on '{query[:50]}...': {e}")
        return ""
def claude_extract(prompt: str, system: str, max_tokens: int = 2000):
    """Claude extraction — always returns parsed JSON"""
    try:
        response = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response.content[0].text.strip()
        if "```" in raw:
            raw = raw.split("```json")[-1].split("```")[0].strip()
        return json.loads(raw)
    except Exception as e:
        print(f"  [CLAUDE EXTRACT] Error: {e}")
        return {} if "object" in system.lower() else []

# ── CLUSTER A — DATA FETCHERS ─────────────────────────────────────────────────

def fetch_reviews(business_name: str, location: str, business_type: str) -> dict:
    print(f"  [EXA] Fetching reviews...")
    raw = exa_search(f"{business_name} {location} customer reviews ratings site:google.com OR site:yelp.com OR site:tripadvisor.com", num_results=10)
    if not raw:
        return {"google_reviews": [], "yelp_reviews": [], "other_reviews": [], "overall_rating": None, "total_reviews": 0}

    return claude_extract(
        f"""Extract all customer reviews for {business_name} in {location} from this content.
{raw}
Return JSON:
{{
  "google_reviews": [{{"id": str, "platform": "google", "rating": int, "author": str, "text": str, "time": str}}],
  "yelp_reviews":   [{{"id": str, "platform": "yelp",   "rating": int, "author": str, "text": str, "time": str}}],
  "other_reviews":  [{{"id": str, "platform": str,      "rating": int, "author": str, "text": str, "time": str}}],
  "overall_rating": float or null,
  "total_reviews":  int,
  "repeat_authors": [str]
}}""",
        "Extract review data. Return ONLY JSON. No markdown. If field unavailable use null."
    )

def fetch_competitor_data(business_name: str, location: str, business_type: str) -> dict:
    print(f"  [EXA] Fetching competitor data...")
    now = datetime.now().strftime("%B %Y")

    if business_type == "restaurant":
        query = f"{business_name} competitors {location} menu prices DoorDash Uber Eats promotions deals {now}"
    elif business_type == "boutique":
        query = f"clothing boutiques near {location} prices style trends promotions competitors {now}"
    elif business_type == "grocery":
        query = f"grocery stores near {location} prices product availability stock competitors {now}"
    elif business_type == "pharmacy":
        query = f"pharmacies near {location} medication prices stock wait times competitors {now}"
    else:
        query = f"{business_name} competitors {location} prices promotions {now}"

    raw = exa_search(query)
    if not raw:
        return {"your_items": [], "competitor_promos": [], "stock_alerts": [], "competitors": [], "price_summary": "unavailable"}

    return claude_extract(
        f"""Extract pricing and competitor intelligence for {business_name} ({business_type}) in {location}.
{raw}
Return JSON:
{{
  "your_items":            [{{"name": str, "your_price": float, "competitor_avg": float, "diff_pct": float, "platform": str}}],
  "competitor_promos":     [{{"competitor": str, "deal": str, "platform": str, "expires": str}}],
  "stock_alerts":          [{{"item": str, "your_stock": str, "competitor_stock": str, "urgency": "high|medium|low"}}],
  "competitors":           [{{"name": str, "rating": float, "distance_miles": float, "notable_advantage": str}}],
  "new_competitors":       [{{"name": str, "opened": str, "threat_level": "high|medium|low"}}],
  "price_summary":         str
}}""",
        "Extract competitor and pricing data. Return ONLY JSON. No markdown."
    )

def fetch_social_mentions(business_name: str, location: str, business_type: str) -> dict:
    print(f"  [EXA] Fetching social mentions + Reddit...")
    raw = exa_search(
        f"{business_name} {location} site:reddit.com OR site:instagram.com OR site:tiktok.com OR site:twitter.com mentions reviews {datetime.now().strftime('%B %Y')}",
        num_results=8
    )
    if not raw:
        return {"mentions": [], "viral_moments": [], "sentiment": None, "trending_topics": []}

    return claude_extract(
        f"""Extract social media mentions for {business_name} in {location}.
{raw}
Return JSON:
{{
  "mentions": [{{"platform": str, "text": str, "sentiment": "positive|negative|neutral", "engagement": str, "url": str}}],
  "viral_moments": [{{"description": str, "platform": str, "impact": "positive|negative", "action_needed": bool}}],
  "overall_sentiment": float,
  "trending_topics": [str],
  "ugc_requiring_response": [{{"platform": str, "text": str, "urgency": "high|medium|low"}}]
}}""",
        "Extract social media data. Return ONLY JSON. No markdown."
    )

def fetch_health_compliance(business_name: str, location: str, business_type: str) -> dict:
    if business_type not in ["restaurant", "grocery", "pharmacy"]:
        return {"inspection_score": None, "violations": [], "safety_mentions": [], "risk_level": "none"}

    print(f"  [EXA] Fetching health inspection data...")
    raw = exa_search(f"{business_name} {location} health inspection score violations {datetime.now().strftime('%Y')}")
    if not raw:
        return {"inspection_score": None, "violations": [], "safety_mentions": [], "risk_level": "unknown"}

    return claude_extract(
        f"""Extract health inspection and compliance data for {business_name} in {location}.
{raw}
Return JSON:
{{
  "inspection_score":    float or null,
  "last_inspection":     str or null,
  "grade":               str or null,
  "violations":          [{{"description": str, "severity": "critical|major|minor", "date": str}}],
  "safety_mentions":     [{{"text": str, "source": str, "severity": "critical|high|medium|low"}}],
  "risk_level":          "critical|high|medium|low|none",
  "competitor_scores":   [{{"name": str, "score": float, "grade": str}}]
}}""",
        "Extract health inspection data. Return ONLY JSON. No markdown."
    )

def fetch_menu_product_intelligence(business_name: str, location: str, business_type: str) -> dict:
    print(f"  [EXA] Fetching menu/product intelligence...")
    if business_type == "restaurant":
        query = f"{business_name} menu popular dishes {location} competitors trending food items {datetime.now().strftime('%B %Y')}"
    elif business_type == "boutique":
        query = f"fashion trends {location} boutique popular items styles {datetime.now().strftime('%B %Y')}"
    elif business_type == "grocery":
        query = f"trending grocery products {location} popular items seasonal {datetime.now().strftime('%B %Y')}"
    elif business_type == "pharmacy":
        query = f"in-demand pharmacy products {location} OTC medications supplements {datetime.now().strftime('%B %Y')}"
    else:
        query = f"{business_name} popular products {location} {datetime.now().strftime('%B %Y')}"

    raw = exa_search(query)
    if not raw:
        return {"trending_items": [], "suggested_additions": [], "suggested_removals": [], "competitor_hits": []}

    return claude_extract(
        f"""Analyze menu/product intelligence for {business_name} ({business_type}) in {location}.
{raw}
Return JSON:
{{
  "trending_items":      [{{"name": str, "trend_score": float, "source": str}}],
  "suggested_additions": [{{"item": str, "reason": str, "competitor_has_it": bool, "revenue_potential": float}}],
  "suggested_removals":  [{{"item": str, "reason": str, "margin_impact": float}}],
  "competitor_hits":     [{{"competitor": str, "item": str, "popularity_signal": str}}],
  "seasonal_opportunities": [{{"item": str, "window": str, "rationale": str}}]
}}""",
        "Extract menu and product intelligence. Return ONLY JSON. No markdown."
    )

def fetch_peak_hour_intelligence(business_name: str, location: str, business_type: str) -> dict:
    print(f"  [EXA] Fetching peak hour patterns...")
    raw = exa_search(f"{business_name} {location} busy hours wait times peak times reviews")
    if not raw:
        return {"peak_hours": [], "problem_hours": [], "staffing_recommendation": []}

    return claude_extract(
        f"""Extract peak hour and staffing intelligence for {business_name} ({business_type}) in {location} from reviews and data.
{raw}
Return JSON:
{{
  "peak_hours":    [{{"day": str, "hour_range": str, "demand_level": "very high|high|medium|low"}}],
  "problem_hours": [{{"day": str, "hour_range": str, "issue": str, "review_evidence": str}}],
  "staffing_recommendation": [{{"day": str, "shift": str, "recommended_headcount": int, "reason": str}}],
  "delivery_peak_hours": [{{"platform": str, "day": str, "hour_range": str}}]
}}""",
        "Extract peak hour data. Return ONLY JSON. No markdown."
    )

def fetch_loyalty_signals(reviews: dict) -> dict:
    """Identify repeat customers and churn risk from review history"""
    all_reviews = (
        reviews.get("google_reviews", []) +
        reviews.get("yelp_reviews", []) +
        reviews.get("other_reviews", [])
    )
    if not all_reviews:
        return {"repeat_customers": [], "churn_risks": [], "loyal_advocates": []}

    return claude_extract(
        f"""Analyze these reviews for loyalty signals, repeat customers, and churn risk.
{json.dumps(all_reviews, indent=2)}
Return JSON:
{{
  "repeat_customers": [{{"author": str, "review_count": int, "sentiment_trend": "improving|stable|declining"}}],
  "churn_risks": [{{"author": str, "reason": str, "last_rating": int, "estimated_ltv_at_risk": float}}],
  "loyal_advocates": [{{"author": str, "avg_rating": float, "themes": [str]}}],
  "retention_alerts": [{{"issue": str, "affected_segment": str, "recommended_action": str}}]
}}""",
        "Analyze customer loyalty from reviews. Return ONLY JSON. No markdown."
    )

# ── CLUSTER A — MAIN ──────────────────────────────────────────────────────────

def run_cluster_a(business_id: str, business_type: str, location: str) -> dict:
    temporal        = get_temporal_context()
    reviews         = fetch_reviews(business_id, location, business_type)
    competitors     = fetch_competitor_data(business_id, location, business_type)
    social          = fetch_social_mentions(business_id, location, business_type)
    health          = fetch_health_compliance(business_id, location, business_type)
    menu_intel      = fetch_menu_product_intelligence(business_id, location, business_type)
    peak_hours      = fetch_peak_hour_intelligence(business_id, location, business_type)
    loyalty         = fetch_loyalty_signals(reviews)
    weather         = fetch_weather(location)
    promo_history   = load_promo_history()

    all_reviews = (
        reviews.get("google_reviews", []) +
        reviews.get("yelp_reviews", []) +
        reviews.get("other_reviews", [])
    )

    tone_examples = [
        {"review": "Long wait times.", "reply": "So sorry about the wait — we're adding staff on weekends!"},
        {"review": "Best latte ever!", "reply": "You just made our day, thank you! See you tomorrow."},
        {"review": "Food was cold.",   "reply": "That's not okay and we want to fix it — please DM us."},
    ]
    examples = "\n".join(f'  Review: "{e["review"]}" → Reply: "{e["reply"]}"' for e in tone_examples)

    context = f"""
TEMPORAL CONTEXT:
- Current: {temporal['current_datetime']} ({temporal['day_of_week']}, {temporal['time_of_day']}, hour: {temporal['hour']})
- Season: {temporal['season']} | Days to weekend: {temporal['days_to_weekend']} | Week: {temporal['week_number']}
- Weather today: {weather['today']['condition']}, {weather['today']['temp_f']}°F, humidity {weather['today']['humidity']}% (foot traffic: {weather['today']['foot_traffic_impact']})
- Tomorrow: {weather['tomorrow']['condition']}, {weather['tomorrow']['temp_f']}°F (foot traffic: {weather['tomorrow']['foot_traffic_impact']})
- Weekend: {weather['weekend']['condition']}, {weather['weekend']['temp_f']}°F (foot traffic: {weather['weekend']['foot_traffic_impact']})

BUSINESS: {business_type} | Name: {business_id} | Location: {location}

LIVE REVIEWS ({len(all_reviews)} total):
{json.dumps(all_reviews, indent=2)}

COMPETITOR INTELLIGENCE:
{json.dumps(competitors, indent=2)}

SOCIAL MENTIONS + REDDIT:
{json.dumps(social, indent=2)}

HEALTH & COMPLIANCE:
{json.dumps(health, indent=2)}

MENU/PRODUCT INTELLIGENCE:
{json.dumps(menu_intel, indent=2)}

PEAK HOUR PATTERNS:
{json.dumps(peak_hours, indent=2)}

LOYALTY SIGNALS:
{json.dumps(loyalty, indent=2)}

PREVIOUS PROMO RECOMMENDATIONS (for ROI tracking):
{json.dumps(promo_history[-3:] if promo_history else [], indent=2)}

OWNER TONE STYLE:
{examples}
"""

    system = f"""You are the VOICE intelligence agent for a small {business_type} business.
You have live reviews, competitor data, social signals, health data, menu intelligence, peak hours, and loyalty signals.
Analyze ALL signals together. Cross-reference everything. Return a single JSON object. No markdown, no preamble.

REASONING RULES:
Reviews:
- If no reviews found, still generate pricing/temporal/menu alerts from other data
- Set avg_sentiment_30d to null if insufficient data — never fake 0.0
- Flag food safety keywords (sick, roach, mold, food poisoning, rat) as priority: critical
- Repeat negative author = churn risk, include estimated LTV
- Hour-based sentiment patterns → operational flag with specific shift recommendation

Pricing (business-type aware):
- Restaurant: flag items >8% above competitor avg on delivery platforms
- Grocery: flag items >5% above competitor avg, flag any out-of-stock that competitor has
- Pharmacy: flag stock gaps as compliance/safety risk not just ops
- Boutique: flag style gaps vs trending items, not just price

Temporal:
- Cross-reference weather + events TOGETHER in every temporal alert
- Rain + event nearby = delivery surge opportunity, specific platform recommendation
- Every event within 1 mile needs exact staffing headcount recommendation
- Thursday/Friday = weekend prep window, flag time-sensitive promos

Promo ROI:
- If promo_history exists, evaluate if previous recommendations improved sentiment/ratings
- Flag if a recommended promo was not acted on and situation has worsened

Menu/Product:
- Suggest specific additions based on competitor hits + trending items + season
- Flag items with repeated negative mentions for removal/improvement

Return this exact JSON:
{{
  "replies": [
    {{
      "review_id": str, "platform": str, "original_review": str, "rating": int,
      "author": str, "draft_reply": str, "sentiment_score": float,
      "theme_tags": [str], "priority": "critical|high|medium|low",
      "published": false, "requires_approval": true
    }}
  ],
  "pricing_alerts": [
    {{
      "alert_id": str, "type": "overpriced|competitor_promo|stock_opportunity|deal_recommendation|stock_gap",
      "platform": str, "item": str, "detail": str, "recommended_action": str,
      "financial_impact": float, "urgency": "critical|high|medium|low",
      "time_sensitive": bool, "deadline": str
    }}
  ],
  "temporal_alerts": [
    {{
      "alert_id": str, "trigger": str, "insight": str,
      "recommended_action": str, "staffing_delta": int,
      "financial_impact": float, "window": str
    }}
  ],
  "health_alerts": [
    {{
      "alert_id": str, "type": "inspection_score|violation|safety_mention|competitor_score",
      "detail": str, "severity": "critical|high|medium|low",
      "recommended_action": str, "requires_immediate_action": bool
    }}
  ],
  "menu_recommendations": [
    {{
      "type": "add|remove|reprice|seasonal",
      "item": str, "reason": str, "competitor_evidence": str,
      "financial_impact": float, "priority": "high|medium|low"
    }}
  ],
  "social_alerts": [
    {{
      "alert_id": str, "platform": str, "type": "viral_negative|viral_positive|unanswered_mention|trending_topic",
      "detail": str, "recommended_action": str, "urgency": "high|medium|low"
    }}
  ],
  "loyalty_alerts": [
    {{
      "alert_id": str, "customer": str, "type": "churn_risk|repeat_positive|lapsing",
      "detail": str, "ltv_at_risk": float, "recommended_action": str
    }}
  ],
  "pulse_signals": {{
    "demand_multipliers": [{{"date": str, "event": str, "multiplier": float, "confidence": "high|medium|low"}}],
    "weather_impact": [{{"date": str, "condition": str, "foot_traffic_change_pct": float}}],
    "note": "Pass this block to PULSE agent for demand forecast adjustment"
  }},
  "promo_roi": {{
    "previous_promos_evaluated": int,
    "effective_promos": [str],
    "ineffective_promos": [str],
    "roi_note": str
  }},
  "trends": {{
    "avg_sentiment_30d": float or null, "top_themes": [str],
    "review_count": int, "negative_count": int,
    "high_priority": int, "financial_impact": float
  }},
  "flag": bool,
  "financial_impact": float,
  "requires_approval": true
}}"""

    print("  [CLAUDE] Running cluster A intelligence analysis...")
    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=6000,
        system=system,
        messages=[{"role": "user", "content": context}]
    )

    raw = response.content[0].text.strip()
    if "```" in raw:
        raw = raw.split("```json")[-1].split("```")[0].strip()
    result = json.loads(raw)

    # save promo recommendations to history for next run ROI tracking
    if result.get("pricing_alerts"):
        history = load_promo_history()
        history.append({
            "date": temporal["current_datetime"],
            "business": business_id,
            "recommendations": [a.get("recommended_action") for a in result["pricing_alerts"][:3]]
        })
        save_promo_history(history[-10:])  # keep last 10

    result.update({
        "agent": "VOICE", "cluster": "A",
        "business_type": business_type, "business_id": business_id,
        "location": location, "timestamp": datetime.now().isoformat(),
        "temporal": temporal,
    })
    return result


# ── CLUSTER B — DATA FETCHERS ─────────────────────────────────────────────────

def fetch_meeting_transcripts(org_id: str) -> list:
    """
    Replace with:
    Zoom:  GET https://api.zoom.us/v2/users/{userId}/recordings — ZOOM_API_KEY in .env
    Meet:  Google Workspace Admin SDK — GOOGLE_WORKSPACE_KEY in .env
    Teams: Microsoft Graph API — MS_GRAPH_KEY in .env
    """
    return [
        {"id": "m001", "date": datetime.now().strftime("%Y-%m-%d"),
         "title": "Weekly standup", "participants": ["Diya", "Sai Anirudh", "Mitra"],
         "transcript": "FRANK integration blocked on PULSE schema. PULSE 80% done needs more historical data. WhatsApp sandbox timing out. Pricing intelligence feature discussed 3 weeks ago not started."},
        {"id": "m002", "date": datetime.now().strftime("%Y-%m-%d"),
         "title": "Client demo prep", "participants": ["Diya", "Client A"],
         "transcript": "Client asked about multi-location support three times. Concerned about data privacy. Loved WhatsApp briefing. Asked about Shopify — not built yet. Budget approved pending demo success."},
    ]

def fetch_github_activity(repo: str) -> dict:
    try:
        token = os.getenv("GITHUB_TOKEN")
        if not token:
            raise ValueError("No GITHUB_TOKEN")
        headers = {"Authorization": f"token {token}"}
        commits = requests.get(f"https://api.github.com/repos/{repo}/commits?per_page=30", headers=headers, timeout=10).json()
        pulls   = requests.get(f"https://api.github.com/repos/{repo}/pulls?state=open",    headers=headers, timeout=10).json()
        contributors = {}
        for c in commits:
            if isinstance(c, dict) and c.get("author"):
                name = c["author"].get("login", "unknown")
                contributors[name] = contributors.get(name, 0) + 1

        # detect stalled modules — files not touched in 7 days
        stalled = []
        try:
            tree = requests.get(f"https://api.github.com/repos/{repo}/git/trees/HEAD?recursive=1", headers=headers, timeout=10).json()
            modules = set()
            for f in tree.get("tree", []):
                if f["path"].startswith("sage/") and "/" in f["path"][5:]:
                    modules.add(f["path"].split("/")[1])
            touched = set()
            for c in commits[:20]:
                if isinstance(c, dict):
                    detail = requests.get(c.get("url",""), headers=headers, timeout=5).json()
                    for f in detail.get("files", []):
                        parts = f.get("filename","").split("/")
                        if len(parts) > 1:
                            touched.add(parts[1])
            stalled = list(modules - touched)
        except Exception:
            pass

        return {
            "commits_7d":        len([c for c in commits if isinstance(c, dict) and c.get("commit")]),
            "is_empty_repo":     len(commits) == 0,
            "stalled_prs":       [{"title": p["title"], "author": p["user"]["login"],
                                   "days_open": (datetime.now() - datetime.strptime(p["created_at"], "%Y-%m-%dT%H:%M:%SZ")).days,
                                   "reviewers_assigned": bool(p.get("requested_reviewers"))}
                                  for p in pulls if isinstance(p, dict)],
            "top_contributors":  [{"name": k, "commits_7d": v} for k,v in sorted(contributors.items(), key=lambda x: -x[1])],
            "untouched_modules": stalled,
            "velocity_trend":    "live",
        }
    except Exception as e:
        print(f"  [GITHUB] Error: {e}")
        return {"commits_7d": 0, "is_empty_repo": True, "stalled_prs": [], "top_contributors": [],
                "untouched_modules": [], "velocity_trend": "unavailable",
                "note": "Add GITHUB_TOKEN to .env for live data"}

def fetch_slack_discord(workspace_id: str) -> dict:
    """
    Replace with:
    Slack:   GET https://slack.com/api/conversations.history — SLACK_BOT_TOKEN in .env
    Discord: GET https://discord.com/api/v10/channels/{id}/messages — DISCORD_BOT_TOKEN in .env
    """
    return {"messages_7d": 0, "sentiment_score": 0.5, "blockers_mentioned": [],
            "note": "Add SLACK_BOT_TOKEN or DISCORD_BOT_TOKEN to .env for live data"}

def fetch_jira_linear(project_id: str) -> dict:
    """
    Replace with:
    Jira:   GET https://{domain}.atlassian.net/rest/api/3/project/{key}/sprint — JIRA_API_KEY in .env
    Linear: GraphQL API — LINEAR_API_KEY in .env
    """
    return {"sprint_health": "unknown", "note": "Add JIRA_API_KEY or LINEAR_API_KEY to .env"}

def fetch_external_signals_exa(industry: str, business_type: str) -> list:
    print(f"  [EXA] Fetching external signals...")
    now = datetime.now().strftime("%B %Y")
    raw = exa_search(
        f"AI policy regulations competitor funding product launches {industry} {business_type} {now}",
        num_results=10, max_chars=1200
    )
    # also search specifically for competitors
    comp_raw = exa_search(f"SMB small business AI operations startup funding {now}", num_results=5)
    combined = raw + "\n\n" + comp_raw

    if not combined.strip():
        return []

    return claude_extract(
        f"""Extract tech releases, policy changes, competitor signals relevant to a {business_type} in {industry}.
{combined}
Return JSON array:
[{{
  "id": str,
  "source": str,
  "url": str,
  "type": "regulatory|tech_release|competitor_funding|competitor_launch|market_shift",
  "title": str,
  "summary": str,
  "relevance_score": float,
  "applies_to_product": bool,
  "compliance_risk": "high|medium|low|none",
  "deadline": str or null,
  "days_until_deadline": int or null,
  "action": str
}}]
Return [] if nothing relevant.""",
        "Extract external signals. Return ONLY a JSON array. No markdown."
    )

# ── CLUSTER B — MAIN ──────────────────────────────────────────────────────────

def run_cluster_b(org_id: str, business_type: str, industry: str, repo: str) -> dict:
    temporal    = get_temporal_context()
    meetings    = fetch_meeting_transcripts(org_id)
    github      = fetch_github_activity(repo)
    comms       = fetch_slack_discord(org_id)
    sprint      = fetch_jira_linear(org_id)
    ext_signals = fetch_external_signals_exa(industry, business_type)

    context = f"""
TEMPORAL CONTEXT:
- Current: {temporal['current_datetime']} ({temporal['day_of_week']})
- Season: {temporal['season']}, week {temporal['week_number']} of year

ORGANIZATION: {business_type} | Industry: {industry} | Repo: {repo}

MEETING TRANSCRIPTS:
{json.dumps(meetings, indent=2)}

GITHUB ACTIVITY:
{json.dumps(github, indent=2)}

SLACK/DISCORD:
{json.dumps(comms, indent=2)}

SPRINT HEALTH:
{json.dumps(sprint, indent=2)}

LIVE EXTERNAL SIGNALS (Exa-sourced):
{json.dumps(ext_signals, indent=2)}
"""

    system = """You are the VOICE intelligence agent for a professional/startup organization.
Analyze ALL internal and external signals. Cross-reference to find non-obvious strategic risks and opportunities.
Return a single JSON object. No markdown, no preamble.

REASONING RULES:
GitHub:
- If is_empty_repo is true, DO NOT flag zero commits as a team risk — repo just started
- Only flag velocity decline if commits_7d < commits_14d/2 AND repo has history
- Stalled PRs open > 3 days without reviewer = process gap, not burnout
- untouched_modules + meeting mention = stalled feature, flag it

Cross-reference:
- Meeting mention + zero GitHub commits + repo not empty = stalled feature
- Competitor funding + your stalled feature = urgent competitive threat
- Policy deadline < 90 days + no compliance ticket visible = high risk
- Client request mentioned 2+ times + not ticketed = lost revenue
- New LLM/tech release + your core dependency = evaluate immediately
- Team sentiment declining + velocity declining = burnout risk

Financial impact:
- Base churn risk on realistic ARR at risk, not arbitrary numbers
- Policy non-compliance: estimate cost of delay or market access loss
- Competitor threat: estimate revenue impact if they capture your segment

Always include:
- "owner": who should action each alert (derive from meeting participants or role)
- "applies_to_product": bool on every policy alert
- Financial basis for every impact number

Return this exact JSON:
{
  "meeting_intelligence": [
    {
      "meeting_id": str, "date": str, "client_sentiment": float, "churn_risk": float,
      "key_concerns": [str], "feature_requests": [str], "action_items": [str],
      "priority": "high|medium|low", "owner": str
    }
  ],
  "team_health": {
    "velocity_trend": "improving|stable|declining|insufficient_data",
    "blockers": [str], "stalled_items": [str],
    "team_sentiment": float, "burnout_risk": "high|medium|low|unknown",
    "recommended_actions": [str],
    "note": str
  },
  "policy_alerts": [
    {
      "policy_id": str, "source": str, "url": str, "title": str, "summary": str,
      "applies_to_product": bool,
      "compliance_risk": "high|medium|low",
      "days_until_deadline": int or null,
      "action_required": str, "owner": str,
      "financial_basis": str,
      "requires_approval": bool
    }
  ],
  "market_intelligence": [
    {
      "signal_id": str, "source": str, "url": str, "type": str, "summary": str,
      "relevance_score": float, "urgency": "high|medium|low",
      "recommended_action": str, "owner": str,
      "financial_impact": float, "financial_basis": str
    }
  ],
  "strategic_alerts": [
    {
      "alert_id": str,
      "type": "pmf_drift|churn_risk|compliance|competitor_threat|team_risk|tech_disruption",
      "trigger": str, "evidence": [str], "insight": str,
      "recommended_action": str, "owner": str,
      "financial_impact": float, "financial_basis": str,
      "priority": "high|medium|low",
      "requires_approval": bool
    }
  ],
  "trends": {
    "avg_client_sentiment_30d": float, "top_concerns": [str],
    "top_feature_requests": [str], "active_policy_risks": int,
    "competitor_threats": int, "team_velocity_score": float,
    "pmf_drift_score": float, "financial_impact": float
  },
  "flag": bool,
  "financial_impact": float,
  "requires_approval": true
}"""

    print("  [CLAUDE] Running cluster B intelligence analysis...")
    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=6000,
        system=system,
        messages=[{"role": "user", "content": context}]
    )

    raw = response.content[0].text.strip()
    if "```" in raw:
        raw = raw.split("```json")[-1].split("```")[0].strip()
    result = json.loads(raw)

    result.update({
        "agent": "VOICE", "cluster": "B",
        "business_type": business_type, "org_id": org_id,
        "timestamp": datetime.now().isoformat(), "temporal": temporal,
    })
    return result


# ── MAIN ──────────────────────────────────────────────────────────────────────

def run(
    business_id:   str = "demo_business",
    business_type: str = "restaurant",
    location:      str = "San Francisco",
    cluster:       str = "A",
    industry:      str = "technology",
    repo:          str = "org/repo",
) -> dict:
    print(f"[VOICE] Starting — cluster {cluster} | {business_type} | {datetime.now().strftime('%H:%M:%S')}")
    if cluster == "A":
        return run_cluster_a(business_id, business_type, location)
    else:
        return run_cluster_b(business_id, business_type, industry, repo)


if __name__ == "__main__":
    import sys
    cluster = sys.argv[1] if len(sys.argv) > 1 else "A"

    if cluster == "A":
        business = sys.argv[2] if len(sys.argv) > 2 else "Sightglass Coffee"
        location = sys.argv[3] if len(sys.argv) > 3 else "San Francisco"
        btype    = sys.argv[4] if len(sys.argv) > 4 else "restaurant"
        result   = run(cluster="A", business_id=business, business_type=btype, location=location)
    else:
        org      = sys.argv[2] if len(sys.argv) > 2 else "SAGE"
        industry = sys.argv[3] if len(sys.argv) > 3 else "technology"
        repo     = sys.argv[4] if len(sys.argv) > 4 else "diyapr2709-ux/SAGE"
        result   = run(cluster="B", business_id=org, business_type="saas", industry=industry, repo=repo)

    print(f"\n=== VOICE CLUSTER {cluster} OUTPUT ===")
    print(json.dumps(result, indent=2))