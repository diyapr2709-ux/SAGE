# SAGE Research Context Document
**For use with Claude Chat — Research Paper, Novelty, Baseline Comparisons**

---

## 1. SYSTEM OVERVIEW

**Full name:** SAGE — Small Business Autonomous Growth Engine
**Problem domain:** Adaptive decision support for small business operators
**Core claim:** A multi-agent AI system that learns owner preferences from implicit feedback, fuses cross-agent signals via Bayesian corroboration, and closes the loop via delayed outcome measurement — all in a single lightweight, real-time pipeline.

**One-line pitch:**  
SAGE converts raw business telemetry (revenue streams, customer reviews, cost data, staffing templates) into personalized, ranked, conflict-resolved action recommendations that get smarter with every owner interaction.

---

## 2. SYSTEM ARCHITECTURE

### 2.1 Pipeline

```
INPUT SIGNALS
  ├── Revenue time-series (90-day rolling, hourly)
  ├── Customer reviews (Exa.ai search → Claude 3.5 Opus extraction)
  ├── Cost/supplier data (Wave API, custom invoice upload)
  ├── Employee metrics (role-specific KPI scoring)
  └── Shift templates (7-day weekly schedule preferences)
          ↓
FRANK ORCHESTRATOR (LangGraph DAG)
  ├── Node 1: PULSE — MSTL revenue forecasting + anomaly detection
  ├── Node 2: VOICE — Review sentiment + market intelligence
  ├── Node 3: SHELF — Cost intelligence + employee analysis
  ├── Node 4: CREW — Shift staffing optimization
  ├── Node 5: collect_recommendations() — extraction + categorization
  ├── Node 6: resolve_conflicts() — Bayesian fusion + merge rules
  ├── Node 7: apply_approval_threshold() — IRL-learned financial gate
  ├── Node 8: rank_recommendations() — Thompson sample + IRL score
  ├── Node 9: route_employee_alerts() — per-person coaching messages
  └── Node 10: format_whatsapp_briefing() — CEO morning digest
          ↓
OUTPUT
  ├── Ranked recommendations (urgency × impact)
  ├── Auto-approved vs. requires-approval split
  ├── Employee-facing alerts
  └── WhatsApp/SMS CEO briefing (140-char lines)
          ↓
FEEDBACK LOOP (Online Learning)
  ├── Owner approve/reject/edit → FeedbackEvent
  ├── IRL model recompute (category weights, threshold, drift)
  ├── Bandit arm update (Beta posterior α/β)
  ├── Approved → outcome record (measure_after +60 min)
  └── Next refresh → outcome eval → delayed reward (α ±)
```

### 2.2 Infrastructure
- **Backend:** FastAPI + SQLAlchemy + SQLite (`sage.db`)
- **Frontend:** React + Vite (port 5173) + Recharts + Framer Motion
- **Orchestration:** LangGraph (DAG, not a chat agent loop)
- **Scheduling:** APScheduler (30-minute auto-refresh cycle)
- **LLM calls:** Claude 3.5 Opus (review extraction, synthesis)
- **Forecasting:** StatsForecast (MSTL model)
- **Search:** Exa.ai (real-time review + competitor intelligence)

---

## 3. AGENTS — TECHNICAL DETAIL

### 3.1 PULSE — Revenue Forecasting Agent
**File:** `sage/agents/pulse.py` (~219 lines)

**Algorithm:** MSTL (Multiple Seasonal-Trend decomposition using LOESS)  
**Input:** 90-day rolling hourly revenue time-series + business config (open hours, peak hours, weekday multipliers)

**Outputs:**
- 72-hour revenue forecast
- Anomaly detection: triggers if deviation > 10% from expected
- Rush hour prediction: top 3 revenue windows (2-hour blocks)
- Daily/weekly goal tracking (target vs. projected vs. actual)

**Financial impact formula:**  
`impact = deviation_pct × sum(72hr_forecast)`

**Recommendation types extracted:**
- `revenue_anomaly` — forecast deviation alert
- `rush_hours_*` — preparation signal for upcoming peak
- `daily_gap` — shortfall vs. daily target

---

### 3.2 VOICE — Reputation & Market Intelligence Agent
**File:** `sage/agents/voice.py`

