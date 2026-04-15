"""
SHELF — Universal Strategic Cost Intelligence Agent
=====================================================
Works for ANY business at ANY scale — Cluster A or B.
Data priority: APIs > Custom Dataset > Exa Intelligence > Business Name Only

Escalation: CEO (strategic + >$200) + Individual employees (domain-specific)
Delivery: Agnostic — outputs structured data, FRANK handles channel
"""

from anthropic import Anthropic
from exa_py import Exa
from dotenv import load_dotenv
from datetime import datetime, timedelta
from typing import Optional
import requests
import json
import os

load_dotenv()

claude     = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
exa_client = Exa(api_key=os.getenv("EXA_API_KEY"))
WAVE_URL   = "https://gql.waveapps.com/graphql/public"
WAVE_TOKEN = os.getenv("WAVE_ACCESS_TOKEN")

# ── BUSINESS CLASSIFICATION ───────────────────────────────────────────────────

CLUSTER_A = {
    "food_beverage":   ["restaurant","cafe","coffee","bakery","pizzeria","deli","sandwich","burger","taco","sushi","ice cream","brewery","bar","pub","food truck","catering","gyro","greek","bistro","buffet","steakhouse","seafood restaurant"],
    "grocery_market":  ["grocery","supermarket","market","food store","butcher","fish market","produce","dairy","farmers market","health food","organic","corner store","bodega","convenience store"],
    "pharmacy_health": ["pharmacy","drug store","chemist","wellness","supplement","vitamin","compounding pharmacy"],
    "retail_apparel":  ["boutique","clothing","apparel","fashion","shoe store","footwear","accessory","jewelry","handbag","thrift store","consignment"],
    "retail_home":     ["hardware","lumber","home improvement","furniture","home goods","decor","lighting","flooring","paint store","tool store"],
    "retail_specialty":["liquor","wine shop","bookstore","electronics","toy store","sporting goods","pet store","florist","gift shop","craft store","music store"],
    "services":        ["salon","spa","barber","nail salon","massage","fitness","gym","yoga","pilates","dance studio","martial arts","bowling","escape room","laundromat","dry cleaner"]
}

CLUSTER_B = {
    "technology":    ["saas","software","tech startup","platform","api","cloud","devops","ai","machine learning","cybersecurity","fintech","healthtech","edtech","legaltech","data analytics"],
    "professional":  ["law firm","legal","attorney","consulting","advisory","management consulting","accounting","bookkeeping","tax","audit","architecture","engineering firm","surveying"],
    "agencies":      ["marketing agency","advertising","creative agency","digital agency","pr agency","design agency","web development","app development","it agency","recruiting","staffing agency"],
    "healthcare":    ["dental","dentist","orthodontist","veterinary","vet","medical practice","clinic","urgent care","physical therapy","chiropractor","optometry","dermatology"],
    "finance_re":    ["private equity","venture capital","investment firm","hedge fund","real estate","property management","brokerage","mortgage broker","insurance agency","wealth management"],
    "logistics":     ["logistics","supply chain","distribution","warehousing","freight","shipping","courier","manufacturing","production facility"]
}

def classify_business(name: str, btype: str = None, desc: str = None) -> dict:
    text = f"{name} {btype or ''} {desc or ''}".lower()
    for cat, keywords in CLUSTER_A.items():
        for kw in keywords:
            if kw in text:
                return {"cluster": "A", "confidence": 0.92, "type": kw, "category": cat}
    for cat, keywords in CLUSTER_B.items():
        for kw in keywords:
            if kw in text:
                return {"cluster": "B", "confidence": 0.92, "type": kw, "category": cat}
    try:
        r = claude.messages.create(
            model="claude-opus-4-5", max_tokens=200,
            messages=[{"role": "user", "content": f"Classify '{name}' ({btype}) as Cluster A (physical/retail/food) or Cluster B (tech/professional). Return JSON only: {{\"cluster\":\"A|B\",\"type\":\"str\",\"confidence\":0.0-1.0}}"}]
        )
        raw = r.content[0].text.strip()
        if "```" in raw: raw = raw.split("```json")[-1].split("```")[0].strip()
        return json.loads(raw)
    except:
        return {"cluster": "A", "confidence": 0.5, "type": "general", "category": "general"}

# ── WAVE API ──────────────────────────────────────────────────────────────────

def wave_gql(query: str) -> dict:
    if not WAVE_TOKEN: return {}
    try:
        r = requests.post(WAVE_URL,
            headers={"Authorization": f"Bearer {WAVE_TOKEN}", "Content-Type": "application/json"},
            json={"query": query}, timeout=30)
        return r.json()
    except: return {}

def get_wave_data(business_name: str) -> dict:
    result = wave_gql("{ businesses(page:1,pageSize:50){ edges{ node{ id name } } } }")
    for b in result.get("data", {}).get("businesses", {}).get("edges", []):
        node = b["node"]
        if business_name.lower() in node["name"].lower():
            bid = node["id"]
            products  = wave_gql(f'{{ business(id:"{bid}") {{ products(page:1,pageSize:200){{ edges{{ node{{ id name unitPrice isSold isBought }} }} }} }} }}')
            invoices  = wave_gql(f'{{ business(id:"{bid}") {{ invoices(page:1,pageSize:100){{ edges{{ node{{ id status total createdAt customer{{ name }} lineItems{{ edges{{ node{{ product{{ name }} quantity unitPrice }} }} }} }} }} }} }} }}')
            customers = wave_gql(f'{{ business(id:"{bid}") {{ customers(page:1,pageSize:100){{ edges{{ node{{ id name email }} }} }} }} }}')
            bills     = wave_gql(f'{{ business(id:"{bid}") {{ bills(page:1,pageSize:100){{ edges{{ node{{ id status total createdAt vendor{{ name }} lineItems{{ edges{{ node{{ product{{ name }} quantity unitPrice }} }} }} }} }} }} }} }}')
            def extract(r, key): return [e["node"] for e in r.get("data",{}).get("business",{}).get(key,{}).get("edges",[])]
            return {
                "found": True, "business_id": bid, "business_name": node["name"],
                "products":  extract(products,  "products"),
                "invoices":  extract(invoices,  "invoices"),
                "customers": extract(customers, "customers"),
                "bills":     extract(bills,     "bills"),
            }
    return {"found": False, "products": [], "invoices": [], "customers": [], "bills": []}

# ── STRIPE API ────────────────────────────────────────────────────────────────

def get_stripe_data() -> dict:
    """Stripe integration — add STRIPE_SECRET_KEY to .env to enable"""
    return {"available": False}

# ── GITHUB API ────────────────────────────────────────────────────────────────

def get_github_data(repo: str) -> dict:
    token = os.getenv("GITHUB_TOKEN")
    if not token or not repo: return {"available": False}
    headers = {"Authorization": f"token {token}"}
    try:
        commits      = requests.get(f"https://api.github.com/repos/{repo}/commits?per_page=50",           headers=headers, timeout=10).json()
        prs          = requests.get(f"https://api.github.com/repos/{repo}/pulls?state=open&per_page=30",  headers=headers, timeout=10).json()
        issues       = requests.get(f"https://api.github.com/repos/{repo}/issues?state=open&labels=bug",  headers=headers, timeout=10).json()
        contributors = requests.get(f"https://api.github.com/repos/{repo}/contributors?per_page=20",      headers=headers, timeout=10).json()
        week_ago     = datetime.now() - timedelta(days=7)
        recent       = [c for c in commits if isinstance(c, dict) and datetime.strptime(c["commit"]["author"]["date"][:10], "%Y-%m-%d") > week_ago]
        contributor_commits = {}
        for c in commits:
            if isinstance(c, dict) and c.get("author"):
                login = c["author"].get("login", "unknown")
                contributor_commits[login] = contributor_commits.get(login, 0) + 1
        stale_prs = [p for p in prs if isinstance(p, dict) and (datetime.now() - datetime.strptime(p["created_at"][:10], "%Y-%m-%d")).days > 5]
        return {
            "available":           True,
            "commits_7d":          len(recent),
            "is_empty_repo":       len(commits) == 0,
            "open_prs":            len(prs) if isinstance(prs, list) else 0,
            "stale_prs":           len(stale_prs),
            "stale_pr_details":    [{"title": p["title"], "author": p["user"]["login"], "days_open": (datetime.now() - datetime.strptime(p["created_at"][:10], "%Y-%m-%d")).days} for p in stale_prs[:5]],
            "open_bugs":           len(issues) if isinstance(issues, list) else 0,
            "active_contributors": len(contributors) if isinstance(contributors, list) else 0,
            "contributor_commits": contributor_commits,
            "velocity":            "high" if len(recent) > 20 else "medium" if len(recent) > 8 else "low",
        }
    except Exception as e:
        return {"available": False, "error": str(e)}

# ── OPENFDA ───────────────────────────────────────────────────────────────────

def get_fda_data() -> dict:
    try:
        r = requests.get("https://api.fda.gov/drug/shortage.json?limit=20", timeout=10)
        if r.status_code == 200:
            return {"shortages": [{"drug": i.get("drug_name",""), "status": i.get("status",""), "reason": i.get("reason_for_shortage","")[:200]} for i in r.json().get("results",[])]}
    except: pass
    return {"shortages": []}

# ── WEATHER ───────────────────────────────────────────────────────────────────

def get_weather(location: str) -> dict:
    key = os.getenv("OPENWEATHER_API_KEY")
    if not key or not location: return {"available": False}
    try:
        r = requests.get(f"https://api.openweathermap.org/data/2.5/forecast?q={location}&appid={key}&units=imperial&cnt=16", timeout=10).json()
        if r.get("cod") != "200": return {"available": False}
        def dm(cond, temp):
            if any(w in cond.lower() for w in ["rain","snow","storm"]): return 0.75
            return 0.85 if (temp > 90 or temp < 30) else 1.0
        return {
            "available": True,
            "today":    {"condition": r["list"][0]["weather"][0]["description"],  "temp_f": int(r["list"][0]["main"]["temp"]),  "demand_multiplier": dm(r["list"][0]["weather"][0]["description"],  r["list"][0]["main"]["temp"])},
            "tomorrow": {"condition": r["list"][8]["weather"][0]["description"],  "temp_f": int(r["list"][8]["main"]["temp"]),  "demand_multiplier": dm(r["list"][8]["weather"][0]["description"],  r["list"][8]["main"]["temp"])},
            "weekend":  {"condition": r["list"][14]["weather"][0]["description"], "temp_f": int(r["list"][14]["main"]["temp"]), "demand_multiplier": dm(r["list"][14]["weather"][0]["description"], r["list"][14]["main"]["temp"])},
        }
    except: return {"available": False}

# ── EXA MARKET INTELLIGENCE ───────────────────────────────────────────────────

def exa_fetch(query: str, n: int = 6, chars: int = 1200) -> str:
    try:
        results = exa_client.search_and_contents(query, num_results=n, text={"max_characters": chars})
        return "\n\n".join([f"[{r.url}]\n{r.text}" for r in results.results if r.text])
    except: return ""

def get_market_intelligence(business_name: str, btype: str, location: str, cluster: str) -> dict:
    now = datetime.now().strftime("%B %Y")
    data = {}
    data["competitors"] = exa_fetch(f"{business_name} competitors {location} pricing market share {now}")
    data["trends"]      = exa_fetch(f"{btype} industry trends growth challenges {now}")
    data["suppliers"]   = exa_fetch(f"wholesale {btype} supplier pricing cost trends {now}")
    data["regulations"] = exa_fetch(f"{btype} regulatory compliance requirements {now}")
    if cluster == "B":
        data["funding"] = exa_fetch(f"{btype} startup funding M&A valuations {now}")
        data["ai_tools"] = exa_fetch(f"AI automation tools {btype} cost savings {now}")
    return {k: v for k, v in data.items() if v}

# ── VOICE INTEGRATION ─────────────────────────────────────────────────────────

