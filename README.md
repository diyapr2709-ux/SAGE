# SAGE — Small Business Autonomous Growth Engine

A multi-agent AI system that gives small businesses the operational intelligence infrastructure previously only available to enterprises. SAGE runs five specialized agents in parallel, fuses their outputs through Bayesian cross-agent corroboration, learns your preferences over time, and delivers a ranked morning briefing via WhatsApp.

> Built at the University of Maryland, College Park.

---

## The Problem

SMBs collectively generate over $6 trillion in annual U.S. revenue yet operate with a fragmented toolchain — POS, accounting software, review aggregators, and scheduling apps that don't talk to each other. The business owner becomes the sole integration layer, manually synthesizing signals while running operations. This creates a systematic delay between a problem emerging and the owner becoming aware of it. SAGE closes that loop.

---

## Architecture

Five agents run in parallel and publish typed signal objects to a shared message bus (Redis pub/sub). FRANK subscribes to all channels, detects conflicts, resolves them using a priority order learned from the owner's behavior, and assembles a ranked briefing.

```
PULSE  ──► ForecastSignal, AnomalyAlert
VOICE  ──► SentimentUpdate, ReviewAlert
CREW   ──► SchedulingSignal               ──► FRANK ──► Ranked Briefing ──► WhatsApp
SHELF  ──► CostFlag, MarginAlert
           (all subscribe to each other's signals as needed)
```

---

## Agents

### PULSE — Revenue Forecasting
Integrates with Square and Shopify to ingest transaction data on a 4-hour polling cycle. Runs Prophet-based time-series forecasting augmented with exogenous regressors: OpenWeatherMap conditions, Eventbrite event calendars, and day-of-week seasonality. Detects anomalies via z-score on rolling residuals (>10% deviation triggers a cross-agent alert). Outputs a probabilistic 72-hour demand forecast with confidence intervals.

### VOICE — Reputation & Market Intelligence
Polls Google My Business and Yelp Fusion every two hours for new reviews. Builds a tone profile from the owner's historical responses using cosine similarity over sentence embeddings, then uses Claude to draft replies matched to that tone. Maintains a 30-day rolling VADER sentiment model and correlates sentiment trajectory with PULSE revenue data to surface operationally relevant insights.

For **Cluster B** businesses (SaaS, agencies, law firms): analyzes meeting transcripts, GitHub activity, Jira velocity, policy changes, and competitor funding signals instead.

### CREW — Workforce Scheduling
Ingests the PULSE 72-hour demand forecast and compares it against current staff schedules from Google Calendar. Evaluates labor cost as a proportion of forecasted revenue at the shift level — not as a headcount heuristic. Formulates scheduling adjustments as a constrained optimization problem minimizing the labor cost-to-revenue ratio subject to minimum coverage constraints. Distributes approved changes to staff via WhatsApp Business API with delivery and read-receipt tracking; non-responses escalate after a configurable timeout (default: 2 hours).

### SHELF — Cost & Margin Intelligence
Connects to QuickBooks and Wave for structured financial data and processes supplier invoices directly from Gmail using Claude for unstructured extraction. Constructs a time-indexed cost matrix per product and ingredient, computing real-time gross margin at the SKU level. Detects supplier price drift via EWMA over per-unit cost time series, flagging deviations exceeding 8% over 60 days. Each flag includes a specific recommended action and projected margin impact.

### FRANK — Orchestrator
The coordination layer. Implements a conflict resolution protocol that detects contradictory recommendations across agents and resolves them using a priority ordering calibrated to the owner's demonstrated preferences. Aggregates agent outputs into a ranked morning briefing ordered by a composite score of estimated financial impact and predicted owner approval likelihood. Maintains a full audit log of all autonomous actions with structured reasoning traces.

---

## Three-Layer Optimization

### 1. Agent-Level Online Learning
Each agent evaluates its own recommendations against observed outcomes and updates its internal model continuously.

- **PULSE** compares predicted vs. actual revenue weekly, segmenting by day-of-week, weather bin, and local event category. Exogenous regressor weights are updated via gradient steps on MAPE.
- **VOICE** tracks approval behavior at the response level — approved as-is, approved with edits, rejected — and updates a logistic regression preference model over response features (sentiment polarity, length, formality, star rating) via SGD.
- **CREW** decomposes scheduling prediction error by shift type and PULSE forecast confidence. Coverage thresholds update via a bandit rule: understaffed shifts loosen the minimum floor; uneventful coverage reductions tighten it.
- **SHELF** escalates faster when previously ignored cost patterns compound, and recalibrates thresholds when proactive action leads to measurable margin recovery.

### 2. Cross-Agent Signal Optimization
FRANK maintains a contextual bandit over the feature space of active signal types, their magnitudes, and current operational state. Updated using UCB after each outcome observation. The bandit learns when to surface a recommendation immediately, when to wait for corroborating signals, and when to suppress as low-value given conditions.

Signal conflicts — where acting on one agent's recommendation undermines another agent's objective — are resolved using a priority ordering derived from the owner's historical approval behavior across conflict types, not a static rule.

When multiple agents independently signal the same issue, Bayesian fusion compounds confidence multiplicatively through agent reliability priors:
- 2-agent corroboration (score ≥ 0.65) → urgency upgrade
- 3-agent corroboration (score ≥ 0.85) → urgency escalates to critical

### 3. Owner Preference Learning (IRL)
FRANK constructs an owner preference model from the stream of approval, rejection, and editing events. The model captures domain-level risk tolerance, temporal decision patterns, and threshold sensitivity — the financial impact magnitude above which the owner reliably acts. These parameters are updated continuously and used to reorder and filter the briefing.