**Data pipeline:**
1. Exa.ai search for reviews, competitor data, market trends
2. OpenWeatherMap for foot-traffic weather impact
3. Claude 3.5 Opus for extraction and synthesis
4. Temporal context injection (day-of-week, season, time-of-day)
5. Promo history lookup (last week's recommendations + ROI)

**Cluster A (Consumer/Restaurant):**
- Google/Yelp/TripAdvisor sentiment + rating trends
- Competitor pricing alerts
- Temporal demand alerts (events, holidays, weather)
- Health/compliance risk detection (keyword flagging in reviews)
- Menu item profitability recommendations
- Review response priority queue
- Demand multipliers from event calendar

**Cluster B (Professional/SaaS):**
- Strategic competitive threat alerts
- Policy/regulatory deadline alerts
- Market revenue/pricing signals

**Cross-reference tagging:** Each VOICE output is tagged with keys like `daniel_near_miss`, `gyro_price_hold` — enabling Bayesian fusion to match VOICE signals with SHELF and CREW signals on the same underlying issue.

---

### 3.3 SHELF — Cost Intelligence & Employee Analysis Agent
**File:** `sage/agents/shelf.py` (~700+ lines)

**Data priority hierarchy:**  
`API connectors (Wave/GitHub/Stripe) > Custom Dataset > Exa Intelligence > Business Name only`

**Cost Intelligence Pipeline:**
- Monthly cost tracking + supplier invoice parsing
- Margin risk flagging: `gross margin < 20%` → flagged item
- Cost creep detection: 3-month trend analysis per item
- VOICE correlation: pricing vs. cost alignment check
- ROI computation for strategic action recommendations

**Employee Intelligence (Role-Aware Scoring):**

| Role | KPIs Used |
|---|---|
| Engineers | Commits/week velocity, PR staleness, bug ownership |
| Sales | Quota attainment, win rate, churn, deal velocity |
| Kitchen | Waste %, order accuracy, cross-ref food-quality reviews |
| Drivers | Late delivery %, accuracy, review matching |
| Frontline | Void rate, wait-time complaints, service mentions |
| Managers | Overtime (burnout risk), team complaint volume, coverage gaps |

**Outputs:**
- Flagged cost items with `financial_impact` field
- Employee flags with recommended actions
- Health/compliance risks
- Labor % of revenue + cost creep alerts

---

### 3.4 CREW — Staffing Optimization Agent
**File:** `sage/agents/crew_stub.py`

**Algorithm:** Template-based shift matching with under/overstaffing detection

**Input:** 7-day shift templates (Mon–Sun, 09:00–23:00 windows), employee availability preferences, role-based scheduling defaults

**Outputs:**
- Per-shift `staffing_status`: `balanced | understaffed | overstaffed`
- Recommended adjustment (e.g., "Add 1 cashier for late rush")
- Financial impact (labor cost delta)
- Ranked by highest-impact non-balanced shift

---

## 4. LEARNING MECHANISMS — CORE NOVELTY

### 4.1 Thompson Sampling Bandit
**File:** `sage/preferences/bandit.py` (213 lines)

**Arms:** `(category, agent, urgency)` tuples — one arm per recommendation type

**Posterior Updates:**
| Owner Action | Alpha Update | Beta Update |
|---|---|---|
| Approve | +1.0 | — |
| Reject | — | +1.0 |
| Edit | +0.5 | +0.5 |
| Outcome confirmed (delayed) | +1.5 | — |
| Outcome missed (delayed) | — | +1.0 |

**Sampling:** `θ ~ Beta(α, β)` at ranking time  
- Low n → wide Beta → high variance → exploration  
- High n → tight Beta → exploitation of known-good arms

**Ranking Score (hybrid):**
```
rank_score = 0.70 × thompson_sample + 0.30 × impact_norm
```

**Key design choices:**
- Delayed outcome signals (α +1.5) are weighted *heavier* than immediate approval (+1.0) — incentivizes recommendations that actually move business metrics, not just ones the owner clicked approve on
- Edit signals are split (α +0.5, β +0.5) — neutral partial credit, acknowledges signal ambiguity

**Persistence:** `sage/data/bandit_state.json` — 7 arms, 14 total pulls in demo

---

### 4.2 Bayesian Multi-Agent Corroboration Fusion
**File:** `sage/preferences/fusion.py` (199 lines)

**Goal:** Compound confidence when independent agents signal the same underlying business issue

**Posterior formula:**
```
P(issue | e₁, e₂, …, eₖ) ∝ P(e₁|issue) · P(e₂|issue) · … · P(eₖ|issue) · P(issue)
```
where each `P(eᵢ|issue)` is the learned reliability prior for agent `i`.

**Signal Groups (cross-reference tags):**

| Tag | Agents Involved | Issue |
|---|---|---|
| `daniel_near_miss` | VOICE (2 cooler reviews) + SHELF (health flag) + CREW (Daniel on shift) | Health compliance risk |
| `thu_understaffing` | VOICE (wait time mention) + CREW (understaffed) + PULSE (Thu peak) | Revenue-staffing mismatch |
| `gyro_price_hold` | VOICE (Chipotle comparison) + SHELF (margin flag) | Pricing-cost alignment |
| `overtime_labor` | SHELF (overtime hours) + CREW (supervisor hours) | Labor burnout risk |

**Agent Reliability Priors:**

| Agent | Prior | Basis |
|---|---|---|
| SHELF | 0.80 | Structured data, high precision |
| CREW | 0.75 | Template-based, deterministic |
| PULSE | 0.72 | Statistical model, well-calibrated |
| FRANK | 0.70 | Orchestrator-level signals |
| VOICE | 0.68 | LLM + unstructured data, higher noise |

**Reliability blending:** `30% learned (approval rate) + 70% prior` until ≥15 feedback events → then transitions to data-driven

**Urgency Upgrade Rules:**
- 2-agent corroboration (score > 0.65): `medium → high`
- 3-agent corroboration (score > 0.85): `high → critical`

---

### 4.3 Inverse Reinforcement Learning — Owner Preference Model
**File:** `sage/preferences/owner_model.py` (384 lines)

**Input:** Stream of owner feedback events (approve/reject/edit) + recommendation metadata (category, agent, urgency, financial impact, time-of-day)

**Model Components:**

| Component | How Computed | Role |
|---|---|---|
| `category_weights[7]` | Approval rate per category | Risk tolerance per domain |
| `agent_weights[5]` | Approval rate per agent | Trust calibration |
| `action_threshold` | Impact level where approval rate ≥ 50% | Financial gate |
| `temporal_weights[7]` | Day-of-week approval rates | Time-aware urgency |
| `approval_rate_30d/7d` | Rolling window | Trend monitoring |
| `drift_detected` | >20pp 30d→7d drop | Behavior change detection |
| `confidence_multiplier` | Shrinks score toward 0.5 on drift | Exploration under uncertainty |

**Ranking formula (when ≥3 decisions available):**
```
score = 0.30 × category_weight
      + 0.25 × agent_weight
      + 0.25 × impact_sigmoid
      + 0.20 × urgency_score
```

**On drift detection:**
```
score = 0.5 + (score − 0.5) × confidence_multiplier
```
This pulls scores toward 0.5 — maximum uncertainty — forcing re-exploration when the owner's behavior changes substantially.

**Cold start:** If fewer than 3 decisions, uses uniform priors (all weights = 1.0, threshold = $200 default). IRL model activates gradually as data accumulates.

---

### 4.4 Delayed Reward / Outcome Loop
**File:** `sage/preferences/outcome_tracker.py` (260 lines)

**The problem this solves:** Immediate approval signals are noisy — an owner may approve a recommendation but it produces no measurable improvement. The outcome loop distinguishes *acted-on recommendations that worked* from *acted-on recommendations that didn't*.

**Workflow:**
1. Owner approves → `record_approved_outcome()` infers outcome type + records baseline metric
2. `measure_after = +60 minutes` (= 2 auto-refresh cycles)
3. Next refresh: `evaluate_pending_outcomes()` reads new metric values vs. baseline
4. Threshold for confirmation: **>3% change in the target metric**
5. Confirmed → `α += 1.5` to bandit arm (delayed reward)
6. Not confirmed → `β += 1.0` (delayed penalty)

**Measurable Outcome Types:**

| Outcome Type | Metric Observed | Trigger |
|---|---|---|
| `cost_reduction` | Flagged item monthly cost | SHELF cost flag approved |
| `staffing_fix` | Shift `staffing_status` → "balanced" | CREW understaffed approved |
| `review_response` | Average rating stability | VOICE review-response approved |
| `revenue_recovery` | `deviation_pct` decrease | PULSE anomaly approved |
| `compliance_fix` | Compliance alert count drop | SHELF/VOICE health flag approved |

**Demo data:** 4 outcomes tracked — 2 confirmed (`cost_reduction`, `staffing_fix`), 2 missed. Confirmation rate = 0.50.

---

## 5. CONFLICT RESOLUTION & RECOMMENDATION DEDUPLICATION

**File:** `sage/orchestrator/frank.py` (844 lines)

**Conflict merge rules:**

| Condition | Result | Type |
|---|---|---|
| PULSE revenue anomaly + CREW understaffed (same time window) | Merged | `composite|revenue_staffing_mismatch` |
| VOICE pricing alert + SHELF cost creep (same item) | Merged | `composite|pricing_cost_overlap` |
| SHELF employee flag + VOICE review (same person) | Merged | `composite|employee_review_overlap` |
| Same action from multiple agents (different source) | Deduplicated | Keep highest impact |

**Personalized urgency dampening:** Uses `owner_model.category_weights` to avoid over-escalating categories where the owner rarely acts — if `category_weight < 0.3`, urgency is one level lower than raw corroboration score suggests.

---

## 6. EVALUATION METRICS

**All metrics available via FastAPI `/run/preferences` endpoint:**

### Bandit Performance
- Per-arm: `alpha, beta, mean, uncertainty (σ = √(αβ / (α+β)²(α+β+1))), n_observations`
- System-wide: `total_pulls`, last updated timestamp

### IRL Model Quality
- `total_decisions` (feedback events)
- `approval_rate_30d`, `approval_rate_7d`
- `action_threshold` (learned financial gate)
- `drift_detected` (boolean)
- `category_weights`, `agent_weights` (per-dimension breakdown)

### Outcome Tracking
- `total_tracked`, `measured`, `confirmed`, `missed`
- `confirmation_rate` = confirmed / measured
- Per-outcome: action description, outcome type, confirmed boolean

### Fusion Statistics
- Total recommendations vs. corroborated recommendations
- Count of urgency upgrades triggered by corroboration
- Top-5 high-confidence recommendations (by fusion score)

---

## 7. NOVELTY — WHAT IS NEW

### 7.1 Primary Novelty: Closed-Loop Delayed Reward for Recommendation Systems

**The gap:** Most recommendation systems use immediate implicit feedback (click, approve, reject) as the reward signal. SAGE uses *measured downstream business outcomes* as a second, delayed reward signal that re-enters the bandit update.

- Immediate approval → `α += 1.0`
- Delayed outcome confirmation → additional `α += 1.5`
- This means a recommendation that gets approved but doesn't move a metric eventually has net `α +1.0, β +1.0` (neutral), while one that gets approved AND confirmed has `α +2.5` (strongly preferred)

This is distinct from standard bandit literature, which does not include a measurement/verification phase after reward assignment.

### 7.2 Bayesian Multi-Source Corroboration Fusion

**The gap:** Most multi-agent systems either take a majority vote or average agent scores. SAGE uses a full Bayesian posterior update where each agent's signal is weighted by its *learned reliability prior*, which itself is updated from feedback.

The reliability prior blending formula:
```
effective_reliability = 0.70 × structural_prior + 0.30 × learned_approval_rate
```
transitions to `1.0 × learned` once enough data exists. This is a form of *meta-learning*: the system learns how much to trust each information source.

### 7.3 Composite Urgency Encoding (Corroboration Premiums)

When corroboration score crosses thresholds, urgency is *discretely upgraded* rather than scaled continuously. This is a deliberate UX design choice: business owners interpret urgency categorically ("critical" vs. "medium"), not as a real-valued confidence score. The system bridges the gap between probabilistic inference and categorical human decision-making.

### 7.4 IRL with Drift Detection

Standard IRL assumes a stationary owner preference distribution. SAGE adds explicit drift detection (>20pp rolling approval rate drop) and responds with `confidence_multiplier < 1.0`, pulling all ranking scores toward 0.5 — the maximum entropy state. This effectively triggers re-exploration when the inferred preference model may be stale.

### 7.5 Role-Aware Employee KPI Scoring for Operational Recommendations

Employee performance scoring in SHELF is stratified by role — with domain-specific metrics (e.g., waste % for kitchen staff, commit velocity for engineers). This differs from generic HR analytics: the goal is to generate *actionable recommendation text* ("add a cook Thursday 10PM") rather than a performance score.

---

## 8. BASELINE COMPARISONS FOR PAPER

### 8.1 Static Rule-Based Systems
**Examples:** Lightspeed Insights, Toast Analytics, Square Dashboard  
**Comparison:**
- Rule-based systems apply fixed thresholds (e.g., "flag if labor > 30%")
- SAGE learns per-owner thresholds from IRL feedback
- Rule-based systems don't account for inter-agent signal correlation — they show the same alert regardless of whether 1 or 3 agents signal the same issue
- No personalization over time

**SAGE advantage:** Personalized, adaptive, corroborated recommendations vs. static threshold alerts

### 8.2 Standard Thompson Sampling (No Delayed Reward)
**Baseline:** Thompson Sampling with only immediate feedback (approve/reject)  
**SAGE difference:** Outcome loop adds a second, delayed update signal  
**Expected benefit:** Recommendations that are approved but don't produce measurable results are penalized over time → system learns the difference between *plausible* and *effective* recommendations

### 8.3 Majority Vote / Score Averaging (No Bayesian Fusion)
**Baseline:** Multi-agent systems that average confidence scores or take majority vote across agents  
**SAGE difference:** Bayesian posterior update weighted by learned reliability priors  
**Expected benefit:** VOICE (highest noise) contributes less than SHELF (structured data) when evidence is weak; when VOICE corroborates SHELF, the combined posterior is amplified appropriately

### 8.4 Fixed Owner Preference Model (No IRL / No Drift Detection)
**Baseline:** Systems that use a static ranking function (e.g., rank purely by financial impact)  
**SAGE difference:** IRL model adapts category weights, financial threshold, temporal weights from feedback  
**Expected benefit:** Lower recommendation fatigue, higher approval rates after warm-up period

### 8.5 Single-Agent Systems
**Examples:** Klaviyo (marketing), Wave (financials), 7shifts (scheduling)  
**Comparison:**
- Each single-agent system optimizes within its domain
- No cross-domain signal fusion (e.g., no system connects "review mentions long waits" with "Thursday understaffed on schedule")
- SAGE's composite recommendation type `revenue_staffing_mismatch` is fundamentally impossible for single-agent tools

**SAGE advantage:** Cross-domain composite recommendations grounded in multi-agent corroboration

### 8.6 LLM Chat / ReAct Agent (No Structured Learning)
**Examples:** GPT-4 with tool use, Claude with business tools  
**Comparison:**
- LLM agents can reason about business questions but don't maintain persistent preference models
- Each session is stateless — no memory of owner approval patterns
- No bandit exploration/exploitation strategy
- No measurable outcome verification

**SAGE advantage:** Persistent, stateful, learning-from-feedback system vs. stateless LLM reasoning

### 8.7 Classic Recommendation Systems (Collaborative Filtering / Matrix Factorization)
**Examples:** Netflix-style CF, SVD, BPR  
**Comparison:**
- CF requires many users for meaningful collaborative signal — SAGE targets a single owner
- CF learns from engagement signals (clicks); SAGE learns from domain-specific outcomes (revenue recovery, cost reduction confirmation)
- CF has no concept of "urgency" or "financial impact" — it maximizes engagement, not business outcomes

**SAGE advantage:** Single-owner, outcome-grounded, business-metric-aware learning

---

## 9. RELATED WORK POSITIONING

### Bandit Literature
- Standard contextual bandits (LinUCB, Thompson Sampling): SAGE extends by adding a delayed, measurement-verified second reward signal
- Cascaded bandits: SAGE has a cascaded structure (bandit × IRL × fusion) but is not a pure cascade
- Relevant papers: Agrawal & Goyal (2012) Thompson Sampling; Russo & Van Roy (2014) Learning to Optimize via Info-Theoretic Regret

### Multi-Agent Systems
- SAGE uses LangGraph as the orchestration layer — not a peer-to-peer agent negotiation system
- Agent conflict resolution is done centrally by FRANK, not by agent-to-agent negotiation
- Relevant: Wooldridge (2009) Introduction to MAS; recent work on LLM agent orchestration (AutoGen, CrewAI)

### IRL / Preference Learning
- SAGE's IRL is a lightweight, behavioral-cloning-inspired preference model, not a full IRL solver (no reward function optimization loop)
- Closest: RLHF (Christiano et al. 2017) and RLAIF — but SAGE doesn't train an LLM; it trains a ranking model
- Drift detection angle: related to concept drift in online learning literature (Gama et al. 2014)

### Business AI / Decision Support
- Most business AI papers focus on forecasting accuracy (MSTL, N-BEATS, etc.)
- SAGE contribution is in the decision-support layer *above* forecasting — how to rank, fuse, and personalize forecasting-derived recommendations
- Closest: "Intelligent Decision Support Systems" literature, but applied to SMB with real-time learning

---

## 10. OPTIMIZATION OBJECTIVE (FORMAL)

**SAGE's overall optimization target:**

Maximize expected owner value:
```
E[V] = Σᵢ Σₜ approval(i,t) × outcome_confirmed(i,t) × financial_impact(i)
```

Where:
- `i` = recommendation index
- `t` = time step
- `approval(i,t)` = owner approves recommendation `i` at time `t`
- `outcome_confirmed(i,t)` = measurable business metric moves in expected direction
- `financial_impact(i)` = estimated $ impact of recommendation

**Subject to:**
- Recommendation fatigue constraint: max K recommendations per briefing (K = 5 default)
- Approval threshold: `financial_impact(i) > threshold(t)` for auto-approval
- Urgency budget: no more than 1 `critical` recommendation unless corroboration score > 0.85

**Sub-objectives:**

| Component | Objective | Algorithm |
|---|---|---|
| Bandit | Minimize cumulative regret over arm pulls | Thompson Sampling |
| IRL | Minimize prediction error on owner approval | Behavioral cloning with rolling window |
| Fusion | Maximize posterior accuracy given agent signals | Bayesian product of likelihoods |
| Outcome | Close loop between approval and impact | Delayed reward with measurement threshold |

---

## 11. KEY FILE LOCATIONS

```
/Users/diyap/Desktop/SAGE/
├── sage/
│   ├── orchestrator/frank.py          # FRANK DAG (844 lines)
│   ├── agents/
│   │   ├── pulse.py                   # MSTL forecasting (219 lines)
│   │   ├── voice.py                   # Review/market agent
│   │   ├── shelf.py                   # Cost/employee agent (700+ lines)
│   │   └── crew_stub.py               # Staffing optimizer
│   └── preferences/
│       ├── bandit.py                  # Thompson Sampling (213 lines)
│       ├── fusion.py                  # Bayesian fusion (199 lines)
│       ├── owner_model.py             # IRL model (384 lines)
│       └── outcome_tracker.py        # Delayed reward loop (260 lines)
├── backend/
│   └── app/
│       ├── main.py                    # FastAPI + 30min scheduler (65 lines)
│       └── agents/router.py          # API endpoints (257 lines)
└── sage/data/
    ├── active_dataset.json            # Business config + employee data
    ├── active_llm_dataset.json        # Pre-computed VOICE + SHELF outputs
    ├── bandit_state.json              # 7 arms, 14 total pulls
    ├── owner_feedback.json            # IRL training events
    ├── owner_preference_model.json    # Computed IRL model
    ├── pending_outcomes.json          # 4 outcomes: 2 confirmed, 2 missed
    └── promo_history.json             # Last week's recs + ROI
```

---

## 12. DEMO BUSINESS CONTEXT

**Business:** Marathon Deli (fictitious, used for demo)  
**Type:** Restaurant / consumer food service  
**Data clusters:** Cluster A (Consumer Business)  
**Employees:** Kitchen staff, drivers, frontline, manager  
**Key active issues in demo data:**
- `daniel_near_miss`: Cooler compliance risk (3-agent corroboration)
- `thu_understaffing`: Thursday understaffed peak window (3-agent)
- `gyro_price_hold`: Gyro pricing vs. Chipotle competitive threat + margin flag (2-agent)
- `overtime_labor`: Manager overtime burnout risk (2-agent)

**Refresh cycle:** Every 30 minutes (background APScheduler job)  
**Default approval threshold:** $200 (learned from owner behavior over time)

---

## 13. CLAIMS TO VALIDATE IN PAPER

1. **Multi-agent corroboration increases recommendation acceptance rate** — testable by comparing corroborated vs. non-corroborated recommendation approval rates
2. **Delayed outcome reward improves long-run outcome confirmation rate** — testable by comparing bandit with/without delayed signal after sufficient pulls
3. **IRL model reduces recommendation fatigue** — testable by comparing total recommendations shown vs. approved over time (should improve ratio)
4. **Drift detection prevents preference model lock-in** — testable by simulating sudden owner behavior change and measuring recovery speed
5. **Cross-domain composite recommendations have higher financial impact** — testable by comparing composite vs. single-source recommendation financial impact

---

*Generated from codebase as of 2026-05-04. Key source files: frank.py (844 lines), bandit.py (213 lines), fusion.py (199 lines), owner_model.py (384 lines), outcome_tracker.py (260 lines).*