def integrate_voice(voice_output: dict, cluster: str) -> dict:
    if not voice_output: return {}
    signals = {}
    # Cluster A signals
    if cluster == "A":
        signals["avg_sentiment"]      = voice_output.get("trends", {}).get("avg_sentiment_30d")
        signals["top_themes"]         = voice_output.get("trends", {}).get("top_themes", [])
        signals["pricing_alerts"]     = voice_output.get("pricing_alerts", [])
        signals["health_alerts"]      = voice_output.get("health_alerts", [])
        signals["menu_recommendations"] = voice_output.get("menu_recommendations", [])
        signals["temporal_alerts"]    = voice_output.get("temporal_alerts", [])
        signals["loyalty_alerts"]     = voice_output.get("loyalty_alerts", [])
        signals["social_alerts"]      = voice_output.get("social_alerts", [])
        signals["pulse_signals"]      = voice_output.get("pulse_signals", {})
        signals["review_count"]       = voice_output.get("trends", {}).get("review_count", 0)
        signals["negative_count"]     = voice_output.get("trends", {}).get("negative_count", 0)
    # Cluster B signals
    else:
        signals["meeting_intelligence"]  = voice_output.get("meeting_intelligence", [])
        signals["team_health"]           = voice_output.get("team_health", {})
        signals["policy_alerts"]         = voice_output.get("policy_alerts", [])
        signals["market_intelligence"]   = voice_output.get("market_intelligence", [])
        signals["strategic_alerts"]      = voice_output.get("strategic_alerts", [])
        signals["avg_client_sentiment"]  = voice_output.get("trends", {}).get("avg_client_sentiment_30d")
        signals["top_feature_requests"]  = voice_output.get("trends", {}).get("top_feature_requests", [])
        signals["top_concerns"]          = voice_output.get("trends", {}).get("top_concerns", [])
        signals["pmf_drift_score"]       = voice_output.get("trends", {}).get("pmf_drift_score")
    return signals

# ── CUSTOM DATASET NORMALIZER ─────────────────────────────────────────────────

def load_and_normalize_dataset(
    path: str = None,
    raw: dict = None,
    text: str = None,
) -> dict:
    """
    Universal data ingestion — accepts ANY format:
    - JSON file path (path="data.json")
    - JSON dict (raw={...})
    - CSV file path (path="sales.csv")
    - Plain text description (text="my gyro meat costs $6.20/lb...")
    - PDF invoice path (path="invoice.pdf") — extracts text first
    - Any combination of the above

    Claude normalizes everything to SHELF standard format.
    """
    content_parts = []

    # 1 — raw dict
    if raw:
        content_parts.append(f"=== PROVIDED DATA (dict) ===\n{json.dumps(raw, indent=2)[:4000]}")

    # 2 — file
    if path and os.path.exists(path):
        ext = os.path.splitext(path)[1].lower()

        if ext == ".json":
            with open(path) as f:
                content_parts.append(f"=== JSON FILE: {path} ===\n{f.read()[:4000]}")

        elif ext == ".csv":
            with open(path) as f:
                content_parts.append(f"=== CSV FILE: {path} ===\n{f.read()[:4000]}")

        elif ext in [".txt", ".md"]:
            with open(path) as f:
                content_parts.append(f"=== TEXT FILE: {path} ===\n{f.read()[:4000]}")

        elif ext == ".pdf":
            try:
                import subprocess
                result = subprocess.run(["pdftotext", path, "-"], capture_output=True, text=True, timeout=15)
                if result.returncode == 0:
                    content_parts.append(f"=== PDF FILE: {path} ===\n{result.stdout[:4000]}")
                else:
                    # fallback — read raw bytes and let Claude try
                    with open(path, "rb") as f:
                        content_parts.append(f"=== PDF FILE (raw): {path} — could not extract text ===")
            except Exception as e:
                content_parts.append(f"=== PDF FILE: {path} — extraction failed: {e} ===")

        elif ext in [".xlsx", ".xls"]:
            try:
                import csv, io
                result = subprocess.run(["python3", "-c",
                    f"import openpyxl; wb=openpyxl.load_workbook('{path}'); ws=wb.active; [print(','.join([str(c.value or '') for c in row])) for row in ws.iter_rows()]"],
                    capture_output=True, text=True, timeout=15)
                content_parts.append(f"=== EXCEL FILE: {path} ===\n{result.stdout[:4000]}")
            except Exception as e:
                content_parts.append(f"=== EXCEL FILE: {path} — could not parse: {e} ===")

    # 3 — plain text / description
    if text:
        content_parts.append(f"=== TEXT DESCRIPTION ===\n{text[:3000]}")

    if not content_parts:
        return {}

    combined = "\n\n".join(content_parts)

    try:
        r = claude.messages.create(
            model="claude-opus-4-5", max_tokens=3000,
            system="You are a business data extraction specialist. Extract ALL available business data and normalize to standard format. Return ONLY JSON. No markdown.",
            messages=[{"role": "user", "content": f"""Extract and normalize ALL business data from the following input.
The input may be JSON, CSV, plain text, invoice data, or any other format.
Extract every number, name, cost, price, employee detail you can find.

{combined}

Return this JSON structure (use null for truly missing fields, never fabricate numbers):
{{
  "monthly_revenue": float or null,
  "annual_revenue": float or null,
  "revenue_growth_pct": float or null,
  "gross_margin_pct": float or null,
  "operating_margin_pct": float or null,
  "customer_count": int or null,
  "avg_customer_value": float or null,
  "employee_count": int or null,
  "cost_of_goods": [
    {{"item": str, "current_cost": float, "cost_3mo_ago": float or null, "cost_6mo_ago": float or null, "selling_price": float or null, "units_sold_30d": int or null, "supplier": str or null}}
  ],
  "employees": [
    {{"name": str, "role": str, "shift": str or null, "hourly_rate": float or null, "hours_per_week": float or null, "performance_notes": str or null}}
  ],
  "operational_issues": [
    {{"issue": str, "impact": str, "cost_estimate": float or null, "urgency": "high|medium|low"}}
  ],
  "supplier_invoices": [
    {{"supplier": str, "date": str or null, "amount": float or null, "items": [str], "price_changes": str or null}}
  ],
  "waste_data": [
    {{"item": str, "weekly_waste_units": float or null, "waste_cost": float or null}}
  ],
  "delivery_fees": {{"doordash_pct": float or null, "ubereats_pct": float or null}},
  "api_costs": [{{"service": str, "monthly_cost": float, "usage": str}}],
  "churn_rate_pct": float or null,
  "mrr": float or null,
  "arr": float or null,
  "burn_rate": float or null,
  "runway_months": float or null,
  "opportunities": [{{"opportunity": str, "potential_revenue": float, "implementation_cost": float}}],
  "customer_metrics": {{"repeat_customer_rate": float or null, "avg_rating": float or null, "common_complaints": [str], "common_praise": [str]}}
}}"""}]
        )
        raw_text = r.content[0].text.strip()
        if "```" in raw_text:
            raw_text = raw_text.split("```json")[-1].split("```")[0].strip()
        normalized = json.loads(raw_text)
        normalized["_raw_input"] = combined[:500]
        return normalized
    except Exception as e:
        print(f"  [NORMALIZE] Error: {e}")
        return {"_raw_input": combined[:500]}

# ── EMPLOYEE INTELLIGENCE ─────────────────────────────────────────────────────

def get_role_type(role: str) -> str:
    """Classify employee role for targeted scoring"""
    role = role.lower()
    if any(r in role for r in ["engineer","developer","dev","coder","backend","frontend","ml","data","devops"]): return "engineer"
    if any(r in role for r in ["sales","account","bdr","sdr","ae","csm","customer success"]): return "sales"
    if any(r in role for r in ["chef","cook","kitchen","prep","baker","line"]): return "kitchen"
    if any(r in role for r in ["driver","delivery","courier"]): return "driver"
    if any(r in role for r in ["cashier","server","front","host","barista","bartender"]): return "frontline"
    if any(r in role for r in ["manager","supervisor","lead","director","vp","cto","cfo","ceo","founder"]): return "manager"
    if any(r in role for r in ["marketing","content","designer","creative","brand"]): return "marketing"
    if any(r in role for r in ["recruiter","hr","people","talent"]): return "hr"
    return "general"

def score_engineer(notes: str, emp: dict, github_data: dict) -> tuple:
    """Score engineer based on velocity, quality, reliability"""
    flags, actions, praise = [], [], []
    s = 100

    # velocity
    commits_7d = emp.get("commits_7d", 0)
    if commits_7d == 0 and not emp.get("is_new", False):
        flags.append("Zero commits this week — no visible output")
        actions.append("Check for blockers in 1:1 today")
        s -= 25
    elif commits_7d < 3:
        flags.append(f"Low commit velocity — only {commits_7d} commits this week")
        actions.append("Identify what's blocking progress")
        s -= 10
    elif commits_7d > 15:
        praise.append(f"High velocity — {commits_7d} commits this week")
        s += 15

    # PR health
    stale_prs = emp.get("stale_prs", 0)
    if stale_prs > 0:
        flags.append(f"{stale_prs} stale PR(s) open >5 days — blocking code review")
        actions.append("Review and merge or close stale PRs today")
        s -= stale_prs * 10

    open_bugs = emp.get("open_bugs_owned", 0)
    if open_bugs > 3:
        flags.append(f"{open_bugs} open bugs attributed to this engineer")
        actions.append("Prioritize bug fixes before new features")
        s -= open_bugs * 5

    # notes-based
    if "stalled" in notes:
        flags.append("Feature stalled — blocking team velocity")
        actions.append("Unblock or reassign today")
        s -= 20
    if "low commit" in notes:
        flags.append("Low commit velocity pattern")
        actions.append("Check for hidden blockers")
        s -= 15
    if "great pr" in notes or "clean code" in notes or "fast review" in notes:
        praise.append("High code quality and review speed")
        s += 15
    if "mentor" in notes or "helped" in notes:
        praise.append("Mentoring teammates — team multiplier")
        s += 10

    # deadline tracking
    if "missed deadline" in notes or "overdue" in notes:
        flags.append("Missed deadline — reliability risk")
        actions.append("Review capacity and sprint commitments")
        s -= 20
    if "delivered early" in notes or "ahead of schedule" in notes:
        praise.append("Delivered ahead of schedule")
        s += 20

    return flags, actions, praise, s

def score_sales(notes: str, emp: dict) -> tuple:
    """Score sales rep based on revenue, pipeline, win rate"""
    flags, actions, praise = [], [], []
    s = 100

    revenue_pct = emp.get("quota_attainment_pct", None)
    if revenue_pct is not None:
        if revenue_pct < 70:
            flags.append(f"Quota attainment at {revenue_pct}% — significantly below target")
            actions.append("Review pipeline quality and deal velocity in weekly 1:1")
            s -= 30
        elif revenue_pct < 90:
            flags.append(f"Quota attainment at {revenue_pct}% — needs improvement")
            actions.append("Identify stalled deals and accelerate closing")
            s -= 15
        elif revenue_pct >= 110:
            praise.append(f"Quota attainment at {revenue_pct}% — exceeding target")
            s += 20

    win_rate = emp.get("win_rate_pct", None)
    if win_rate is not None:
        if win_rate < 20:
            flags.append(f"Win rate {win_rate}% — below industry benchmark (25-30%)")
            actions.append("Review sales process and qualification criteria")
            s -= 15
        elif win_rate > 40:
            praise.append(f"Win rate {win_rate}% — top performer")
            s += 15

    churn_rate = emp.get("account_churn_pct", None)
    if churn_rate is not None and churn_rate > 15:
        flags.append(f"Accounts churning at {churn_rate}% — possible qualification or handoff issues")
        actions.append("Review account health scores for this rep's portfolio")
        s -= 20

    deal_velocity = emp.get("avg_deal_days", None)
    if deal_velocity is not None and deal_velocity > 90:
        flags.append(f"Average deal cycle {deal_velocity} days — too slow")
        actions.append("Identify bottlenecks in deal progression")
        s -= 10

    if "missed follow" in notes or "no follow" in notes:
        flags.append("Inconsistent follow-up pattern detected")
        actions.append("Implement CRM follow-up reminders")
        s -= 15

    if "top performer" in notes or "president club" in notes or "best" in notes:
        praise.append("Consistent top performer — retention critical")
        s += 25

    return flags, actions, praise, s