A drift detection mechanism monitors rolling 30-day approval rates. A sustained drop below 40% triggers recalibration: confidence bounds widen, the autonomous action threshold rises, and the owner is notified.

---

## Stack

| Layer | Technology |
|---|---|
| Orchestrator | LangGraph (stateful multi-agent graph) |
| LLM | Claude claude-sonnet-4-20250514 (Anthropic API) |
| Forecasting | Facebook Prophet + exogenous regressors |
| Preference Learning | Logistic regression + IRL; Thompson Sampling bandit |
| Cross-Agent Bandit | UCB1 contextual bandit (custom Python) |
| Message Bus | Redis pub/sub |
| Backend | FastAPI + APScheduler (30-min refresh cycle) |
| Auth | JWT (python-jose) + bcrypt |
| Frontend | React 19 + Vite + Tailwind CSS |
| Database | PostgreSQL (audit logs, outcomes); SQLite (prototype) |
| Messaging | Twilio WhatsApp Business API |
| Integrations | Square, Shopify, QuickBooks, Wave, Google My Business, Yelp Fusion, Gmail |

---

## Setup

### 1. Install dependencies

```bash
pip install -r requirements.txt
cd frontend && npm install
```

### 2. Environment variables

Create a `.env` in the project root:

```env
ANTHROPIC_API_KEY=...
EXA_API_KEY=...
OPENWEATHER_API_KEY=...
GITHUB_TOKEN=...
WAVE_ACCESS_TOKEN=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
SECRET_KEY=...
```

### 3. Seed the database

```bash
python seed_employees.py
```

### 4. Run

**Backend** (from project root):
```bash
.venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload --port 8000
```

**Frontend** (from `frontend/`):
```bash
npm run dev
```

**Run FRANK directly:**
```bash
python -m sage.orchestrator.frank "Marathon Deli" "College Park MD" "restaurant" "A"
```

**Demo payload:**
```bash
python run_stub_demo.py alert_mode
```

---

## API

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/run/dataset` | Register a business dataset |
| `POST` | `/run/llm-dataset` | Register pre-computed LLM outputs |
| `GET` | `/run/last-output` | Load cached FRANK output |
| `POST` | `/run/feedback` | Record owner decision (updates bandit + model) |
| `GET` | `/run/preferences` | Owner model stats + bandit arm state |
| `POST` | `/run/refresh` | Trigger manual data refresh + FRANK run |
| `GET` | `/dashboard/summary` | Full briefing |
| `GET` | `/dashboard/manager` | Manager view |
| `GET` | `/dashboard/employee` | Employee view (shifts, leaderboard, tips) |
| `GET` | `/dashboard/crew` | Shift staffing analysis |
| `POST` | `/dashboard/clock` | Clock in/out |
| `GET` | `/leaderboard` | Employee points + badges |

---

## Employee Features

- **Shift requests** — swap, mark unavailable, request coverage
- **Clock in/out** — tied to assigned shifts
- **Tips & cash log** — opening/closing cash and tip amounts per shift
- **Leaderboard** — 100-point score: performance notes (40), shifts completed (30), hours worked (20), tips (10)
- **Notifications** — employees see request status updates; managers see pending approvals

---

## Safety & Risk

**Automation overreach** — No autonomous action with projected financial impact exceeding $200 executes without explicit owner approval. All public-facing outputs (review responses, staff communications) require owner confirmation before delivery. A hard-coded action whitelist enforced at the FRANK layer prevents agents from acting outside categories explicitly permitted during setup.

**Model drift** — A sustained 30-day approval rate below 40% triggers recalibration: confidence bounds widen, the autonomous threshold rises, and the owner is notified that the preference model may need review.

**Data privacy** — All business data stays within the owner's connected accounts. SAGE does not independently persist raw financial or transactional data. OAuth 2.0 is used for all third-party API authentication. No data is used for cross-customer model training without explicit consent.

**API failures** — Affected agents fall back to notification-only mode. FRANK surfaces degraded-mode status in the briefing and withholds recommendations that depend on unavailable data until connectivity is restored.

---

## Estimated Impact

| Value Driver | Restaurant | Retail Shop |
|---|---|---|
| Labor optimization (CREW) | $1,400/mo | $800/mo |
| Margin recovery (SHELF) | $600/mo | $1,100/mo |
| Revenue uplift (PULSE early action) | $900/mo | $500/mo |
| **Total estimated monthly impact** | **$2,900/mo** | **$2,400/mo** |

---

## Project Structure

```
SAGE/
├── sage/
│   ├── orchestrator/frank.py        # LangGraph supervisor
│   ├── agents/
│   │   ├── pulse.py                 # Revenue forecasting
│   │   ├── voice.py                 # Market & reputation intelligence
│   │   ├── shelf.py                 # Cost & margin intelligence
│   │   └── crew_stub.py             # Staffing optimization
│   ├── preferences/
│   │   ├── bandit.py                # Thompson Sampling ranker
│   │   ├── fusion.py                # Bayesian cross-agent corroboration
│   │   ├── outcome_tracker.py       # Delayed reward feedback loop
│   │   └── owner_model.py           # IRL preference model
│   ├── tools/                       # Shared utilities
│   └── data/                        # Persisted state (bandit, model, outputs)
├── backend/
│   └── app/
│       ├── main.py                  # FastAPI entry point + APScheduler
│       ├── agents/router.py         # Run + feedback endpoints
│       ├── dashboard/router.py      # Views + shift management
│       ├── auth/                    # JWT auth
│       └── models.py                # SQLAlchemy models
├── frontend/                        # React 19 + Vite + Tailwind
├── tests/
├── run_stub_demo.py
└── seed_employees.py
```
