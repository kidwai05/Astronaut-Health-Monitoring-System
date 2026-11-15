<div align="center">

```
██╗   ██╗██╗████████╗ █████╗ ██╗     ██╗███████╗
██║   ██║██║╚══██╔══╝██╔══██╗██║     ██║██╔════╝
██║   ██║██║   ██║   ███████║██║     ██║███████╗
╚██╗ ██╔╝██║   ██║   ██╔══██║██║     ██║╚════██║
 ╚████╔╝ ██║   ██║   ██║  ██║███████╗██║███████║
  ╚═══╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝╚══════╝
```

# VITALIS — Astronaut Health Monitoring System

**Decision-support platform for long-duration spaceflight crews**

[![NASA Space Apps](https://img.shields.io/badge/NASA-Space%20Apps%20Challenge-0B3D91?style=for-the-badge&logo=nasa&logoColor=white)](https://www.spaceappschallenge.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

*Not a medical device. Decision support only.*

</div>

---

## 🛰️ Mission Brief

VITALIS is a full-stack health monitoring system built for the NASA Space Apps Challenge. It tracks astronaut biometrics across long-duration missions, fires real-time alerts when readings drift outside personal baselines, and surfaces actionable guidance — all while running offline-first on the International Space Station.

**Mission elapsed: Day 142 of 520.**

---

## ✨ Features

| Category | Capability |
|---|---|
| 🫀 **Vitals Dashboard** | Real-time metric tiles — heart rate, BP, glucose, temperature, SpO₂ — with 7-day sparklines and severity classification |
| 🚨 **Alert Engine** | Three-layer detection: threshold breaches, baseline-deviation z-scores, and monotone trend runs |
| 📡 **Live WebSocket Alerts** | Critical alerts pushed instantly to all connected crew devices via JWT-authenticated WebSocket |
| 📈 **Trends & Charts** | Longitudinal plots with personal baseline bands (mean ± 2 SD), range selector (7d / 14d / 30d / Mission), week-over-week radar |
| 🗺️ **Body Map** | Interactive anatomical symptom mapper |
| 🌙 **Sleep Tracker** | Duration and quality log with recovery scoring |
| 😌 **Mood Check-in** | Daily emotional wellbeing self-report |
| 💊 **Guidance Screen** | Contextual medical articles matched by alert metric and severity |
| 🌍 **Environment Monitor** | Cabin CO₂, O₂ percentage, temperature, humidity, and noise gauges with DONKI radiation badge |
| 🔒 **JWT Auth** | PIN-based crew authentication; HS256 tokens; role-aware access guard (`crew` / `flight_surgeon`) |
| 🔄 **Offline-First Sync** | IndexedDB local store with background sync to backend when connectivity is restored |
| 🌗 **Dark / Light Theme** | System-preference aware; persisted to localStorage |

---

## 🏗️ Architecture

```
astronaut-health/
├── backend/                   # FastAPI + SQLAlchemy + SQLite/PostgreSQL
│   ├── app/
│   │   ├── api/v1/            # Route handlers
│   │   │   ├── auth.py        # POST /auth/login → JWT
│   │   │   ├── dashboard.py   # GET  /dashboard/summary
│   │   │   ├── alerts.py      # GET/PATCH /alerts
│   │   │   ├── measurements.py# POST /measurements  (triggers alert engine)
│   │   │   ├── trends.py      # GET  /trends/{metric}
│   │   │   ├── guidance.py    # GET  /guidance
│   │   │   ├── environment.py # GET  /environment/latest
│   │   │   ├── reminders.py   # GET/POST/PATCH /reminders
│   │   │   ├── ws.py          # WS   /ws/alerts  (live push)
│   │   │   └── crew.py        # GET  /crew/{id}
│   │   ├── services/
│   │   │   └── alert_engine/  # Pluggable rule evaluators
│   │   │       ├── loader.py        # JSON → rule objects + jsonschema validation
│   │   │       ├── threshold.py     # ThresholdEvaluator (above/below bounds)
│   │   │       ├── baseline_dev.py  # BaselineDeviationEvaluator (z-score)
│   │   │       ├── trend.py         # TrendEvaluator (strict monotone window)
│   │   │       └── engine.py        # AlertEngine orchestrator + deduplication
│   │   ├── db/
│   │   │   ├── models.py      # SQLAlchemy ORM models
│   │   │   └── session.py     # SessionLocal, init_db, get_db
│   │   ├── deps.py            # get_current_crew JWT dependency
│   │   └── config.py          # Pydantic Settings (env vars)
│   ├── alembic/               # DB migrations
│   ├── tests/                 # pytest suite
│   └── requirements.txt
│
├── frontend/                  # React 19 + Vite 8 + Tailwind CSS v4
│   └── src/
│       ├── components/        # Full UI component library
│       │   ├── HomeDashboard.tsx
│       │   ├── AlertsCenter.tsx
│       │   ├── TrendsCharts.tsx
│       │   ├── QuickLog.tsx
│       │   ├── GuidanceScreen.tsx
│       │   ├── CrewLogin.tsx
│       │   ├── BodyMap.tsx
│       │   ├── SleepTracker.tsx
│       │   ├── MoodCheckin.tsx
│       │   └── VitalisUI.tsx  # Design-system primitives
│       ├── store/             # Zustand state management
│       ├── db/                # IndexedDB repositories (offline-first)
│       ├── sync/              # Background sync layer
│       ├── api/               # API client
│       └── App.tsx            # Shell + routing
│
└── shared/                    # Cross-platform data contracts
    ├── alert-rules/
    │   ├── schema.json         # JSON Schema draft-07 for rule validation
    │   └── default_rules.json  # 21 rules: 8 threshold, 10 baseline-deviation, 3 trend
    └── test-vectors/
        └── alert_cases.json    # 39 deterministic test cases
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version |
|---|---|
| Python | 3.12+ |
| Node.js | 22+ |
| npm | 10+ |

---

### 1 — Backend

```bash
cd backend

# Create environment file
cp .env.example .env
# Edit .env and set a real SECRET_KEY value

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start the API server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

API is live at **http://localhost:8000**
Interactive docs at **http://localhost:8000/docs**

---

### 2 — Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

App is live at **http://localhost:5173**

---

### 3 — Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | ✅ | HS256 JWT signing key — use a strong random value in production |
| `DATABASE_URL` | ✅ | SQLite (default) or PostgreSQL connection string |
| `NASA_API_KEY` | Optional | NASA DONKI API key for radiation data (defaults to `DEMO_KEY`) |
| `BASELINE_DAYS` | Optional | Days of history used for baseline computation (default: `7`) |
| `CORS_ORIGINS` | Optional | JSON array of allowed frontend origins |

**Example `.env`:**
```env
SECRET_KEY=your-strong-random-secret-here
DATABASE_URL=sqlite:///./astronaut_health.db
NASA_API_KEY=DEMO_KEY
BASELINE_DAYS=7
CORS_ORIGINS=["http://localhost:5173"]
```

---

## 🔌 API Reference

### Authentication

```http
POST /api/v1/auth/login
Content-Type: application/json

{ "crew_id": "amara_khan", "pin": "1234" }
```

Returns `{ "access_token": "...", "token_type": "bearer", "crew_id": "...", "role": "crew" }`

All subsequent requests require:
```http
Authorization: Bearer <access_token>
```

---

### Core Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/dashboard/summary` | Vitals, streak, recent alerts, today's reminders |
| `GET` | `/api/v1/alerts` | Alert list — filterable by `status` and `severity` |
| `PATCH` | `/api/v1/alerts/{id}` | Acknowledge or resolve an alert |
| `POST` | `/api/v1/measurements` | Submit a new vital reading (triggers alert engine) |
| `GET` | `/api/v1/trends/{metric}` | Time-series data with baseline bands (`?window=7d\|14d\|30d`) |
| `GET` | `/api/v1/guidance` | Guidance articles by `?alert_id=` or `?topic=` |
| `GET` | `/api/v1/environment/latest` | Cabin CO₂, O₂, temperature, humidity |
| `GET` | `/api/v1/reminders` | Today's reminders |
| `WS` | `/api/v1/ws/alerts?token=` | Real-time alert push stream |
| `GET` | `/health` | Health check |

---

### Alert Engine — Rule Types

The alert engine loads rules from `shared/alert-rules/default_rules.json` and evaluates three strategies per measurement:

**Threshold** — fires when a value exceeds absolute bounds.
```json
{ "rule_type": "threshold", "params": { "above": 100, "severity_above": "warning" } }
```

**Baseline Deviation** — fires when z-score exceeds threshold.
```json
{ "rule_type": "baseline_deviation", "params": { "z_score_threshold": 2.0 } }
```

**Trend** — fires when the last N readings are strictly monotone.
```json
{ "rule_type": "trend", "params": { "window": 5, "direction": "rising" } }
```

---

## 🧪 Running Tests

```bash
cd backend
pytest tests/ -v
```

The `shared/test-vectors/alert_cases.json` file contains 39 deterministic cases consumed by the pytest suite to validate alert engine correctness across all three rule types.

---

## 🖥️ Screens

| Screen | Route / Nav |
|---|---|
| Boot loader + mission intro | App launch |
| Crew PIN login | Auto-shown when unauthenticated |
| **Home Dashboard** | Home |
| **Quick Vitals Log** | Log |
| **Trends & Charts** | Trends |
| **Alerts Center** | Alerts |
| Body Map | More → Body Map |
| Sleep Tracker | More → Sleep Tracker |
| Mood Check-in | More → Mood Check-in |
| Guidance Library | More → Guidance |

---

## 🛡️ Safety Disclaimer

> VITALIS is a **decision-support tool only**. It does not diagnose, prescribe, or replace clinical judgment. All alerts are informational. Medical decisions must be made by qualified flight surgeons and crew physicians.

---

## 🤝 Built For

<div align="center">

**NASA International Space Apps Challenge**

*Helping humans live and work in space — safely.*

</div>