def score_kitchen(notes: str, emp: dict, negative_reviews: list, shift: str) -> tuple:
    """Score kitchen staff on quality, consistency, waste"""
    flags, actions, praise = [], [], []
    s = 100

    waste_pct = emp.get("waste_rate_pct", None)
    if waste_pct is not None:
        if waste_pct > 15:
            flags.append(f"Waste rate {waste_pct}% — above 10% threshold, costing extra margin")
            actions.append("Review portion control and prep scheduling")
            s -= 20
        elif waste_pct < 5:
            praise.append(f"Excellent waste control at {waste_pct}%")
            s += 10

    prep_accuracy = emp.get("order_accuracy_pct", None)
    if prep_accuracy is not None:
        if prep_accuracy < 95:
            flags.append(f"Order accuracy {prep_accuracy}% — below 95% standard")
            actions.append("Review ticket reading process and kitchen workflow")
            s -= 20
        elif prep_accuracy > 99:
            praise.append(f"Near-perfect order accuracy at {prep_accuracy}%")
            s += 15

    # review cross-reference for kitchen
    for review in negative_reviews:
        text = (review.get("original_review", "") or "").lower()
        if any(w in text for w in ["cold food","wrong order","bad food","quality","taste"]):
            flags.append(f"Food quality complaint — possible match for your shift: '{review.get('original_review','')[:80]}'")
            actions.append("Quality check protocol for your station this week")
            s -= 15

    if shift in ["night","late"] and any("cold" in (r.get("original_review","") or "").lower() for r in negative_reviews):
        flags.append("Cold food complaints concentrated in night shift")
        actions.append("Check holding temperatures and timing for late orders")
        s -= 10

    if "consistent" in notes or "excellent" in notes or "no waste" in notes:
        praise.append("Consistent quality and efficiency")
        s += 15
    if "complaint" in notes or "return" in notes:
        flags.append("Dish returns or complaints attributed to this station")
        actions.append("Review recipe standards and portion sizes")
        s -= 20

    return flags, actions, praise, s

def score_driver(notes: str, emp: dict, negative_reviews: list) -> tuple:
    """Score delivery driver on accuracy, timing, customer satisfaction"""
    flags, actions, praise = [], [], []
    s = 100

    late_pct = emp.get("late_delivery_pct", None)
    if late_pct is not None:
        if late_pct > 10:
            flags.append(f"Late delivery rate {late_pct}% — above 10% threshold")
            actions.append("Review route planning and order batching")
            s -= 25
        elif late_pct < 3:
            praise.append(f"On-time delivery rate excellent — only {late_pct}% late")
            s += 15

    accuracy = emp.get("delivery_accuracy_pct", None)
    if accuracy is not None:
        if accuracy < 97:
            flags.append(f"Delivery accuracy {accuracy}% — missing items or wrong orders")
            actions.append("Double-check order before leaving kitchen")
            s -= 20

    if "late" in notes:
        count = notes.count("late")
        flags.append(f"Late delivery pattern in notes — {count} incidents mentioned")
        actions.append("Issue formal warning and review delivery process")
        s -= count * 8

    for review in negative_reviews:
        text = (review.get("original_review", "") or "").lower()
        if any(w in text for w in ["delivery","late delivery","missing","wrong delivery","cold delivery"]):
            flags.append(f"Delivery complaint — possible match: '{review.get('original_review','')[:80]}'")
            actions.append("Review delivery for this order window")
            s -= 15

    if "excellent" in notes or "fast" in notes or "accurate" in notes:
        praise.append("Reliable and accurate delivery — customer satisfaction driver")
        s += 20

    return flags, actions, praise, s

def score_frontline(notes: str, emp: dict, negative_reviews: list, review_themes: list, shift: str) -> tuple:
    """Score cashier/server/barista on service quality, accuracy, speed"""
    flags, actions, praise = [], [], []
    s = 100

    void_rate = emp.get("void_rate_pct", None)
    if void_rate is not None and void_rate > 5:
        flags.append(f"Void rate {void_rate}% — above 5% threshold, potential margin leakage")
        actions.append("Audit POS transactions for this employee")
        s -= 20

    if "void" in notes or "comp" in notes:
        flags.append("High comp/void rate in notes — investigate")
        actions.append("Pull POS report for this employee this week")
        s -= 20

    if "wait_time" in str(review_themes) and shift in ["night","weekend","rush"]:
        flags.append("Wait time complaints spike during your shift")
        actions.append("Practice express service protocol during rush")
        s -= 15

    for review in negative_reviews:
        text = (review.get("original_review", "") or "").lower()
        if any(w in text for w in ["rude","attitude","unfriendly","slow cashier","wrong charge"]):
            flags.append(f"Service complaint matches role — '{review.get('original_review','')[:80]}'")
            actions.append("Customer service coaching session required")
            s -= 20
        if any(w in text for w in ["friendly","helpful","great service","fast"]):
            praise.append(f"Positive service mention — '{review.get('original_review','')[:80]}'")
            s += 10

    if "excellent" in notes or "praised" in notes or "great" in notes:
        praise.append("Consistently praised by customers")
        s += 20
    if "complaint" in notes:
        flags.append("Customer complaints attributed to this employee")
        actions.append("Performance review required this week")
        s -= 20

    return flags, actions, praise, s

def score_manager(notes: str, emp: dict, negative_reviews: list, review_themes: list) -> tuple:
    """Score manager on team performance, operations, coverage"""
    flags, actions, praise = [], [], []
    s = 100

    if "overtime" in notes:
        flags.append("Manager working excessive overtime — single point of failure risk")
        actions.append("Cross-train another employee for management coverage")
        s -= 15

    team_complaints = len(negative_reviews)
    if team_complaints > 3:
        flags.append(f"{team_complaints} negative reviews during their oversight — operational gap")
        actions.append("Review operational procedures during this manager's shifts")
        s -= team_complaints * 5

    if "wait_time" in str(review_themes):
        flags.append("Wait time complaints occurring during managed shifts")
        actions.append("Implement pre-rush preparation protocol")
        s -= 10

    if "understaffed" in notes or "alone" in notes:
        flags.append("Managing understaffed shifts — unsustainable and risky")
        actions.append("Hire minimum one part-time backup for peak coverage")
        s -= 20

    if "excellent" in notes or "strong" in notes or "runs well" in notes:
        praise.append("Consistently runs smooth operations")
        s += 20
    if "team loves" in notes or "low turnover" in notes:
        praise.append("Strong team culture — retention asset")
        s += 15

    return flags, actions, praise, s

def analyze_employees(employees: list, revenue: float, cluster: str,
                      voice_signals: dict = None, github_data: dict = None) -> dict:
    """
    Universal role-aware employee intelligence.
    Cluster A: kitchen, driver, frontline, manager scoring
    Cluster B: engineer, sales, marketing, manager scoring
    Cross-references reviews, GitHub, sales data, deadlines.
    """
    if not employees:
        return {"employees": [], "labor_cost": 0, "labor_pct_revenue": 0, "flagged_count": 0}

    total_labor = sum((e.get("hourly_rate", 0) or 0) * (e.get("hours_per_week", 0) or 0) * 4 for e in employees)
    labor_pct   = round(total_labor / max(revenue, 1) * 100, 1)

    # extract signals
    review_themes    = []
    negative_reviews = []
    if voice_signals:
        review_themes    = voice_signals.get("top_themes", [])
        replies          = voice_signals.get("replies", [])
        negative_reviews = [r for r in (replies or []) if isinstance(r, dict) and (r.get("sentiment_score") or 1) < 0.4]

    # GitHub contributor data
    contributor_commits = {}
    stale_pr_owners     = {}
    if github_data and github_data.get("available"):
        contributor_commits = github_data.get("contributor_commits", {})
        for pr in github_data.get("stale_pr_details", []):
            author = pr.get("author", "")
            stale_pr_owners[author] = stale_pr_owners.get(author, 0) + 1

    individual_flags = []
    for emp in employees:
        name   = emp.get("name", "Unknown")
        role   = (emp.get("role", "") or "")
        notes  = (emp.get("performance_notes", "") or "").lower()
        shift  = (emp.get("shift", "") or "").lower()
        rate   = emp.get("hourly_rate", 0) or 0
        hours  = emp.get("hours_per_week", 0) or 0
        monthly_cost = rate * hours * 4
        role_type    = get_role_type(role)

        # enrich with GitHub data for engineers
        if role_type == "engineer":
            github_login = emp.get("github_login", name.lower().replace(" ", ""))
            emp["commits_7d"]        = contributor_commits.get(github_login, emp.get("commits_7d", 0))
            emp["stale_prs"]         = stale_pr_owners.get(github_login, emp.get("stale_prs", 0))
            emp["open_bugs_owned"]   = emp.get("open_bugs_owned", 0)

        # role-aware scoring
        if role_type == "engineer":
            flags, actions, praise, score = score_engineer(notes, emp, github_data or {})
        elif role_type == "sales":
            flags, actions, praise, score = score_sales(notes, emp)
        elif role_type == "kitchen":
            flags, actions, praise, score = score_kitchen(notes, emp, negative_reviews, shift)
        elif role_type == "driver":
            flags, actions, praise, score = score_driver(notes, emp, negative_reviews)
        elif role_type == "frontline":
            flags, actions, praise, score = score_frontline(notes, emp, negative_reviews, review_themes, shift)
        elif role_type == "manager":
            flags, actions, praise, score = score_manager(notes, emp, negative_reviews, review_themes)
        else:
            flags, actions, praise, score = [], [], [], 80

        # universal flags for all roles
        if "late" in notes and role_type not in ["driver"]:
            flags.append("Tardiness pattern — reliability risk")
            actions.append("Issue formal warning if pattern continues")
            score -= 10
        if "overtime" in notes and role_type not in ["manager", "engineer"]:
            flags.append(f"Overtime pattern — extra cost ${rate * hours * 0.5 * 1.5:.0f}/mo")
            actions.append("Review scheduling to reduce overtime")
            score -= 10
        if "excellent" in notes or "outstanding" in notes:
            praise.append("Outstanding overall performance")
            score += 15

        score = max(0, min(100, score))

        # deadline tracking (Cluster B)
        deadlines = []
        if cluster == "B":
            for ticket in emp.get("overdue_tickets", []):
                days = ticket.get("days_overdue", 0)
                flags.append(f"Overdue ticket '{ticket.get('title','')}' — {days} days late")
                actions.append(f"Escalate or reassign '{ticket.get('title','')}' today")
                score -= min(days * 3, 20)
                deadlines.append({"ticket": ticket.get("title",""), "days_overdue": days})

        individual_flags.append({
            "name":             name,
            "role":             role,
            "role_type":        role_type,
            "shift":            emp.get("shift", ""),
            "monthly_cost":     round(monthly_cost, 2),
            "hourly_rate":      rate,
            "hours_per_week":   hours,
            "flags":            flags,
            "actions":          actions,
            "praise":           praise,
            "performance_score": score,
            "urgency":          "critical" if len(flags) > 2 else "high" if flags else "none",
            "performance_notes": emp.get("performance_notes", ""),
            "review_cross_ref": any("complaint" in f.lower() or "review" in f.lower() or "match" in f.lower() for f in flags),
            "deadlines":        deadlines,
            # role-specific metrics
            "commits_7d":       emp.get("commits_7d") if role_type == "engineer" else None,
            "quota_pct":        emp.get("quota_attainment_pct") if role_type == "sales" else None,
            "win_rate":         emp.get("win_rate_pct") if role_type == "sales" else None,
            "waste_rate":       emp.get("waste_rate_pct") if role_type == "kitchen" else None,
            "order_accuracy":   emp.get("order_accuracy_pct") if role_type in ["kitchen","driver","frontline"] else None,
        })

    # leaderboard + employee of the week
    scored = sorted(individual_flags, key=lambda x: x.get("performance_score", 0), reverse=True)
    eotw   = next((e for e in scored if e.get("praise") and not e.get("flags")),
                  next((e for e in scored if e.get("praise")), scored[0] if scored else None))

    # role-group averages
    role_groups = {}
    for e in individual_flags:
        rt = e["role_type"]
        if rt not in role_groups:
            role_groups[rt] = []
        role_groups[rt].append(e["performance_score"])
    role_avg = {rt: round(sum(scores)/len(scores), 1) for rt, scores in role_groups.items()}

    return {
        "employees":           individual_flags,
        "total_labor_cost":    round(total_labor, 2),
        "labor_pct_revenue":   labor_pct,
        "labor_risk":          "high" if labor_pct > 40 else "medium" if labor_pct > 30 else "low",
        "flagged_count":       sum(1 for e in individual_flags if e["flags"]),
        "praised_count":       sum(1 for e in individual_flags if e["praise"]),
        "review_linked_flags": sum(1 for e in individual_flags if e["review_cross_ref"]),
        "overtime_employees":  [e["name"] for e in individual_flags if "overtime" in str(e["flags"]).lower()],
        "critical_employees":  [e["name"] for e in individual_flags if e["urgency"] == "critical"],
        "role_performance_avg": role_avg,
        "employee_of_the_week": {
            "name":             eotw["name"] if eotw else None,
            "role":             eotw["role"] if eotw else None,
            "score":            eotw.get("performance_score", 0) if eotw else 0,
            "reason":           eotw["praise"][0] if eotw and eotw.get("praise") else "Top performer this period",
            "recommended_reward": "Feature on social media + $25 bonus or preferred shift choice"
        },
        "leaderboard": [
            {
                "rank":  i+1,
                "name":  e["name"],
                "role":  e["role"],
                "role_type": e["role_type"],
                "score": e.get("performance_score", 0),
                "status": "star" if e.get("praise") and not e.get("flags") else "needs_support" if e.get("flags") else "solid"
            }
            for i, e in enumerate(scored[:10])
        ]
    }

# ── MARGIN CALCULATOR ─────────────────────────────────────────────────────────

def calculate_margins(cost_of_goods: list, waste_data: list = None, delivery_fees: dict = None) -> list:
    """Calculate real-time margin per item including waste and delivery fees"""
    waste_map    = {w["item"]: w for w in (waste_data or [])}
    raw_pct      = (delivery_fees or {}).get("doordash_pct")
    delivery_pct = float(raw_pct) / 100 if raw_pct is not None else 0.0
    items = []
    for item in cost_of_goods:
        name          = item.get("item", item.get("item_name", "Unknown"))
        selling_price = item.get("selling_price", 0)
        current_cost  = item.get("current_cost", 0)
        cost_3mo      = item.get("cost_3mo_ago", current_cost)
        cost_6mo      = item.get("cost_6mo_ago", current_cost)
        units_30d     = item.get("units_sold_30d", 0)
        waste         = waste_map.get(name, {})
        waste_cost_mo = waste.get("weekly_waste_units", 0) * waste.get("waste_cost", current_cost) * 4
        effective_selling = selling_price * (1 - delivery_pct) if delivery_pct else selling_price
        true_cost     = current_cost + (waste_cost_mo / max(units_30d, 1))
        margin_pct    = round((effective_selling - true_cost) / max(effective_selling, 0.01) * 100, 1)
        cost_rise_3mo = round((current_cost - cost_3mo) / max(cost_3mo, 0.01) * 100, 1)
        cost_rise_6mo = round((current_cost - cost_6mo) / max(cost_6mo, 0.01) * 100, 1)
        monthly_profit = round((effective_selling - true_cost) * units_30d, 2)
        flag = margin_pct < 25 or cost_rise_3mo > 8 or cost_rise_6mo > 15
        items.append({
            "item":            name,
            "selling_price":   selling_price,
            "current_cost":    current_cost,
            "true_cost":       round(true_cost, 2),
            "margin_pct":      margin_pct,
            "cost_rise_3mo":   cost_rise_3mo,
            "cost_rise_6mo":   cost_rise_6mo,
            "monthly_revenue": round(selling_price * units_30d, 2),
            "monthly_profit":  monthly_profit,
            "waste_cost_mo":   round(waste_cost_mo, 2),
            "supplier":        item.get("supplier", "Unknown"),
            "flag":            flag,
            "flag_reason":     ("margin <25%" if margin_pct < 25 else "") + (" cost +>8% in 3mo" if cost_rise_3mo > 8 else "")
        })
    return sorted(items, key=lambda x: x["margin_pct"])

# ── UNIT ECONOMICS (Cluster B) ────────────────────────────────────────────────

def calculate_unit_economics(data: dict) -> dict:
    rev      = data.get("monthly_revenue", 0)
    mrr      = data.get("mrr", rev)
    arr      = data.get("arr", mrr * 12)
    customers = data.get("customer_count", 1)
    churn    = data.get("churn_rate_pct", 5)
    burn     = data.get("burn_rate", mrr * 0.8)
    runway   = data.get("runway_months", 0)
    arpu     = mrr / max(customers, 1)
    ltv      = (arpu * 12) / max(churn / 100, 0.001)
    cac      = data.get("cac", arpu * 12)
    ltv_cac  = round(ltv / max(cac, 1), 2)
    return {
        "mrr":              round(mrr, 2),
        "arr":              round(arr, 2),
        "arpu":             round(arpu, 2),
        "ltv":              round(ltv, 2),
        "cac":              round(cac, 2),
        "ltv_cac_ratio":    ltv_cac,
        "churn_rate_pct":   churn,
        "burn_rate":        round(burn, 2),
        "runway_months":    runway,
        "efficiency":       "excellent" if ltv_cac >= 3 else "good" if ltv_cac >= 2 else "poor",
        "health":           "healthy" if ltv_cac >= 3 and churn < 5 else "at_risk" if ltv_cac < 2 else "marginal"
    }

# ── STRATEGIC ANALYSIS ENGINE ─────────────────────────────────────────────────

def strategic_analysis(
    business_name: str, cluster: str, btype: str,
    wave_data: dict, stripe_data: dict, github_data: dict,
    fda_data: dict, weather: dict, market_intel: dict,
    voice_signals: dict, normalized_data: dict,
    margins: list, employee_analysis: dict,
    unit_economics: dict, temporal: dict
) -> dict:

    # Revenue — best available source
    if stripe_data.get("net_revenue"):
        revenue = stripe_data["net_revenue"]
        rev_source = "Stripe"
    elif wave_data.get("invoices"):
        revenue = sum(i.get("total", 0) for i in wave_data["invoices"][:50])
        rev_source = "Wave"
    elif normalized_data.get("monthly_revenue"):
        revenue = normalized_data["monthly_revenue"]
        rev_source = "Custom Dataset"
    else:
        revenue = 50000
        rev_source = "Industry Benchmark"

    flagged_items    = [m for m in margins if m["flag"]]
    flagged_employees = [e for e in employee_analysis.get("employees", []) if e["flags"]]
    total_margin_risk = sum(m["monthly_profit"] for m in flagged_items if m["monthly_profit"] < 0)

    context = f"""
=== BUSINESS INTELLIGENCE BRIEF ===
Business: {business_name} | Type: {btype} | Cluster: {cluster}
Date: {temporal['current_datetime']} | Season: {temporal['season']}
Revenue: ${revenue:,.0f}/mo (source: {rev_source})
Employee Count: {normalized_data.get('employee_count', len(employee_analysis.get('employees', [])))}
Labor Cost: ${employee_analysis.get('total_labor_cost', 0):,.0f}/mo ({employee_analysis.get('labor_pct_revenue', 0)}% of revenue)

=== MARGIN ANALYSIS ({len(margins)} items) ===
Flagged Items: {len(flagged_items)}
{json.dumps(margins[:10], indent=2)}

=== EMPLOYEE INTELLIGENCE ===
Flagged Employees: {employee_analysis.get('flagged_count', 0)}
Labor Risk: {employee_analysis.get('labor_risk', 'unknown')}
{json.dumps(flagged_employees[:5], indent=2)}

=== WAVE ACCOUNTING ===
Products: {len(wave_data.get('products', []))} | Invoices: {len(wave_data.get('invoices', []))} | Customers: {len(wave_data.get('customers', []))} | Bills: {len(wave_data.get('bills', []))}
Sample invoices: {json.dumps(wave_data.get('invoices', [])[:3], indent=2)}

=== STRIPE DATA ===
{json.dumps(stripe_data, indent=2)}

=== GITHUB DATA ===
{json.dumps(github_data, indent=2) if cluster == "B" else "N/A"}

=== UNIT ECONOMICS ===
{json.dumps(unit_economics, indent=2) if cluster == "B" else "N/A - Cluster A business"}

=== FDA / PHARMACY DATA ===
{json.dumps(fda_data, indent=2) if btype == "pharmacy" else "N/A"}

=== WEATHER ===
{json.dumps(weather, indent=2)}

=== MARKET INTELLIGENCE (Exa) ===
Competitors: {market_intel.get('competitors', '')[:1500]}
Trends: {market_intel.get('trends', '')[:1000]}
Suppliers: {market_intel.get('suppliers', '')[:800]}
Regulations: {market_intel.get('regulations', '')[:800]}
{f"Funding: {market_intel.get('funding', '')[:800]}" if cluster == "B" else ""}

=== VOICE AGENT SIGNALS ===
{json.dumps(voice_signals, indent=2)[:2500]}

=== CUSTOM DATASET ===
{json.dumps({k: v for k, v in normalized_data.items() if k != "raw"}, indent=2)[:2000]}
"""

    system = f"""You are SHELF, the world's most advanced business intelligence agent.
You have MBA-level strategy, CPA-level finance, and operations expertise for ANY business type.
You MUST think beyond what humans typically notice — surface non-obvious patterns, second-order effects, and hidden margin killers.

CLUSTER: {cluster} | BUSINESS TYPE: {btype}

YOUR ANALYSIS MUST INCLUDE:
1. Every cost signal — gradual price creep, waste, over-portioning, delivery fee erosion, zombie subscriptions
2. Every employee signal — individual performance outliers, labor efficiency, overtime patterns
3. Every market signal — competitor moves, supplier consolidation opportunities, regulatory deadlines
4. VOICE cross-references — connect review themes to cost data (e.g. wait time complaints + understaffing cost)
5. Weather + events cross-reference — demand forecast + inventory/staffing recommendations
6. Escalation routing — who exactly needs to know what, CEO vs individuals

ESCALATION RULES:
- CEO: any decision >$200 financial impact, strategic risks, compliance violations, market threats
- Individual employees: only their domain — chef gets food cost alerts, dev gets code velocity alerts, driver gets delivery accuracy alerts
- Flag with urgency: critical (act today), high (act this week), medium (act this month)

For Cluster B SaaS specifically:
- Calculate feature-level P&L if possible
- Flag API cost creep per service
- Connect GitHub velocity to labor cost efficiency
- Surface unit economics breaking points

Return this EXACT JSON structure — be specific, use real numbers:
{{
  "executive_summary": {{
    "business_health_score": 0-100,
    "revenue_per_month": {revenue},
    "primary_opportunity": "specific action with $ impact",
    "primary_risk": "specific risk with $ exposure",
    "one_sentence_recommendation": "what to do today",
    "strategic_moat": "what protects this business",
    "exit_valuation_estimate_usd": float,
    "data_confidence": "high|medium|low"
  }},
  "cost_intelligence": {{
    "total_monthly_cogs": float,
    "avg_gross_margin_pct": float,
    "flagged_items": [
      {{
        "item": str, "current_margin_pct": float, "target_margin_pct": float,
        "monthly_impact": float, "root_cause": str,
        "recommended_action": "reprice|renegotiate|substitute|remove|stock_up",
        "financial_impact": float, "urgency": "critical|high|medium|low",
        "requires_ceo_approval": bool
      }}
    ],
    "cost_creep_alerts": [
      {{"item": str, "supplier": str, "increase_3mo_pct": float, "increase_6mo_pct": float, "projected_next_month": float, "action": str}}
    ],
    "waste_analysis": {{"total_monthly_waste_cost": float, "worst_item": str, "savings_opportunity": float}},
    "delivery_margin_reality": {{"true_margin_after_fees": float, "platform_fee_drain_monthly": float, "recommendation": str}} if '{cluster}' == 'A' else {{}},
    "supplier_concentration_risk": {{"top_supplier_pct": float, "risk_level": str, "alternative_suppliers": [str]}},
    "total_monthly_savings_opportunity": float
  }},
  "employee_intelligence": {{
    "total_labor_cost": float,
    "labor_efficiency_score": 0-100,
    "labor_cost_pct_revenue": float,
    "individual_flags": [
      {{
        "name": str, "role": str, "flag": str, "financial_impact": float,
        "recommended_action": str, "urgency": "critical|high|medium|low"
      }}
    ],
    "scheduling_opportunities": [{{"shift": str, "current_cost": float, "optimized_cost": float, "savings": float}}],
    "overtime_exposure": float,
    "performance_outliers": [{{"name": str, "metric": str, "vs_team_avg": str}}]
  }},
  "strategic_recommendations": {{
    "immediate": [
      {{"action": str, "owner": str, "deadline_days": int, "financial_impact": float, "requires_ceo_approval": bool}}
    ],
    "this_quarter": [
      {{"action": str, "owner": str, "deadline_days": int, "financial_impact": float}}
    ],
    "this_year": [
      {{"action": str, "rationale": str, "financial_impact": float}}
    ]
  }},
  "escalations": {{
    "ceo": {{
      "name": "Owner/CEO",
      "urgency": "critical|high|medium|low",
      "decisions_required": [
        {{"decision": str, "context": str, "financial_impact": float, "deadline": str, "options": [str]}}
      ],
      "strategic_flags": [str],
      "total_financial_exposure": float
    }},
    "individuals": [
      {{
        "name": str,
        "role": str,
        "urgency": "critical|high|medium|low",
        "flags": [str],
        "actions": [str],
        "financial_impact": float,
        "message": "direct message to send this person"
      }}
    ]
  }},
  "market_intelligence": {{
    "competitive_threats": [{{"threat": str, "impact": "high|medium|low", "response": str}}],
    "supplier_opportunities": [{{"supplier": str, "opportunity": str, "savings_pct": float}}],
    "regulatory_alerts": [{{"regulation": str, "deadline": str, "action": str, "cost_to_comply": float}}],
    "market_trends": [{{"trend": str, "impact": str, "timeframe": str}}]
  }},
  "unit_economics": {{
    "assessment": str,
    "ltv_cac_ratio": float,
    "gross_margin_pct": float,
    "key_insight": str,
    "improvement_actions": [str]
  }} if '{cluster}' == 'B' else {{}},
  "porter_five_forces": {{
    "competitive_rivalry": "high|medium|low",
    "supplier_power": "high|medium|low",
    "buyer_power": "high|medium|low",
    "threat_new_entrants": "high|medium|low",
    "threat_substitutes": "high|medium|low",
    "strategic_implication": str
  }},
  "risk_assessment": {{
    "overall_score": 0-100,
    "critical_risks": [{{"risk": str, "likelihood": str, "impact": str, "mitigation": str, "cost_if_ignored": float}}],
    "supplier_concentration_pct": float,
    "runway_months": float if '{cluster}' == 'B' else None
  }},
  "capital_allocation": [
    {{"investment": str, "rationale": str, "expected_roi_pct": float, "priority": int, "timeframe": str}}
  ],
  "voice_crossref": {{
    "review_to_cost_connections": [{{"review_signal": str, "cost_signal": str, "combined_insight": str, "action": str}}],
    "demand_forecast_adjustments": [{{"event": str, "inventory_action": str, "staffing_action": str}}]
  }},
  "summary": {{
    "total_monthly_savings_opportunity": float,
    "total_risk_exposure": float,
    "priority_action": str,
    "estimated_time_to_impact": str,
    "confidence_score": 0.0-1.0
  }},
  "flag": bool,
  "financial_impact": float,
  "requires_approval": true
}}"""

    try:
        response = claude.messages.create(
            model="claude-opus-4-5",
            max_tokens=8000,
            system=system,
            messages=[{"role": "user", "content": context}]
        )
        raw = response.content[0].text.strip()
        if "```" in raw: raw = raw.split("```json")[-1].split("```")[0].strip()
        return json.loads(raw)
    except Exception as e:
        print(f"  [SHELF ANALYSIS] Error: {e}")
        return {
            "executive_summary": {"business_health_score": 70, "primary_opportunity": "Run with real data for full analysis", "data_confidence": "low"},
            "flag": False, "financial_impact": 0, "requires_approval": False,
            "summary": {"priority_action": "Connect data sources for full analysis", "confidence_score": 0.3}
        }

# ── TEMPORAL CONTEXT ──────────────────────────────────────────────────────────

def get_temporal() -> dict:
    now = datetime.now()
    return {
        "current_datetime": now.strftime("%Y-%m-%d %H:%M"),
        "day_of_week":      now.strftime("%A"),
        "month":            now.strftime("%B"),
        "season":           "spring" if now.month in [3,4,5] else "summer" if now.month in [6,7,8] else "fall" if now.month in [9,10,11] else "winter",
        "quarter":          (now.month - 1) // 3 + 1,
        "days_to_weekend":  (5 - now.weekday()) % 7,
    }

# ── MAIN ENTRY POINT ──────────────────────────────────────────────────────────


# ── PDF REPORT GENERATION (integrated) ────────────────────────────────────────
try:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        HRFlowable, PageBreak
    )
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
    _REPORTLAB_AVAILABLE = True
except ImportError:
    _REPORTLAB_AVAILABLE = False

if _REPORTLAB_AVAILABLE:
    # ── COLOR PALETTE ─────────────────────────────────────────────────────────────
    BLACK      = colors.HexColor("#111111")
    DARK_GRAY  = colors.HexColor("#333333")
    MID_GRAY   = colors.HexColor("#666666")
    LIGHT_GRAY = colors.HexColor("#F5F5F5")
    BORDER     = colors.HexColor("#DDDDDD")
    GREEN      = colors.HexColor("#1A7A4A")
    GREEN_LIGHT= colors.HexColor("#E8F5EE")
    RED        = colors.HexColor("#C0392B")
    RED_LIGHT  = colors.HexColor("#FDECEA")
    AMBER      = colors.HexColor("#D4820A")
    AMBER_LIGHT= colors.HexColor("#FEF6E4")
    BLUE       = colors.HexColor("#1A5276")
    BLUE_LIGHT = colors.HexColor("#EAF2FB")

    def get_styles():
        base = getSampleStyleSheet()
        styles = {
            "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=22, textColor=BLACK, spaceAfter=4, leading=26),
            "subtitle": ParagraphStyle("subtitle", fontName="Helvetica", fontSize=11, textColor=MID_GRAY, spaceAfter=16, leading=14),
            "section": ParagraphStyle("section", fontName="Helvetica-Bold", fontSize=13, textColor=BLACK, spaceBefore=18, spaceAfter=6, leading=16),
            "body": ParagraphStyle("body", fontName="Helvetica", fontSize=10, textColor=DARK_GRAY, spaceAfter=6, leading=14),
            "small": ParagraphStyle("small", fontName="Helvetica", fontSize=9, textColor=MID_GRAY, spaceAfter=4, leading=12),
            "bold": ParagraphStyle("bold", fontName="Helvetica-Bold", fontSize=10, textColor=BLACK, spaceAfter=4, leading=14),
            "flag": ParagraphStyle("flag", fontName="Helvetica", fontSize=9, textColor=RED, spaceAfter=3, leading=12),
            "praise": ParagraphStyle("praise", fontName="Helvetica", fontSize=9, textColor=GREEN, spaceAfter=3, leading=12),
            "action": ParagraphStyle("action", fontName="Helvetica-Oblique", fontSize=9, textColor=AMBER, spaceAfter=3, leading=12),
            "center": ParagraphStyle("center", fontName="Helvetica", fontSize=10, textColor=DARK_GRAY, alignment=TA_CENTER, leading=14),
            "score_big": ParagraphStyle("score_big", fontName="Helvetica-Bold", fontSize=36, textColor=BLACK, alignment=TA_CENTER, leading=40),
        }
        return styles

    def score_color(score):
        if score >= 80: return GREEN
        if score >= 60: return AMBER
        return RED

    def score_label(score):
        if score >= 80: return "Strong Performer"
        if score >= 60: return "Needs Support"
        return "At Risk"

    def urgency_color(urgency):
        if urgency == "critical": return RED
        if urgency == "high": return AMBER
        return GREEN

    def divider():
        return HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=10, spaceBefore=4)

    def stat_table(stats: list) -> Table:
        """stats = [("Label", "Value"), ...]"""
        data = [[Paragraph(k, ParagraphStyle("sk", fontName="Helvetica", fontSize=9, textColor=MID_GRAY)),
                 Paragraph(str(v), ParagraphStyle("sv", fontName="Helvetica-Bold", fontSize=10, textColor=BLACK))]
                for k, v in stats]
        t = Table(data, colWidths=[2.2*inch, 2.2*inch])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,-1), LIGHT_GRAY),
            ("ROWBACKGROUNDS", (0,0), (-1,-1), [LIGHT_GRAY, colors.white]),
            ("TOPPADDING", (0,0), (-1,-1), 6),
            ("BOTTOMPADDING", (0,0), (-1,-1), 6),
            ("LEFTPADDING", (0,0), (-1,-1), 10),
            ("RIGHTPADDING", (0,0), (-1,-1), 10),
            ("GRID", (0,0), (-1,-1), 0.3, BORDER),
            ("ROUNDEDCORNERS", [4]),
        ]))
        return t

    # ── EMPLOYEE REPORT ───────────────────────────────────────────────────────────

    def generate_employee_report(emp: dict, shelf_result: dict, output_path: str):
        doc = SimpleDocTemplate(
            output_path, pagesize=letter,
            leftMargin=0.75*inch, rightMargin=0.75*inch,
            topMargin=0.75*inch, bottomMargin=0.75*inch
        )
        s = get_styles()
        story = []
        name    = emp.get("name", "Employee")
        role    = emp.get("role", "")
        score   = emp.get("performance_score", 0)
        shift   = emp.get("shift", "")
        flags   = emp.get("flags", [])
        actions = emp.get("actions", [])
        praise  = emp.get("praise", [])
        urgency = emp.get("urgency", "none")
        biz     = shelf_result.get("business_name", "")
        ts      = shelf_result.get("timestamp", datetime.now().isoformat())[:10]
        eotw    = shelf_result.get("employee_intelligence", {}).get("employee_of_the_week", {})
        is_eotw = eotw.get("name") == name

        # ── HEADER ──
        story.append(Paragraph(f"SAGE Employee Report", ParagraphStyle("h", fontName="Helvetica", fontSize=10, textColor=MID_GRAY, spaceAfter=2)))
        story.append(Paragraph(name, s["title"]))
        story.append(Paragraph(f"{role}{' · ' + shift + ' shift' if shift else ''} · {biz}", s["subtitle"]))
        story.append(divider())

        # ── SCORE CARD ──
        sc = score_color(score)
        score_data = [[
            Paragraph(str(score), ParagraphStyle("sc", fontName="Helvetica-Bold", fontSize=42, textColor=sc, alignment=TA_CENTER, leading=46)),
            Paragraph(score_label(score), ParagraphStyle("sl", fontName="Helvetica-Bold", fontSize=13, textColor=sc, alignment=TA_CENTER, leading=16)),
        ]]
        score_tbl = Table(score_data, colWidths=[1.5*inch, 3*inch])
        score_tbl.setStyle(TableStyle([
            ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
            ("ALIGN", (0,0), (-1,-1), "CENTER"),
            ("BACKGROUND", (0,0), (-1,-1), LIGHT_GRAY),
            ("ROUNDEDCORNERS", [6]),
            ("TOPPADDING", (0,0), (-1,-1), 12),
            ("BOTTOMPADDING", (0,0), (-1,-1), 12),
            ("LEFTPADDING", (0,0), (-1,-1), 16),
        ]))
        story.append(score_tbl)
        story.append(Spacer(1, 12))

        # ── EMPLOYEE OF THE WEEK BADGE ──
        if is_eotw:
            badge_data = [[Paragraph("EMPLOYEE OF THE WEEK", ParagraphStyle("b", fontName="Helvetica-Bold", fontSize=11, textColor=colors.white, alignment=TA_CENTER))]]
            badge_tbl = Table(badge_data, colWidths=[6.5*inch])
            badge_tbl.setStyle(TableStyle([
                ("BACKGROUND", (0,0), (-1,-1), GREEN),
                ("TOPPADDING", (0,0), (-1,-1), 8),
                ("BOTTOMPADDING", (0,0), (-1,-1), 8),
                ("ROUNDEDCORNERS", [4]),
            ]))
            story.append(badge_tbl)
            story.append(Paragraph(f"Recommended reward: {eotw.get('recommended_reward','')}", s["small"]))
            story.append(Spacer(1, 8))

        # ── KEY STATS ──
        monthly_cost = emp.get("monthly_cost", 0)
        rate         = emp.get("hourly_rate", 0)
        hours        = emp.get("hours_per_week", 0)
        role_type    = emp.get("role_type", "")

        stats = [
            ("Monthly Cost", f"${monthly_cost:,.0f}"),
            ("Hourly Rate", f"${rate:.2f}/hr"),
            ("Hours/Week", f"{hours} hrs"),
            ("Role Type", role_type.title()),
        ]
        # role-specific metrics
        if emp.get("commits_7d") is not None:
            stats.append(("Commits This Week", str(emp["commits_7d"])))
        if emp.get("quota_pct") is not None:
            stats.append(("Quota Attainment", f"{emp['quota_pct']}%"))
        if emp.get("win_rate") is not None:
            stats.append(("Win Rate", f"{emp['win_rate']}%"))
        if emp.get("waste_rate") is not None:
            stats.append(("Waste Rate", f"{emp['waste_rate']}%"))
        if emp.get("order_accuracy") is not None:
            stats.append(("Order Accuracy", f"{emp['order_accuracy']}%"))

        # pair stats into rows of 2
        paired = []
        for i in range(0, len(stats), 2):
            row = stats[i:i+2]
            if len(row) == 1: row.append(("",""))
            paired.append(row)

        for pair in paired:
            row_data = []
            for label, val in pair:
                cell = [
                    Paragraph(label, ParagraphStyle("sl", fontName="Helvetica", fontSize=8, textColor=MID_GRAY)),
                    Paragraph(val, ParagraphStyle("sv", fontName="Helvetica-Bold", fontSize=11, textColor=BLACK)),
                ]
                row_data.append(cell)
            t = Table([row_data], colWidths=[3.25*inch, 3.25*inch])
            t.setStyle(TableStyle([
                ("BACKGROUND", (0,0), (-1,-1), LIGHT_GRAY),
                ("TOPPADDING", (0,0), (-1,-1), 8),
                ("BOTTOMPADDING", (0,0), (-1,-1), 8),
                ("LEFTPADDING", (0,0), (-1,-1), 12),
                ("GRID", (0,0), (-1,-1), 0.3, BORDER),
            ]))
            story.append(t)
            story.append(Spacer(1, 4))

        # ── FLAGS ──
        if flags:
            story.append(Spacer(1, 8))
            story.append(Paragraph("Issues Flagged", s["section"]))
            story.append(divider())
            urgency_bg = RED_LIGHT if urgency in ["critical","high"] else AMBER_LIGHT
            for flag in flags:
                flag_data = [[Paragraph(f"! {flag}", ParagraphStyle("f", fontName="Helvetica", fontSize=9, textColor=RED))]]
                ft = Table(flag_data, colWidths=[6.5*inch])
                ft.setStyle(TableStyle([
                    ("BACKGROUND", (0,0), (-1,-1), urgency_bg),
                    ("TOPPADDING", (0,0), (-1,-1), 6),
                    ("BOTTOMPADDING", (0,0), (-1,-1), 6),
                    ("LEFTPADDING", (0,0), (-1,-1), 10),
                    ("ROUNDEDCORNERS", [3]),
                ]))
                story.append(ft)
                story.append(Spacer(1, 3))

        # ── ACTIONS ──
        if actions:
            story.append(Spacer(1, 8))
            story.append(Paragraph("Required Actions", s["section"]))
            story.append(divider())
            for i, action in enumerate(actions):
                act_data = [[Paragraph(f"{i+1}. {action}", ParagraphStyle("a", fontName="Helvetica", fontSize=9, textColor=AMBER))]]
                at = Table(act_data, colWidths=[6.5*inch])
                at.setStyle(TableStyle([
                    ("BACKGROUND", (0,0), (-1,-1), AMBER_LIGHT),
                    ("TOPPADDING", (0,0), (-1,-1), 6),
                    ("BOTTOMPADDING", (0,0), (-1,-1), 6),
                    ("LEFTPADDING", (0,0), (-1,-1), 10),
                    ("ROUNDEDCORNERS", [3]),
                ]))
                story.append(at)
                story.append(Spacer(1, 3))

        # ── PRAISE ──
        if praise:
            story.append(Spacer(1, 8))
            story.append(Paragraph("Strengths", s["section"]))
            story.append(divider())
            for p in praise:
                pd_data = [[Paragraph(f"+ {p}", ParagraphStyle("p", fontName="Helvetica", fontSize=9, textColor=GREEN))]]
                pt = Table(pd_data, colWidths=[6.5*inch])
                pt.setStyle(TableStyle([
                    ("BACKGROUND", (0,0), (-1,-1), GREEN_LIGHT),
                    ("TOPPADDING", (0,0), (-1,-1), 6),
                    ("BOTTOMPADDING", (0,0), (-1,-1), 6),
                    ("LEFTPADDING", (0,0), (-1,-1), 10),
                    ("ROUNDEDCORNERS", [3]),
                ]))
                story.append(pt)
                story.append(Spacer(1, 3))

        # ── NOTES ──
        notes = emp.get("performance_notes", "")
        if notes:
            story.append(Spacer(1, 8))
            story.append(Paragraph("Manager Notes", s["section"]))
            story.append(divider())
            story.append(Paragraph(notes, s["body"]))

        # ── FOOTER ──
        story.append(Spacer(1, 20))
        story.append(divider())
        story.append(Paragraph(f"Generated by SAGE · {ts} · Confidential", s["small"]))

        doc.build(story)
        print(f"  Generated: {output_path}")

    # ── CEO REPORT ────────────────────────────────────────────────────────────────

    def generate_ceo_report(shelf_result: dict, output_path: str):
        doc = SimpleDocTemplate(
            output_path, pagesize=letter,
            leftMargin=0.75*inch, rightMargin=0.75*inch,
            topMargin=0.75*inch, bottomMargin=0.75*inch
        )
        s    = get_styles()
        story = []
        biz  = shelf_result.get("business_name", "Business")
        ts   = shelf_result.get("timestamp", datetime.now().isoformat())[:10]
        summ = shelf_result.get("executive_summary", {})
        cost = shelf_result.get("cost_intelligence", {})
        emp  = shelf_result.get("employee_intelligence", {})
        esc  = shelf_result.get("escalations", {})
        risk = shelf_result.get("risk_assessment", {})
        strat = shelf_result.get("strategic_recommendations", {})
        mkt  = shelf_result.get("market_intelligence", {})
        unit = shelf_result.get("unit_economics", {})

        # ── HEADER ──
        story.append(Paragraph("SAGE Strategic Intelligence Brief", ParagraphStyle("h", fontName="Helvetica", fontSize=10, textColor=MID_GRAY, spaceAfter=2)))
        story.append(Paragraph(biz, s["title"]))
        story.append(Paragraph(f"CEO Report · {ts} · Confidential", s["subtitle"]))
        story.append(divider())

        # ── HEALTH SCORE + KEY METRICS ──
        health = summ.get("business_health_score", 0)
        hc     = score_color(health)
        opp    = shelf_result.get("summary", {}).get("total_monthly_savings_opportunity", 0)
        risk_v = shelf_result.get("summary", {}).get("total_risk_exposure", 0)
        fin    = shelf_result.get("financial_impact", 0)

        metrics_data = [
            [
                Paragraph("Business Health", ParagraphStyle("m", fontName="Helvetica", fontSize=8, textColor=MID_GRAY, alignment=TA_CENTER)),
                Paragraph("Monthly Savings Opp.", ParagraphStyle("m", fontName="Helvetica", fontSize=8, textColor=MID_GRAY, alignment=TA_CENTER)),
                Paragraph("Risk Exposure", ParagraphStyle("m", fontName="Helvetica", fontSize=8, textColor=MID_GRAY, alignment=TA_CENTER)),
            ],
            [
                Paragraph(f"{health}/100", ParagraphStyle("mv", fontName="Helvetica-Bold", fontSize=20, textColor=hc, alignment=TA_CENTER)),
                Paragraph(f"${opp:,.0f}/mo", ParagraphStyle("mv", fontName="Helvetica-Bold", fontSize=20, textColor=GREEN, alignment=TA_CENTER)),
                Paragraph(f"${risk_v:,.0f}/mo", ParagraphStyle("mv", fontName="Helvetica-Bold", fontSize=20, textColor=RED, alignment=TA_CENTER)),
            ]
        ]
        mt = Table(metrics_data, colWidths=[2.17*inch, 2.17*inch, 2.16*inch])
        mt.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,-1), LIGHT_GRAY),
            ("GRID", (0,0), (-1,-1), 0.3, BORDER),
            ("TOPPADDING", (0,0), (-1,-1), 10),
            ("BOTTOMPADDING", (0,0), (-1,-1), 10),
            ("ALIGN", (0,0), (-1,-1), "CENTER"),
            ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ]))
        story.append(mt)
        story.append(Spacer(1, 12))

        # ── ONE LINE RECOMMENDATION ──
        rec = summ.get("one_sentence_recommendation", "")
        if rec:
            rec_data = [[Paragraph(f"Priority: {rec}", ParagraphStyle("r", fontName="Helvetica-Bold", fontSize=10, textColor=BLUE))]]
            rt = Table(rec_data, colWidths=[6.5*inch])
            rt.setStyle(TableStyle([
                ("BACKGROUND", (0,0), (-1,-1), BLUE_LIGHT),
                ("TOPPADDING", (0,0), (-1,-1), 10),
                ("BOTTOMPADDING", (0,0), (-1,-1), 10),
                ("LEFTPADDING", (0,0), (-1,-1), 12),
                ("ROUNDEDCORNERS", [4]),
            ]))
            story.append(rt)
            story.append(Spacer(1, 12))

        # ── CEO DECISIONS REQUIRED ──
        ceo_esc = esc.get("ceo", {})
        decisions = ceo_esc.get("decisions_required", [])
        if decisions:
            story.append(Paragraph("Decisions Required From You", s["section"]))
            story.append(divider())
            for d in decisions:
                impact = d.get("financial_impact", 0)
                dl     = d.get("deadline", "")
                decision_data = [
                    [Paragraph(d.get("decision",""), ParagraphStyle("dd", fontName="Helvetica-Bold", fontSize=10, textColor=BLACK)),
                     Paragraph(f"${impact:,.0f} impact · {dl}", ParagraphStyle("di", fontName="Helvetica", fontSize=9, textColor=MID_GRAY, alignment=TA_RIGHT))],
                    [Paragraph(d.get("context",""), ParagraphStyle("dc", fontName="Helvetica", fontSize=9, textColor=DARK_GRAY, spaceAfter=4)),""],
                ]
                dt = Table(decision_data, colWidths=[4.5*inch, 2*inch])
                dt.setStyle(TableStyle([
                    ("BACKGROUND", (0,0), (-1,-1), RED_LIGHT),
                    ("SPAN", (0,1), (1,1)),
                    ("TOPPADDING", (0,0), (-1,-1), 8),
                    ("BOTTOMPADDING", (0,0), (-1,-1), 8),
                    ("LEFTPADDING", (0,0), (-1,-1), 10),
                    ("RIGHTPADDING", (0,0), (-1,-1), 10),
                    ("ROUNDEDCORNERS", [4]),
                ]))
                story.append(dt)
                story.append(Spacer(1, 4))
                opts = d.get("options", [])
                if opts:
                    story.append(Paragraph("Options: " + " | ".join(opts), s["small"]))

        # ── EMPLOYEE LEADERBOARD ──
        leaderboard = emp.get("leaderboard", [])
        eotw        = emp.get("employee_of_the_week", {})
        if leaderboard:
            story.append(Paragraph("Employee Performance Leaderboard", s["section"]))
            story.append(divider())
            if eotw and eotw.get("name"):
                story.append(Paragraph(f"Employee of the Week: {eotw['name']} ({eotw['role']}) — Score {eotw['score']}/100", s["bold"]))
                story.append(Paragraph(f"Reason: {eotw.get('reason','')} · Reward: {eotw.get('recommended_reward','')}", s["small"]))
                story.append(Spacer(1, 8))

            lb_header = [
                Paragraph("Rank", ParagraphStyle("lh", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white, alignment=TA_CENTER)),
                Paragraph("Name", ParagraphStyle("lh", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white)),
                Paragraph("Role", ParagraphStyle("lh", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white)),
                Paragraph("Score", ParagraphStyle("lh", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white, alignment=TA_CENTER)),
                Paragraph("Status", ParagraphStyle("lh", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white, alignment=TA_CENTER)),
            ]
            lb_rows = [lb_header]
            for e in leaderboard:
                sc     = e.get("score", 0)
                status = e.get("status", "solid")
                sc_col = score_color(sc)
                lb_rows.append([
                    Paragraph(str(e.get("rank","")), ParagraphStyle("lr", fontName="Helvetica", fontSize=9, textColor=MID_GRAY, alignment=TA_CENTER)),
                    Paragraph(e.get("name",""), ParagraphStyle("lr", fontName="Helvetica-Bold", fontSize=9, textColor=BLACK)),
                    Paragraph(e.get("role",""), ParagraphStyle("lr", fontName="Helvetica", fontSize=9, textColor=DARK_GRAY)),
                    Paragraph(str(sc), ParagraphStyle("lr", fontName="Helvetica-Bold", fontSize=9, textColor=sc_col, alignment=TA_CENTER)),
                    Paragraph(status.replace("_"," ").title(), ParagraphStyle("lr", fontName="Helvetica", fontSize=9, textColor=sc_col, alignment=TA_CENTER)),
                ])
            lb_t = Table(lb_rows, colWidths=[0.6*inch, 1.8*inch, 2*inch, 0.8*inch, 1.3*inch])
            lb_t.setStyle(TableStyle([
                ("BACKGROUND", (0,0), (-1,0), BLUE),
                ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, LIGHT_GRAY]),
                ("GRID", (0,0), (-1,-1), 0.3, BORDER),
                ("TOPPADDING", (0,0), (-1,-1), 7),
                ("BOTTOMPADDING", (0,0), (-1,-1), 7),
                ("LEFTPADDING", (0,0), (-1,-1), 8),
                ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
            ]))
            story.append(lb_t)

        # ── COST FLAGS ──
        flagged_items = cost.get("flagged_items", [])
        if flagged_items:
            story.append(Paragraph("Cost Intelligence — Flagged Items", s["section"]))
            story.append(divider())
            ci_header = [
                Paragraph("Item", ParagraphStyle("ch", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white)),
                Paragraph("Margin", ParagraphStyle("ch", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white, alignment=TA_CENTER)),
                Paragraph("Impact/mo", ParagraphStyle("ch", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white, alignment=TA_CENTER)),
                Paragraph("Action", ParagraphStyle("ch", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white)),
                Paragraph("Urgency", ParagraphStyle("ch", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white, alignment=TA_CENTER)),
            ]
            ci_rows = [ci_header]
            for item in flagged_items[:8]:
                urg    = item.get("urgency", "medium")
                urg_c  = urgency_color(urg)
                impact = item.get("financial_impact", item.get("monthly_impact", 0))
                ci_rows.append([
                    Paragraph(item.get("item",""), ParagraphStyle("cr", fontName="Helvetica", fontSize=8, textColor=BLACK)),
                    Paragraph(f"{item.get('current_margin_pct',0):.1f}%", ParagraphStyle("cr", fontName="Helvetica-Bold", fontSize=8, textColor=score_color(item.get('current_margin_pct',0)), alignment=TA_CENTER)),
                    Paragraph(f"${abs(impact):,.0f}", ParagraphStyle("cr", fontName="Helvetica-Bold", fontSize=8, textColor=RED, alignment=TA_CENTER)),
                    Paragraph(item.get("recommended_action","")[:50], ParagraphStyle("cr", fontName="Helvetica", fontSize=8, textColor=DARK_GRAY)),
                    Paragraph(urg.title(), ParagraphStyle("cr", fontName="Helvetica-Bold", fontSize=8, textColor=urg_c, alignment=TA_CENTER)),
                ])
            ci_t = Table(ci_rows, colWidths=[1.5*inch, 0.8*inch, 0.9*inch, 2.3*inch, 0.8*inch])
            ci_t.setStyle(TableStyle([
                ("BACKGROUND", (0,0), (-1,0), DARK_GRAY),
                ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, LIGHT_GRAY]),
                ("GRID", (0,0), (-1,-1), 0.3, BORDER),
                ("TOPPADDING", (0,0), (-1,-1), 6),
                ("BOTTOMPADDING", (0,0), (-1,-1), 6),
                ("LEFTPADDING", (0,0), (-1,-1), 6),
                ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
            ]))
            story.append(ci_t)

        # ── IMMEDIATE ACTIONS ──
        immediate = strat.get("immediate", [])
        if immediate:
            story.append(Paragraph("Immediate Actions (Next 7 Days)", s["section"]))
            story.append(divider())
            for i, action in enumerate(immediate[:5]):
                impact = action.get("financial_impact", 0)
                owner  = action.get("owner", "")
                days   = action.get("deadline_days", 0)
                needs_ceo = action.get("requires_ceo_approval", False)
                act_data = [[
                    Paragraph(f"{i+1}. {action.get('action','')}", ParagraphStyle("ia", fontName="Helvetica-Bold", fontSize=9, textColor=BLACK)),
                    Paragraph(f"${impact:,.0f} · {owner} · {days}d{'  APPROVAL REQ.' if needs_ceo else ''}", ParagraphStyle("im", fontName="Helvetica", fontSize=8, textColor=MID_GRAY, alignment=TA_RIGHT)),
                ]]
                at = Table(act_data, colWidths=[4.5*inch, 2*inch])
                at.setStyle(TableStyle([
                    ("BACKGROUND", (0,0), (-1,-1), AMBER_LIGHT if needs_ceo else LIGHT_GRAY),
                    ("TOPPADDING", (0,0), (-1,-1), 7),
                    ("BOTTOMPADDING", (0,0), (-1,-1), 7),
                    ("LEFTPADDING", (0,0), (-1,-1), 10),
                    ("RIGHTPADDING", (0,0), (-1,-1), 8),
                    ("ROUNDEDCORNERS", [3]),
                ]))
                story.append(at)
                story.append(Spacer(1, 3))

        # ── RISK SUMMARY ──
        critical_risks = risk.get("critical_risks", [])
        if critical_risks:
            story.append(Paragraph("Critical Risks", s["section"]))
            story.append(divider())
            for r in critical_risks[:4]:
                cost_if = r.get("cost_if_ignored", 0)
                rd = [[
                    Paragraph(r.get("risk",""), ParagraphStyle("rr", fontName="Helvetica-Bold", fontSize=9, textColor=RED)),
                    Paragraph(f"${cost_if:,.0f} if ignored", ParagraphStyle("rc", fontName="Helvetica", fontSize=8, textColor=MID_GRAY, alignment=TA_RIGHT)),
                ],[
                    Paragraph(f"Mitigation: {r.get('mitigation','')}", ParagraphStyle("rm", fontName="Helvetica-Oblique", fontSize=8, textColor=DARK_GRAY)), "",
                ]]
                rt = Table(rd, colWidths=[4.5*inch, 2*inch])
                rt.setStyle(TableStyle([
                    ("BACKGROUND", (0,0), (-1,-1), RED_LIGHT),
                    ("SPAN", (0,1), (1,1)),
                    ("TOPPADDING", (0,0), (-1,-1), 6),
                    ("BOTTOMPADDING", (0,0), (-1,-1), 6),
                    ("LEFTPADDING", (0,0), (-1,-1), 10),
                    ("RIGHTPADDING", (0,0), (-1,-1), 8),
                    ("ROUNDEDCORNERS", [3]),
                ]))
                story.append(rt)
                story.append(Spacer(1, 3))

        # ── MARKET INTELLIGENCE ──
        threats = mkt.get("competitive_threats", [])
        if threats:
            story.append(Paragraph("Market Intelligence", s["section"]))
            story.append(divider())
            for t in threats[:3]:
                story.append(Paragraph(f"· {t.get('threat','')} — {t.get('response','')}", s["body"]))

        # ── UNIT ECONOMICS (Cluster B) ──
        if unit and unit.get("ltv_cac_ratio"):
            story.append(Paragraph("Unit Economics", s["section"]))
            story.append(divider())
            ue_stats = [
                ("LTV:CAC Ratio", str(unit.get("ltv_cac_ratio",""))),
                ("Gross Margin", f"{unit.get('gross_margin_pct',0):.1f}%"),
                ("Assessment", unit.get("assessment","").title()),
                ("Key Insight", unit.get("key_insight","")[:60]),
            ]
            story.append(stat_table(ue_stats))

        # ── FOOTER ──
        story.append(Spacer(1, 20))
        story.append(divider())
        story.append(Paragraph(f"SAGE Strategic Intelligence · {ts} · CEO Eyes Only · Confidential", s["small"]))

        doc.build(story)
        print(f"  Generated: {output_path}")

    # ── MAIN GENERATOR ────────────────────────────────────────────────────────────

    def generate_all_reports(shelf_result: dict, output_dir: str = "sage/reports") -> list:
        """
        Generate individual employee PDFs + CEO report from SHELF output.
        Returns list of generated file paths.
        """
        os.makedirs(output_dir, exist_ok=True)
        biz   = shelf_result.get("business_name", "business").replace(" ", "_").lower()
        ts    = shelf_result.get("timestamp", datetime.now().isoformat())[:10]
        files = []

        emp_intel = shelf_result.get("employee_intelligence", {})
        employees = emp_intel.get("employees", [])

        print(f"\nGenerating PDF reports for {shelf_result.get('business_name','')}")
        print(f"Output directory: {output_dir}")

        # individual employee reports
        for emp in employees:
            name     = emp.get("name", "employee").replace(" ", "_").lower()
            filename = f"{output_dir}/{biz}_employee_{name}_{ts}.pdf"
            generate_employee_report(emp, shelf_result, filename)
            files.append(filename)

        # CEO report
        ceo_filename = f"{output_dir}/{biz}_ceo_report_{ts}.pdf"
        generate_ceo_report(shelf_result, ceo_filename)
        files.append(ceo_filename)

        print(f"\nAll {len(files)} reports generated.")
        return files

else:
    def generate_all_reports(shelf_result, output_dir="sage/reports"):
        import os; os.makedirs(output_dir, exist_ok=True)
        print("  [REPORTS] reportlab not installed — run: pip install reportlab")
        return []

def _generate_employee_feedback(shelf_result: dict) -> dict:
    """
    Generate structured feedback and warnings per employee.
    Feeds into FRANK for delivery via WhatsApp/email/briefing.
    """
    emp_intel  = shelf_result.get("employee_intelligence", {})
    employees  = emp_intel.get("employees", [])
    eotw       = emp_intel.get("employee_of_the_week", {})
    biz        = shelf_result.get("business_name", "")
    cluster    = shelf_result.get("cluster", "A")

    warnings      = []   # flags that need action
    recognitions  = []   # praise worth calling out
    summaries     = []   # per-employee one-liner for FRANK briefing

    for emp in employees:
        name    = emp.get("name", "Unknown")
        role    = emp.get("role", "")
        score   = emp.get("performance_score", 0)
        flags   = emp.get("flags", [])
        actions = emp.get("actions", [])
        praise  = emp.get("praise", [])
        urgency = emp.get("urgency", "none")
        monthly = emp.get("monthly_cost", 0)

        # warnings
        for i, flag in enumerate(flags):
            action = actions[i] if i < len(actions) else "Review with manager"
            warnings.append({
                "employee":       name,
                "role":           role,
                "urgency":        urgency,
                "flag":           flag,
                "action":         action,
                "financial_impact": _estimate_flag_impact(flag, monthly),
                "message_to_employee": _compose_employee_message(name, role, flag, action, cluster),
                "message_to_ceo":      f"{name} ({role}): {flag} — Action: {action}"
            })

        # recognitions
        for p in praise:
            recognitions.append({
                "employee": name,
                "role":     role,
                "praise":   p,
                "score":    score,
                "is_eotw":  eotw.get("name") == name,
                "message_to_employee": f"Hi {name}, great work this week! {p} Keep it up.",
            })

        # one-liner summary
        if flags:
            summaries.append(f"{name}: {flags[0][:60]}{'...' if len(flags[0]) > 60 else ''} (score: {score})")
        elif praise:
            summaries.append(f"{name}: {praise[0][:60]} (score: {score})")
        else:
            summaries.append(f"{name}: Solid performance (score: {score})")

    # sort warnings by urgency
    urgency_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "none": 4}
    warnings.sort(key=lambda x: urgency_order.get(x["urgency"], 4))

    return {
        "warnings":           warnings,
        "recognitions":       recognitions,
        "employee_summaries": summaries,
        "critical_count":     sum(1 for w in warnings if w["urgency"] == "critical"),
        "high_count":         sum(1 for w in warnings if w["urgency"] == "high"),
        "total_financial_exposure": sum(w.get("financial_impact", 0) for w in warnings),
        "frank_briefing_line": f"{len(warnings)} employee flags ({sum(1 for w in warnings if w['urgency'] in ['critical','high'])} high priority) · {len(recognitions)} recognitions · Employee of Week: {eotw.get('name','TBD')}"
    }

def _estimate_flag_impact(flag: str, monthly_cost: float) -> float:
    """Rough financial impact estimate per flag type"""
    flag = flag.lower()
    if "overtime" in flag:           return monthly_cost * 0.15
    if "void" in flag:               return monthly_cost * 0.05
    if "complaint" in flag:          return 500
    if "late delivery" in flag:      return 300
    if "stalled" in flag:            return 2000
    if "missed deadline" in flag:    return 1500
    if "understaffed" in flag:       return 1200
    if "single point of failure" in flag: return 2500
    return 200

def _compose_employee_message(name: str, role: str, flag: str, action: str, cluster: str) -> str:
    """Compose a direct, respectful message to the employee"""
    if cluster == "B":
        return f"Hi {name}, heads up: {flag}. Please: {action}. Let's discuss in our next 1:1."
    else:
        return f"Hi {name}, we noticed: {flag}. Please: {action}. Check with your manager if you have questions."

def _generate_reports(shelf_result: dict, output_dir: str = "sage/reports") -> list:
    """
    Generate PDF reports from SHELF output.
    Imports generate_reports module if available, otherwise skips.
    """
    import importlib.util, os
    os.makedirs(output_dir, exist_ok=True)

    # try to import from sage/utils/generate_reports.py
    paths_to_try = [
        "sage/utils/generate_reports.py",
        "sage/generate_reports.py",
        os.path.join(os.path.dirname(__file__), "generate_reports.py"),
    ]
    module = None
    for path in paths_to_try:
        if os.path.exists(path):
            spec   = importlib.util.spec_from_file_location("generate_reports", path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            break

    if module and hasattr(module, "generate_all_reports"):
        return module.generate_all_reports(shelf_result, output_dir=output_dir)

    # fallback — generate simple text summary files if no PDF module
    files = []
    emp_intel = shelf_result.get("employee_intelligence", {})
    biz = shelf_result.get("business_name", "business").replace(" ", "_").lower()
    ts  = shelf_result.get("timestamp", "")[:10]
    for emp in emp_intel.get("employees", []):
        name = emp.get("name", "emp").replace(" ", "_").lower()
        path = f"{output_dir}/{biz}_employee_{name}_{ts}.txt"
        with open(path, "w") as f:
            f.write(f"Employee Report: {emp.get('name','')} ({emp.get('role','')})\n")
            f.write(f"Score: {emp.get('performance_score', 0)}/100\n")
            f.write(f"Flags: {emp.get('flags', [])}\n")
            f.write(f"Actions: {emp.get('actions', [])}\n")
            f.write(f"Praise: {emp.get('praise', [])}\n")
        files.append(path)
    return files


def run_shelf(
    business_name:       str,
    business_type:       str  = None,
    location:            str  = "",
    voice_output:        dict = None,
    custom_dataset_path: str  = None,
    dataset:             dict = None,
    text:                str  = None,
    repo:                str  = None,
    employees:           list = None,
) -> dict:
    """
    Universal SHELF agent — works for any business at any scale.

    Args:
        business_name:       Name of the business
        business_type:       Optional type hint (auto-classified if not provided)
        location:            City/State for weather and local market data
        voice_output:        Full VOICE agent output dict
        custom_dataset_path: Path to any file — JSON, CSV, PDF, Excel, TXT
        dataset:             Raw dict dataset
        text:                Plain text description — "my gyro costs $6.20/lb..."
        repo:                GitHub repo "owner/repo" (Cluster B)
        employees:           List of employee dicts
    """

    print(f"\n{'='*60}")
    print(f"SHELF — {business_name}")
    print(f"{'='*60}")

    temporal = get_temporal()

    # Step 1 — Classify
    print("\n[1] Classifying business...")
    classification = classify_business(business_name, business_type)
    cluster = classification["cluster"]
    btype   = classification["type"]
    print(f"    Cluster {cluster} | Type: {btype} | Confidence: {classification['confidence']}")

    # Step 2 — Wave
    print("\n[2] Fetching Wave accounting data...")
    wave_data = get_wave_data(business_name)
    print(f"    Products: {len(wave_data.get('products',[]))} | Invoices: {len(wave_data.get('invoices',[]))} | Bills: {len(wave_data.get('bills',[]))}")

    # Step 3 — Stripe
    print("\n[3] Fetching Stripe revenue data...")
    stripe_data = get_stripe_data()
    if stripe_data.get("available"):
        print(f"    MRR: ${stripe_data.get('mrr',0):,.0f} | Churn: {stripe_data.get('churn_rate_pct',0)}%")
    else:
        print("    Stripe not connected")

    # Step 4 — GitHub (Cluster B)
    github_data = {"available": False}
    if cluster == "B" and repo:
        print("\n[4] Fetching GitHub metrics...")
        github_data = get_github_data(repo)
        print(f"    Commits 7d: {github_data.get('commits_7d',0)} | Open PRs: {github_data.get('open_prs',0)} | Velocity: {github_data.get('velocity','N/A')}")

    # Step 5 — FDA (Pharmacy)
    fda_data = {}
    if btype == "pharmacy":
        print("\n[5] Fetching FDA drug shortage data...")
        fda_data = get_fda_data()
        print(f"    Active shortages: {fda_data.get('count', len(fda_data.get('shortages',[])))}")

    # Step 6 — Weather
    print("\n[6] Fetching weather forecast...")
    weather = get_weather(location)
    if weather.get("available"):
        print(f"    Today: {weather['today']['condition']}, {weather['today']['temp_f']}°F")

    # Step 7 — Dataset / text input
    print("\n[7] Loading and normalizing dataset...")
    normalized_data = load_and_normalize_dataset(
        path=custom_dataset_path,
        raw=dataset,
        text=text
    )
    if normalized_data:
        print(f"    Revenue: ${normalized_data.get('monthly_revenue',0):,.0f}/mo | Employees: {normalized_data.get('employee_count',0)}")

    # Step 8 — Exa market intelligence
    print("\n[8] Gathering market intelligence...")
    market_intel = get_market_intelligence(business_name, btype, location, cluster)
    print(f"    Sources fetched: {len(market_intel)}")

    # Step 9 — VOICE integration
    print("\n[9] Integrating VOICE signals...")
    voice_signals = integrate_voice(voice_output or {}, cluster)
    if voice_signals:
        print(f"    Signals: {list(voice_signals.keys())}")

    # Step 10 — Calculate margins
    print("\n[10] Calculating item-level margins...")
    cost_data   = normalized_data.get("cost_of_goods", [])
    waste_data  = normalized_data.get("waste_data", [])
    del_fees    = normalized_data.get("delivery_fees", {})
    margins     = calculate_margins(cost_data, waste_data, del_fees) if cost_data else []
    print(f"    Items analyzed: {len(margins)} | Flagged: {sum(1 for m in margins if m['flag'])}")

    # Step 11 — Employee analysis
    print("\n[11] Analyzing employee performance...")
    emp_list   = employees or normalized_data.get("employees", [])
    revenue_mo = normalized_data.get("monthly_revenue") or stripe_data.get("net_revenue") or 50000
    emp_analysis = analyze_employees(emp_list, revenue_mo, cluster, voice_signals, github_data)
    print(f"    Employees: {len(emp_analysis.get('employees',[]))} | Flagged: {emp_analysis.get('flagged_count',0)} | Labor: {emp_analysis.get('labor_pct_revenue',0)}% of revenue")

    # Step 12 — Unit economics (Cluster B)
    unit_econ = {}
    if cluster == "B":
        print("\n[12] Calculating unit economics...")
        stripe_enriched = {**normalized_data, **stripe_data} if stripe_data.get("available") else normalized_data
        unit_econ = calculate_unit_economics(stripe_enriched)
        print(f"    LTV:CAC: {unit_econ.get('ltv_cac_ratio',0)} | Health: {unit_econ.get('health','unknown')}")

    # Step 13 — Strategic analysis
    print("\n[13] Running strategic analysis...")
    result = strategic_analysis(
        business_name=business_name, cluster=cluster, btype=btype,
        wave_data=wave_data, stripe_data=stripe_data, github_data=github_data,
        fda_data=fda_data, weather=weather, market_intel=market_intel,
        voice_signals=voice_signals, normalized_data=normalized_data,
        margins=margins, employee_analysis=emp_analysis,
        unit_economics=unit_econ, temporal=temporal
    )

    # Step 14 — Add metadata + FRANK schema fields
    result.update({
        "agent":           "SHELF",
        "cluster":         cluster,
        "business_type":   btype,
        "business_name":   business_name,
        "location":        location,
        "timestamp":       datetime.now().isoformat(),
        "temporal":        temporal,
        "employee_intelligence": emp_analysis,
        "data_sources": {
            "wave":         wave_data.get("found", False),
            "stripe":       stripe_data.get("available", False),
            "github":       github_data.get("available", False),
            "fda":          bool(fda_data.get("shortages")),
            "weather":      weather.get("available", False),
            "exa":          bool(market_intel),
            "voice":        bool(voice_signals),
            "custom_data":  bool(normalized_data),
        },
        # FRANK-facing top-level fields
        "flag":             result.get("flag", len(margins) > 0 and any(m["flag"] for m in margins)),
        "financial_impact": result.get("financial_impact", result.get("summary", {}).get("total_monthly_savings_opportunity", 0)),
        "requires_approval": True,
        "recommended_action": result.get("summary", {}).get("priority_action", ""),
    })

    print(f"\n{'='*60}")
    print(f"Analysis Complete")
    opp  = result.get('summary', {}).get('total_monthly_savings_opportunity', 0)
    risk = result.get('summary', {}).get('total_risk_exposure', 0)
    print(f"Savings Opportunity: ${opp:,.0f}/mo")
    print(f"Risk Exposure: ${risk:,.0f}/mo")
    print(f"Priority: {result.get('summary', {}).get('priority_action', 'N/A')}")
    print(f"{'='*60}")

    # ── STEP 15 — Generate feedback warnings per employee ──────────────────
    print("\n[15] Generating employee feedback and warnings...")
    feedback = _generate_employee_feedback(result)
    result["employee_feedback"] = feedback
    print(f"    Warnings: {len(feedback.get('warnings', []))} | Recognitions: {len(feedback.get('recognitions', []))}")

    # ── STEP 16 — Generate PDF reports ─────────────────────────────────────
    print("\n[16] Generating PDF reports...")
    try:
        report_files = _generate_reports(result, output_dir="sage/reports")
        result["report_files"] = report_files
        print(f"    Generated: {len(report_files)} reports")
    except Exception as e:
        print(f"    [REPORTS] Error: {e} — skipping PDF generation")
        result["report_files"] = []

    return result


if __name__ == "__main__":
    import sys
    business = sys.argv[1] if len(sys.argv) > 1 else "Marathon Deli"
    btype    = sys.argv[2] if len(sys.argv) > 2 else "restaurant"
    location = sys.argv[3] if len(sys.argv) > 3 else "College Park, MD"
    repo     = sys.argv[4] if len(sys.argv) > 4 else None

    result = run_shelf(
        business_name=business,
        business_type=btype,
        location=location,
        repo=repo,
    )
    print(json.dumps(result, indent=2))