# Design Document

## Overview

This document describes the architecture and component design for the P1 MVP completion of the Astronaut Health Monitoring System. The system is an offline-first decision-support application enabling spaceflight crews to log and monitor personal health vitals, receive rule-based alerts, and access contextual guidance.

The existing codebase provides the FastAPI application shell, all SQLAlchemy models, `baseline_service.py`, `sync_service.py`, `measurements.py`, `crew.py`, `security.py`, `HomeDashboard.tsx`, and `QuickLog.tsx`. This design covers the components still required: the Alert Engine, all stub API routes, the Guidance Service, shared JSON rule/test-vector files, the frontend Dexie schema and repositories, the Zustand store, the API client, the sync layer, and the page wrappers (Login, Home, QuickLog, Alerts, and Routing).

---

## Architecture

The system is a two-tier offline-first application.

```
┌──────────────────────────────────────────────────────────────────┐
│  React SPA (Vite + TypeScript)                                   │
│                                                                  │
│  Pages: LoginPage · HomePage · QuickLogPage · AlertsPage        │
│  Components: HomeDashboard · QuickLog · AlertsCenter (existing) │
│  State: Zustand Store (auth · alerts · connectivity · reminders) │
│  Offline: Dexie.js IndexedDB (schema v1 + repositories)          │
│  Network: API Client (fetch + JWT + retry) + Sync Layer          │
│  Realtime: useAlertSocket (WebSocket hook)                       │
└────────────────────┬─────────────────────────────────────────────┘
                     │  HTTP/WS  (localhost:8000 in dev)
┌────────────────────▼─────────────────────────────────────────────┐
│  FastAPI (Python 3.12)                                           │
│                                                                  │
│  Routers: auth · dashboard · alerts · ws · trends · guidance    │
│           reminders · environment · reports · (existing: crew,  │
│           measurements, logs, environment, sync)                 │
│  Services: AlertEngine · GuidanceService                         │
│  Auth: JWT dependency (python-jose HS256, 60-min expiry)        │
│  DB: SQLAlchemy (SQLite dev / PostgreSQL prod) via Session dep   │
│  Shared: shared/alert-rules/default_rules.json + schema.json    │
│          shared/test-vectors/alert_cases.json                    │
└──────────────────────────────────────────────────────────────────┘
```

**Request path for a new measurement:**

1. `QuickLogPage` calls `measurementsRepo.add(record)` → IndexedDB write.
2. `measurementsRepo.add` appends an entry to `syncQueueRepo` (`synced_at = null`).
3. If online, `pushPull.ts` sends `POST /api/v1/sync/push` (or `POST /api/v1/measurements` directly for immediate confirmation).
4. `measurements.py` persists the `Measurement` row, then calls `AlertEngine.evaluate(measurement, db)` within the same transaction.
5. `AlertEngine` evaluates all matching enabled `AlertRule` rows, inserts/updates `Alert` rows, and for `critical` alerts calls `ConnectionManager.publish(crew_id, alert_payload)`.
6. The WebSocket manager delivers the payload to any connected client for that `crew_id`.
7. `HomePage`'s `useAlertSocket` receives the message and updates the Zustand store.

---

## Components and Interfaces

### Backend

#### 1. `shared/alert-rules/schema.json`

JSON Schema draft-07 file that every rule object in `default_rules.json` must satisfy.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "metric", "rule_type", "severity", "enabled", "params"],
  "properties": {
    "id":        { "type": "string" },
    "metric":    { "type": "string" },
    "rule_type": { "enum": ["threshold", "baseline_deviation", "trend"] },
    "severity":  { "enum": ["info", "caution", "warning", "critical"] },
    "enabled":   { "type": "boolean" },
    "params":    { "type": "object" }
  }
}
```

For `threshold` rules, `params` must contain `boundaries` (array of `{direction, value, severity}` objects). For `baseline_deviation` rules, `params` must contain `z_score_threshold`. For `trend` rules, `params` must contain `window` (integer) and `direction` (`"rising"` or `"falling"`).

#### 2. `shared/alert-rules/default_rules.json`

A JSON array of rule objects. One entry per metric/rule-type combination. See Requirements 1.3–1.5 for the required content. Example entry:

```json
[
  {
    "id": "threshold_heart_rate_critical_low",
    "metric": "heart_rate",
    "rule_type": "threshold",
    "severity": "critical",
    "enabled": true,
    "params": { "boundaries": [{ "direction": "below", "value": 40 }] }
  }
]
```

#### 3. `shared/test-vectors/alert_cases.json`

A JSON array of test case objects. At least one entry per rule `id`. Each entry:

```json
{
  "description": "heart_rate below critical_low threshold",
  "rule_id": "threshold_heart_rate_critical_low",
  "input": {
    "metric": "heart_rate",
    "value": 35,
    "baseline_mean": null,
    "baseline_std_dev": null,
    "recent_readings": []
  },
  "expected_alerts": [
    { "rule_type": "threshold", "metric": "heart_rate", "severity": "critical" }
  ]
}
```

#### 4. `app/services/alert_engine/`

Package structure:

```
app/services/alert_engine/
  __init__.py          # exports AlertEngine
  loader.py            # AlertRuleLoader: reads + validates default_rules.json
  threshold.py         # ThresholdEvaluator
  baseline_dev.py      # BaselineDeviationEvaluator
  trend.py             # TrendEvaluator
  engine.py            # AlertEngine orchestrator
```

**`loader.py` — `AlertRuleLoader`**

```python
import json
from pathlib import Path
import jsonschema

RULES_PATH = Path("shared/alert-rules/default_rules.json")
SCHEMA_PATH = Path("shared/alert-rules/schema.json")

class AlertRuleLoader:
    def __init__(self, rules_path: Path = RULES_PATH, schema_path: Path = SCHEMA_PATH):
        schema = json.loads(schema_path.read_text())
        rules = json.loads(rules_path.read_text())
        for rule in rules:
            try:
                jsonschema.validate(rule, schema)
            except jsonschema.ValidationError as exc:
                raise ValueError(f"Rule {rule.get('id')} failed validation: {exc.message}") from exc
        self._rules: list[dict] = rules

    def rules_for_metric(self, metric: str) -> list[dict]:
        return [r for r in self._rules if r["metric"] == metric and r["enabled"]]
```

The `AlertRuleLoader` is instantiated once at application startup (via a module-level singleton loaded in the FastAPI lifespan) so the file is read and validated only once.

**`threshold.py` — `ThresholdEvaluator`**

```python
def evaluate(rule: dict, value: float) -> bool:
    for boundary in rule["params"]["boundaries"]:
        if boundary["direction"] == "below" and value < boundary["value"]:
            return True
        if boundary["direction"] == "above" and value > boundary["value"]:
            return True
    return False
```

**`baseline_dev.py` — `BaselineDeviationEvaluator`**

```python
def evaluate(rule: dict, value: float, mean: float, std_dev: float) -> bool:
    if std_dev == 0:
        return False
    z = (value - mean) / std_dev
    return abs(z) >= rule["params"]["z_score_threshold"]
```

**`trend.py` — `TrendEvaluator`**

```python
def evaluate(rule: dict, recent_values: list[float]) -> bool:
    window = rule["params"]["window"]
    direction = rule["params"]["direction"]
    if len(recent_values) < window:
        return False
    for a, b in zip(recent_values[-window:], recent_values[-window + 1:]):
        if direction == "rising" and b <= a:
            return False
        if direction == "falling" and b >= a:
            return False
    return True
```

**`engine.py` — `AlertEngine`**

```python
from sqlalchemy.orm import Session
from app.db.models import Alert, Baseline, Measurement
from app.services.alert_engine.loader import AlertRuleLoader
from app.services.alert_engine.threshold import ThresholdEvaluator
from app.services.alert_engine.baseline_dev import BaselineDeviationEvaluator
from app.services.alert_engine.trend import TrendEvaluator
from app.api.v1.ws import connection_manager

class AlertEngine:
    def __init__(self, loader: AlertRuleLoader):
        self._loader = loader

    def evaluate(self, measurement: Measurement, db: Session) -> list[Alert]:
        rules = self._loader.rules_for_metric(measurement.metric)
        inserted: list[Alert] = []
        for rule in rules:
            fired = False
            if rule["rule_type"] == "threshold":
                fired = ThresholdEvaluator.evaluate(rule, measurement.value)
            elif rule["rule_type"] == "baseline_deviation":
                baseline = db.scalar(
                    select(Baseline).where(
                        Baseline.crew_id == measurement.crew_id,
                        Baseline.metric == measurement.metric
                    )
                )
                if baseline is None or baseline.sample_size < 3:
                    continue
                fired = BaselineDeviationEvaluator.evaluate(
                    rule, measurement.value, baseline.mean, baseline.std_dev
                )
            elif rule["rule_type"] == "trend":
                recent = list(db.scalars(
                    select(Measurement.value)
                    .where(
                        Measurement.crew_id == measurement.crew_id,
                        Measurement.metric == measurement.metric
                    )
                    .order_by(Measurement.recorded_at.asc())
                    .limit(rule["params"]["window"])
                ))
                fired = TrendEvaluator.evaluate(rule, recent)

            if not fired:
                continue

            # Deduplication: update existing open alert or insert new one
            existing = db.scalar(
                select(Alert).where(
                    Alert.crew_id == measurement.crew_id,
                    Alert.metric == measurement.metric,
                    Alert.triggered_by_rule == rule["id"],
                    Alert.status == "open"
                )
            )
            message = _build_message(rule, measurement)
            if existing:
                existing.message = message
                alert = existing
            else:
                alert = Alert(
                    crew_id=measurement.crew_id,
                    metric=measurement.metric,
                    severity=rule["severity"],
                    message=message,
                    triggered_by_rule=rule["id"],
                    status="open"
                )
                db.add(alert)
            db.flush()
            inserted.append(alert)

            if rule["severity"] == "critical":
                import asyncio
                asyncio.create_task(
                    connection_manager.publish(measurement.crew_id, alert)
                )

        return inserted
```

The `alert_engine` singleton is created in `main.py` lifespan, stored on `app.state.alert_engine`, and injected via a FastAPI dependency.

#### 5. `app/api/v1/auth.py`

Implements `POST /api/v1/auth/login`. Uses `python-jose` for JWT encoding.

```python
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from jose import jwt

from app.config import get_settings
from app.core.security import verify_pin
from app.db.models import CrewMember
from app.deps import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    member = db.get(CrewMember, body.crew_id)
    if member is None or not verify_pin(body.pin, member.pin_hash or ""):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    settings = get_settings()
    exp = utcnow() + timedelta(seconds=3600)
    token = jwt.encode(
        {"sub": member.id, "role": member.role, "exp": exp},
        settings.secret_key, algorithm="HS256"
    )
    return {"access_token": token, "token_type": "bearer",
            "crew_id": member.id, "role": member.role}
```

`Settings` gains a new required field:

```python
secret_key: str  # no default; loaded from SECRET_KEY env var
```

#### 6. `app/deps.py` — JWT dependency

```python
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from app.config import get_settings

bearer = HTTPBearer()

def get_current_crew(
    credentials: HTTPAuthorizationCredentials = Security(bearer)
) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, get_settings().secret_key, algorithms=["HS256"])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_own_or_surgeon(crew_id: str, current: dict = Depends(get_current_crew)) -> dict:
    if current["sub"] != crew_id and current.get("role") != "flight_surgeon":
        raise HTTPException(status_code=403, detail="Forbidden")
    return current
```

#### 7. `app/api/v1/dashboard.py`

`GET /api/v1/dashboard/summary` — single query endpoint.

Response shape:

```python
class DashboardSummary(BaseModel):
    latest_vitals: list[VitalStatus]
    open_alert_count: int
    open_alerts: list[AlertOut]
    today_reminders: list[ReminderOut]
    streak_days: int
```

`VitalStatus.status` is computed by calling `ThresholdEvaluator.evaluate` for each enabled threshold rule matching that metric. Classification logic:

- Any `critical` rule fires → `"critical"`
- Any `warning` rule fires → `"warning"`
- Any `caution` rule fires → `"caution"`
- Otherwise → `"normal"`

`streak_days` is calculated by counting consecutive calendar days (UTC) going backwards from today that have at least one `Measurement` row for the crew member.

#### 8. `app/api/v1/alerts.py`

```
GET  /api/v1/alerts                 → list alerts (filterable by status, severity)
PATCH /api/v1/alerts/{id}           → update status field
```

Invalid transitions: `"resolved"` → anything else returns HTTP 422. The response serializer adds `flight_surgeon_contact: true` for any `critical` alert.

#### 9. `app/api/v1/ws.py` — WebSocket + ConnectionManager

```python
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from collections import defaultdict
from jose import JWTError, jwt

router = APIRouter(prefix="/ws", tags=["ws"])

class ConnectionManager:
    def __init__(self):
        self._connections: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, crew_id: str, ws: WebSocket):
        await ws.accept()
        self._connections[crew_id].append(ws)

    def disconnect(self, crew_id: str, ws: WebSocket):
        self._connections[crew_id].remove(ws)

    async def publish(self, crew_id: str, payload: dict):
        for ws in list(self._connections.get(crew_id, [])):
            try:
                await ws.send_json(payload)
            except Exception:
                pass

connection_manager = ConnectionManager()

@router.websocket("/alerts")
async def ws_alerts(websocket: WebSocket, token: str | None = None):
    if not token:
        await websocket.close(code=4001)
        return
    try:
        payload = jwt.decode(token, get_settings().secret_key, algorithms=["HS256"])
        crew_id = payload["sub"]
    except JWTError:
        await websocket.close(code=4001)
        return
    await connection_manager.connect(crew_id, websocket)
    try:
        while True:
            await websocket.receive_text()  # keep connection alive; ignore client frames
    except WebSocketDisconnect:
        connection_manager.disconnect(crew_id, websocket)
```

#### 10. `app/api/v1/trends.py`

`GET /api/v1/trends/{metric}?window=7d`

Accepted window values: `"7d"`, `"14d"`, `"30d"`. Invalid values return 422. If no baseline exists, `baseline` and `band` are `null`. Band is computed as `{lower: mean - 2*std_dev, upper: mean + 2*std_dev}`.

#### 11. `app/services/guidance_service.py`

```python
from sqlalchemy.orm import Session
from app.db.models import Alert, GuidanceArticle

class GuidanceService:
    def by_alert(self, alert_id: str, db: Session) -> list[GuidanceArticle]:
        alert = db.get(Alert, alert_id)
        if alert is None:
            return []
        search = f"{alert.metric} {alert.severity}".lower()
        return self._match(search, db)

    def by_topic(self, topic: str, db: Session) -> list[GuidanceArticle]:
        return self._match(topic.lower(), db)

    def _match(self, search: str, db: Session) -> list[GuidanceArticle]:
        articles = db.scalars(select(GuidanceArticle)).all()
        matched = [
            a for a in articles
            if any(tag.lower() in search for tag in a.trigger_tags)
        ]
        return sorted(matched, key=lambda a: _severity_rank(a.severity_level), reverse=True)
```

#### 12. `app/api/v1/guidance.py`, `reminders.py`, `reports.py`, `environment.py` (completions)

- **`guidance.py`**: Thin FastAPI router delegating to `GuidanceService`. Returns 422 if neither `alert_id` nor `topic` is provided. Returns `[]` with 200 on no match.
- **`reminders.py`**: `GET` returns all crew reminders. `POST` creates with `crew_id` from JWT. `PATCH /{id}` validates ownership (403 on mismatch) and updates `enabled` or `last_done_at`.
- **`reports.py`**: `GET /reports/export` guards with `role == "flight_surgeon"` (403 otherwise). Accepts `format=csv|pdf` (422 for other values). Streams CSV using Python's `csv` module or generates PDF with `reportlab`. Joins `Measurement`, `SleepLog`, `MoodLog`, `SymptomLog`, `ExerciseLog` for the requested crew member within the optional date range.
- **`environment.py`** (completion): `POST` already implemented. `GET` adds `from`/`to` filter query params, returns up to 500 records ordered by `recorded_at` descending. After `POST`, calls `AlertEngine.evaluate_environment(reading, db)` to check CO₂, O₂, and radiation critical thresholds.

### Frontend

#### 13. `src/db/schema.ts` — Dexie Database

```typescript
import Dexie, { type Table } from "dexie";

export interface MeasurementRecord {
  id: string;           // UUID v4
  crew_id: string;
  metric: string;
  value: number;
  unit?: string;
  source: string;       // "manual" | "wearable" | "camera"
  recorded_at: string;  // ISO 8601 UTC
  note?: string;
  updated_at: string;
  synced_at?: string | null;
}

export interface AlertRecord {
  id: string;
  crew_id: string;
  metric: string;
  severity: string;
  message: string;
  triggered_by_rule?: string;
  status: string;
  created_at: string;
  updated_at: string;
  synced_at?: string | null;
}

export interface SyncQueueRecord {
  id: string;
  entity: string;
  entity_id: string;
  operation: "upsert" | "delete";
  payload: Record<string, unknown>;
  updated_at: string;
  synced_at: string | null;
}

// (SleepLogRecord, MoodLogRecord, SymptomLogRecord, ExerciseLogRecord, ReminderRecord defined similarly)

export class VitalisDB extends Dexie {
  measurements!: Table<MeasurementRecord>;
  sleep_logs!: Table<SleepLogRecord>;
  mood_logs!: Table<MoodLogRecord>;
  symptom_logs!: Table<SymptomLogRecord>;
  exercise_logs!: Table<ExerciseLogRecord>;
  alerts!: Table<AlertRecord>;
  reminders!: Table<ReminderRecord>;
  sync_queue!: Table<SyncQueueRecord>;

  constructor() {
    super("VitalisDB");
    this.version(1).stores({
      measurements:  "id, crew_id, [crew_id+metric], recorded_at",
      sleep_logs:    "id, crew_id",
      mood_logs:     "id, crew_id",
      symptom_logs:  "id, crew_id",
      exercise_logs: "id, crew_id",
      alerts:        "id, crew_id, [crew_id+status], created_at",
      reminders:     "id, crew_id",
      sync_queue:    "id, synced_at",
    });
  }
}

export const db = new VitalisDB();
```

#### 14. `src/db/repositories/measurements.ts`

```typescript
import { db, type MeasurementRecord } from "../schema";
import { v4 as uuidv4 } from "uuid";
import { syncQueueRepo } from "./syncQueue";

export const measurementsRepo = {
  async add(record: Omit<MeasurementRecord, "id" | "updated_at"> & { id?: string }): Promise<MeasurementRecord> {
    const full: MeasurementRecord = {
      ...record,
      id: record.id ?? uuidv4(),
      updated_at: new Date().toISOString(),
      synced_at: null,
    };
    await db.measurements.add(full);
    await syncQueueRepo.enqueue("measurements", full.id, "upsert", full);
    return full;
  },

  async listForCrew(crewId: string, metric?: string, from?: string, to?: string, limit = 500): Promise<MeasurementRecord[]> {
    let query = metric
      ? db.measurements.where("[crew_id+metric]").equals([crewId, metric])
      : db.measurements.where("crew_id").equals(crewId);
    let results = await query.toArray();
    if (from) results = results.filter(r => r.recorded_at >= from!);
    if (to)   results = results.filter(r => r.recorded_at <= to!);
    return results.sort((a, b) => b.recorded_at.localeCompare(a.recorded_at)).slice(0, limit);
  },

  async getLatestPerMetric(crewId: string): Promise<Record<string, MeasurementRecord>> {
    const all = await db.measurements.where("crew_id").equals(crewId).toArray();
    const map: Record<string, MeasurementRecord> = {};
    for (const r of all.sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))) {
      map[r.metric] ??= r;
    }
    return map;
  },

  async markSynced(id: string): Promise<void> {
    await db.measurements.update(id, { synced_at: new Date().toISOString() });
  },
};
```

#### 15. `src/db/repositories/alerts.ts`, `sleep.ts`, `mood.ts`, `symptoms.ts`

Each follows the same `add / listForCrew / updateStatus|markSynced` pattern. `alerts.ts` adds:

```typescript
async updateStatus(id: string, status: string): Promise<void> {
  await db.alerts.update(id, { status, updated_at: new Date().toISOString() });
  await syncQueueRepo.enqueue("alerts", id, "upsert", { id, status });
},
```

#### 16. `src/db/repositories/syncQueue.ts`

```typescript
import { db, type SyncQueueRecord } from "../schema";
import { v4 as uuidv4 } from "uuid";

export const syncQueueRepo = {
  async enqueue(entity: string, entityId: string, operation: "upsert" | "delete", payload: Record<string, unknown>): Promise<void> {
    const record: SyncQueueRecord = {
      id: uuidv4(),
      entity,
      entity_id: entityId,
      operation,
      payload,
      updated_at: new Date().toISOString(),
      synced_at: null,
    };
    await db.sync_queue.add(record);
  },

  async getPending(): Promise<SyncQueueRecord[]> {
    return db.sync_queue.where("synced_at").equals("").or("synced_at").equals(null as unknown as string).toArray()
      .then(all => all.filter(r => r.synced_at == null));
  },

  async markSynced(id: string): Promise<void> {
    await db.sync_queue.update(id, { synced_at: new Date().toISOString() });
  },
};
```

#### 17. `src/store/useAppStore.ts` — Zustand Store

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { jwtDecode } from "jwt-decode";

interface AuthSlice {
  crewId: string | null;
  role: string | null;
  token: string | null;
  isAuthenticated: boolean;
}

interface AlertSlice {
  openCount: number;
  criticalPending: boolean;
}

interface ConnectivitySlice {
  isOnline: boolean;
}

interface ReminderSlice {
  items: ReminderRecord[];
  completedToday: number;
}

interface AppStore extends AuthSlice, AlertSlice, ConnectivitySlice, ReminderSlice {
  login: (crewId: string, role: string, token: string) => void;
  logout: () => void;
  setOnline: (value: boolean) => void;
  incrementOpenAlerts: (count: number) => void;
  dismissCritical: () => void;
  setReminders: (items: ReminderRecord[]) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      crewId: null, role: null, token: null, isAuthenticated: false,
      openCount: 0, criticalPending: false,
      isOnline: navigator.onLine,
      items: [], completedToday: 0,

      login: (crewId, role, token) => {
        localStorage.setItem("vitalis-token", token);
        set({ crewId, role, token, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem("vitalis-token");
        set({ crewId: null, role: null, token: null, isAuthenticated: false });
      },
      setOnline: (value) => set({ isOnline: value }),
      incrementOpenAlerts: (count) => set(s => ({ openCount: s.openCount + count })),
      dismissCritical: () => set({ criticalPending: false }),
      setReminders: (items) => set({ items }),
    }),
    { name: "vitalis-auth", partialize: (s) => ({ token: s.token }) }
  )
);

// Rehydrate auth on startup
const storedToken = localStorage.getItem("vitalis-token");
if (storedToken) {
  try {
    const decoded = jwtDecode<{ sub: string; role: string; exp: number }>(storedToken);
    if (decoded.exp * 1000 > Date.now()) {
      useAppStore.setState({ crewId: decoded.sub, role: decoded.role, token: storedToken, isAuthenticated: true });
    }
  } catch {
    localStorage.removeItem("vitalis-token");
  }
}
```

#### 18. `src/api/client.ts` — API Client

```typescript
import { useAppStore } from "../store/useAppStore";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const TIMEOUT = 10_000;

export class AuthError extends Error {}
export class ApiError extends Error {
  constructor(public status: number, public detail: string) {
    super(detail);
  }
}
export class TimeoutError extends Error {}

async function request<T>(path: string, init: RequestInit = {}, skipAuth = false): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(init.headers as Record<string, string>) };
  if (!skipAuth) {
    const token = useAppStore.getState().token;
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  try {
    const res = await fetch(`${BASE}${path}`, { ...init, headers, signal: controller.signal });
    clearTimeout(timer);
    if (res.status === 401 && !skipAuth) {
      useAppStore.getState().logout();
      throw new AuthError("Session expired");
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: res.statusText }));
      throw new ApiError(res.status, body.detail ?? res.statusText);
    }
    return res.json();
  } catch (err) {
    if ((err as Error).name === "AbortError") throw new TimeoutError("Request timed out");
    throw err;
  }
}

export const apiClient = {
  login:               (crewId: string, pin: string) =>
    request("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ crew_id: crewId, pin }) }, true),
  getDashboardSummary: () => request("/api/v1/dashboard/summary"),
  getAlerts:           (filters?: { status?: string; severity?: string }) =>
    request(`/api/v1/alerts?${new URLSearchParams(filters as Record<string, string>)}`),
  patchAlert:          (id: string, status: string) =>
    request(`/api/v1/alerts/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  getMeasurements:     (crewId: string, filters?: Record<string, string>) =>
    request(`/api/v1/measurements?crew_id=${crewId}&${new URLSearchParams(filters)}`),
  postMeasurement:     (payload: Record<string, unknown>) =>
    request("/api/v1/measurements", { method: "POST", body: JSON.stringify(payload) }),
  getTrends:           (metric: string, window = "7d") =>
    request(`/api/v1/trends/${metric}?window=${window}`),
  getGuidance:         (params: { alert_id?: string; topic?: string }) =>
    request(`/api/v1/guidance?${new URLSearchParams(params as Record<string, string>)}`),
  getReminders:        () => request("/api/v1/reminders"),
  patchReminder:       (id: string, payload: Record<string, unknown>) =>
    request(`/api/v1/reminders/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  syncPush:            (items: unknown[]) =>
    request("/api/v1/sync/push", { method: "POST", body: JSON.stringify({ items }) }),
  syncPull:            (since?: string) =>
    request(`/api/v1/sync/pull${since ? `?since=${since}` : ""}`),
};
```

#### 19. `src/sync/syncQueue.ts`, `pushPull.ts`, `conflict.ts`

**`syncQueue.ts`** — re-exports `syncQueueRepo` from the repository layer; exposes `flush()` trigger.

**`pushPull.ts`**

```typescript
import { syncQueueRepo } from "../db/repositories/syncQueue";
import { apiClient } from "../api/client";
import { measurementsRepo } from "../db/repositories/measurements";
import { alertsRepo } from "../db/repositories/alerts";

const BATCH_SIZE = 50;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

export async function pushPendingItems(): Promise<void> {
  const pending = await syncQueueRepo.getPending();
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);
    try {
      const response = await apiClient.syncPush(batch);
      for (const result of response.results) {
        if (result.status === "applied") {
          await syncQueueRepo.markSynced(result.entity_id);
        } else if (result.status === "stale") {
          await resolveConflict(result, batch.find(b => b.entity_id === result.entity_id)!);
        }
      }
    } catch {
      scheduleRetry();
      return;
    }
  }
}

export async function pullChanges(since?: string): Promise<void> {
  try {
    const response = await apiClient.syncPull(since);
    for (const [entity, records] of Object.entries(response.changes)) {
      for (const record of records as Record<string, unknown>[]) {
        await mergeRecord(entity, record);
      }
    }
  } catch {
    scheduleRetry();
  }
}

function scheduleRetry(): void {
  if (retryTimer) return;
  retryTimer = setTimeout(() => { retryTimer = null; pushPendingItems(); }, 30_000);
}
```

**`conflict.ts`** — last-write-wins:

```typescript
export async function resolveConflict(serverResult: SyncResultItem, localItem: SyncQueueRecord): Promise<void> {
  // Server copy is newer → discard local change (no-op for P1 offline queue)
  // Local copy is newer → item was already applied; mark synced
  if (serverResult.status === "stale") {
    await syncQueueRepo.markSynced(localItem.entity_id);
  }
}
```

#### 20. `src/hooks/useConnectivity.ts`

```typescript
import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import { pushPendingItems } from "../sync/pushPull";

export function useConnectivity(): void {
  const setOnline = useAppStore(s => s.setOnline);
  useEffect(() => {
    const onOnline  = () => { setOnline(true);  pushPendingItems(); };
    const onOffline = () => setOnline(false);
    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online",  onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [setOnline]);
}
```

#### 21. `src/hooks/useAlertSocket.ts`

```typescript
import { useEffect, useRef } from "react";
import { useAppStore } from "../store/useAppStore";

export function useAlertSocket(): void {
  const { token, isAuthenticated, incrementOpenAlerts } = useAppStore();
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    const url = `${import.meta.env.VITE_WS_URL ?? "ws://localhost:8000"}/api/v1/ws/alerts?token=${token}`;
    ws.current = new WebSocket(url);
    ws.current.onmessage = (event) => {
      const alert = JSON.parse(event.data);
      incrementOpenAlerts(1);
      if (alert.severity === "critical") {
        useAppStore.setState({ criticalPending: true });
      }
    };
    return () => ws.current?.close();
  }, [isAuthenticated, token]);
}
```

#### 22. `src/pages/LoginPage.tsx`

Calls `GET /api/v1/crew` on mount to render crew cards (name, role, job title). On card selection, reveals a PIN pad (digits 0–9, backspace, confirm). Confirm is disabled while request is in-flight. On success calls `useAppStore.login()` and navigates to `/`. On `AuthError` shows "Incorrect PIN. Try again." without navigating. Disclaimer at bottom of screen.

#### 23. `src/pages/HomePage.tsx`

Mounts, checks `isAuthenticated`. Calls `apiClient.getDashboardSummary()`. On success passes result as props to `<HomeDashboard>` and updates `useAppStore.alerts.openCount`. On network error while offline, reads latest measurements from IndexedDB via `measurementsRepo.getLatestPerMetric()` and renders `<HomeDashboard>` with that data. On non-network API error renders an inline error message below the status banner. Mounts `useAlertSocket()`. Renders a full-screen overlay when `criticalPending` is `true`.

#### 24. `src/pages/QuickLogPage.tsx`

Mounts and reads `measurementsRepo.getLatestPerMetric(crewId)` to populate the "Last value" text that is passed as props to `<QuickLog>`. When `QuickLog` invokes its save action, the page calls `measurementsRepo.add(...)` for each non-null vital using UTC timestamp and `"manual"` source. On IndexedDB success, if online, also calls `apiClient.postMeasurement(...)` and marks the queue item synced on success. If the POST response or a WebSocket message contains an alert, passes severity and message to `<QuickLog>` for display in the result bottom sheet.

#### 25. `src/pages/AlertsPage.tsx`

Calls `apiClient.getAlerts()` on mount. Groups alerts into sections by severity (critical → warning → caution → info). Each section header shows a count badge. Tapping a row expands an inline panel with `message`, `created_at`, rule type, and a "See guidance" link. Acknowledge calls `apiClient.patchAlert(id, "acknowledged")` with optimistic UI update. Resolve calls `apiClient.patchAlert(id, "resolved")` and moves the row to a collapsed "Resolved" section. Persistent "Contact flight surgeon now" banner while any critical alert is unresolved or unacknowledged. Disclaimer at bottom.

#### 26. `src/routes.tsx`

```typescript
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAppStore } from "./store/useAppStore";
import { useConnectivity } from "./hooks/useConnectivity";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";
import { QuickLogPage } from "./pages/QuickLogPage";
import { AlertsPage } from "./pages/AlertsPage";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppStore(s => s.isAuthenticated);
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

function AppShell({ children }: { children: React.ReactNode }) {
  useConnectivity();
  const isOnline = useAppStore(s => s.isOnline);
  return (
    <React.Fragment>
      {!isOnline && (
        <div className="offline-banner" role="status">Offline — data saved locally</div>
      )}
      {children}
    </React.Fragment>
  );
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <React.Suspense fallback={null}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<AuthGuard><AppShell><HomePage /></AppShell></AuthGuard>} />
          <Route path="/log" element={<AuthGuard><AppShell><QuickLogPage /></AppShell></AuthGuard>} />
          <Route path="/alerts" element={<AuthGuard><AppShell><AlertsPage /></AppShell></AuthGuard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  );
}
```

---

## Data Models

All SQLAlchemy models are already defined. The key relationships for the new components are:

| Model | Key fields used by new code |
|---|---|
| `CrewMember` | `id`, `role`, `pin_hash`, `name`, `job_title` |
| `Measurement` | `crew_id`, `metric`, `value`, `recorded_at` |
| `Baseline` | `crew_id`, `metric`, `mean`, `std_dev`, `sample_size` |
| `AlertRule` | `metric`, `rule_type`, `params`, `severity`, `enabled` |
| `Alert` | `crew_id`, `metric`, `severity`, `message`, `triggered_by_rule`, `status` |
| `GuidanceArticle` | `topic`, `trigger_tags`, `severity_level`, `title`, `body` |
| `Reminder` | `crew_id`, `type`, `schedule`, `enabled`, `last_done_at` |
| `EnvironmentReading` | `co2_ppm`, `o2_pct`, `radiation_usv`, `recorded_at` |

The `AlertRule` table is seeded from `default_rules.json` on first startup by a migration helper in `main.py` lifespan:

```python
def _seed_alert_rules(db: Session, loader: AlertRuleLoader) -> None:
    for rule_data in loader.rules:
        if not db.get(AlertRule, rule_data["id"]):
            db.add(AlertRule(**rule_data))
    db.commit()
```

This keeps `AlertRule` rows in sync with the JSON file without duplicating during restarts.

---

### Backend API Surface (new routes)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | None | PIN → JWT |
| `GET` | `/api/v1/dashboard/summary` | JWT | Home screen data bundle |
| `GET` | `  /api/v1/alerts` | JWT | List alerts with filters |
| `PATCH` | `/api/v1/alerts/{id}` | JWT | Acknowledge / resolve |
| `WS` | `/api/v1/ws/alerts` | JWT (query param) | Real-time alert stream |
| `GET` | `/api/v1/trends/{metric}` | JWT | Time-series + baseline band |
| `GET` | `/api/v1/guidance` | JWT | Articles by alert_id or topic |
| `GET` | `/api/v1/reminders` | JWT | List reminders |
| `POST` | `/api/v1/reminders` | JWT | Create reminder |
| `PATCH` | `/api/v1/reminders/{id}` | JWT | Update reminder |
| `GET` | `/api/v1/environment` | JWT | List environment readings |
| `GET` | `/api/v1/reports/export` | JWT (surgeon) | CSV or PDF export |

### Frontend Data Flow

```
useAppStore (Zustand)
     ↑ login/logout/incrementOpenAlerts/dismissCritical
     │
LoginPage ──→ apiClient.login ──→ POST /auth/login
HomePage  ──→ apiClient.getDashboardSummary ──→ GET /dashboard/summary
          ──→ useAlertSocket ──→ WS /ws/alerts
QuickLogPage ──→ measurementsRepo.add ──→ IndexedDB
             ──→ syncQueueRepo.enqueue ──→ sync_queue IndexedDB
             ──→ apiClient.postMeasurement ──→ POST /measurements (online)
AlertsPage ──→ apiClient.getAlerts ──→ GET /alerts
           ──→ apiClient.patchAlert ──→ PATCH /alerts/{id}
```

---

## Error Handling

| Scenario | Backend behaviour | Frontend behaviour |
|---|---|---|
| `SECRET_KEY` absent | `ValidationError` at startup, app refuses to start | — |
| Invalid JWT | 401 from `get_current_crew` dep | `apiClient` calls `logout()`, throws `AuthError`, router redirects to `/login` |
| Wrong crew_id in path | 403 from `require_own_or_surgeon` | `ApiError(403)` surfaced as inline error message |
| Alert rule JSON invalid | `ValueError` in `AlertRuleLoader.__init__`, raised in lifespan → app refuses to start | — |
| Baseline missing for deviation rule | `AlertEngine` skips rule silently | — |
| Network error during sync | `pushPull.ts` catches, logs, schedules 30 s retry | Offline banner already shown |
| Non-2xx API response | Structured `{"detail": "..."}` body | `ApiError` with `status` and `detail` |
| Request timeout (10 s) | Server continues; client times out | `TimeoutError` surfaced as inline error |
| IndexedDB write failure | — | Caught in repository, error propagated to page for notification |
| Unhandled React error | — | Error boundary shows "Something went wrong. Restart the app." |
| `resolved` → other status | 422 from alerts endpoint | `ApiError(422)`, UI reverts optimistic update |

---

## Testing Strategy

The test suite uses a dual approach: example-based tests for specific scenarios and integration points, plus property-based tests for universal invariants.

**Backend (pytest + Hypothesis)**

- Unit tests cover each API route with a SQLite in-memory test database, verifying correct status codes, response shapes, and field values.
- `ThresholdEvaluator`, `BaselineDeviationEvaluator`, and `TrendEvaluator` are pure functions and are the primary targets for property-based tests using Hypothesis. Each evaluator is tested with generated (rule, value) pairs across the full valid input space.
- `AlertEngine.evaluate` is tested for deduplication using Hypothesis-generated sequences of repeated triggering inputs.
- `GuidanceService._match` is tested with Hypothesis-generated article lists and query strings to verify case-insensitive substring matching.
- Auth middleware tests use example-based tests (missing token, expired token, wrong crew_id).
- Performance smoke tests seed 10 000 Measurement rows and assert p95 response time under the stated budget.

**Frontend (vitest + fast-check)**

- Repository methods are tested with an in-memory Dexie adapter. `add` is property-tested across generated record shapes to verify UUID generation and `updated_at` assignment.
- Zustand store actions (`login`, `logout`, `setOnline`, `dismissCritical`) are tested with example-based unit tests; token-restore logic is property-tested across valid and expired JWT payloads.
- `apiClient` error handling is property-tested across HTTP status codes to verify `ApiError` construction.
- Sync layer batch-size invariant is property-tested with Hypothesis-generated pending queue sizes.
- Conflict resolver is property-tested with generated (local_updated_at, server_updated_at) pairs.
- Page components are tested with React Testing Library: example-based tests for login flow, home page offline fallback, quick-log save path, and alert acknowledge/resolve flow.

**Shared test vectors**

The `alert_cases.json` test vectors are executed by both pytest and vitest to verify cross-platform evaluation consistency (Property 2). Each test file imports the JSON directly and asserts that evaluator output matches `expected_alerts`.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Invalid rule schema raises ValueError

*For any* JSON object that violates the alert rule schema, `AlertRuleLoader` initialization must raise a `ValueError` before returning.

**Validates: Requirements 1.2**

---

### Property 2: Cross-platform alert evaluation consistency

*For any* test case in `alert_cases.json`, running the input through the Python alert engine and through the TypeScript frontend evaluator must both produce `expected_alerts` arrays with identical `rule_type`, `metric`, and `severity` entries.

**Validates: Requirements 1.7**

---

### Property 3: Threshold alert correctness

*For any* `ThresholdRule` with configured boundaries and *any* measurement value that lies outside those boundaries, `ThresholdEvaluator.evaluate` must return `true`; for any value within all boundaries, it must return `false`.

**Validates: Requirements 2.2**

---

### Property 4: Baseline deviation z-score correctness

*For any* measurement value, baseline mean, and baseline std_dev (std_dev > 0, sample_size ≥ 3), `BaselineDeviationEvaluator.evaluate` fires if and only if `abs((value − mean) / std_dev) >= z_score_threshold`.

**Validates: Requirements 2.3**

---

### Property 5: Trend detection correctness

*For any* sequence of N measurements and a configured window W (N ≥ W), `TrendEvaluator.evaluate` returns `true` if and only if every consecutive pair in the final W readings shows a change strictly in the configured direction.

**Validates: Requirements 2.5**

---

### Property 6: Alert deduplication (idempotence)

*For any* (crew_id, metric, rule_id) combination, running `AlertEngine.evaluate` twice with the same triggering measurement must result in exactly one `open` Alert record — not two. The second evaluation updates `message` and `updated_at` rather than inserting a duplicate row.

**Validates: Requirements 2.7**

---

### Property 7: JWT claims correctness

*For any* `CrewMember` with a valid PIN, a successful `POST /auth/login` response must contain a JWT whose decoded claims satisfy `sub = crew_id`, `role = crew_member.role`, and `exp ≥ utcnow() + 3599`.

**Validates: Requirements 3.4**

---

### Property 8: Cross-crew access control

*For any* authenticated JWT with `sub = A` and `role ≠ "flight_surgeon"`, any request to a crew-scoped endpoint that specifies `crew_id = B` (where B ≠ A) must return HTTP 403.

**Validates: Requirements 3.6**

---

### Property 9: Dashboard vital status classification

*For any* (metric, value) pair where a Measurement exists, the `status` field returned by `/dashboard/summary` must equal the most severe classification produced by applying all enabled `ThresholdRule`s for that metric independently to the value.

**Validates: Requirements 4.2**

---

### Property 10: Alert list filter correctness

*For any* combination of `status` and `severity` filter values, every Alert returned by `GET /api/v1/alerts` must have a `status` and `severity` that exactly matches those filter values, and results must be ordered by `created_at` descending.

**Validates: Requirements 5.1**

---

### Property 11: Alert status round-trip

*For any* open Alert and any valid status transition (`open → acknowledged`, `open → resolved`, `acknowledged → resolved`), calling `PATCH /alerts/{id}` and then `GET /alerts` must return that Alert with the new status.

**Validates: Requirements 5.2**

---

### Property 12: Critical alert flight-surgeon flag

*For any* Alert with `severity = "critical"` returned by any alert endpoint, the JSON object must include `flight_surgeon_contact: true`.

**Validates: Requirements 5.4**

---

### Property 13: WebSocket fan-out

*For any* crew_id and *any* number of active WebSocket connections registered for that crew_id, every connection must receive the serialized Alert JSON when `ConnectionManager.publish` is called with that crew_id.

**Validates: Requirements 6.2**

---

### Property 14: Trend band formula

*For any* metric with a Baseline (mean M, std_dev S), the `band` object returned by `GET /api/v1/trends/{metric}` must satisfy `band.lower = M − 2×S` and `band.upper = M + 2×S`.

**Validates: Requirements 7.1**

---

### Property 15: Guidance tag matching (case-insensitive substring)

*For any* guidance query string (topic or `metric + severity` from an alert), every GuidanceArticle returned must have at least one element in its `trigger_tags` array that is a case-insensitive substring of the query string; no article without such a tag may appear in the results.

**Validates: Requirements 8.1, 8.2, 8.5**

---

### Property 16: Reminder creation ownership

*For any* valid reminder creation payload submitted with JWT for crew member C, the resulting Reminder record must have `crew_id = C` matching the JWT `sub` claim, regardless of any `crew_id` supplied in the request body.

**Validates: Requirements 9.2**

---

### Property 17: Reminder update round-trip

*For any* Reminder owned by the authenticated crew member, PATCHing `enabled` or `last_done_at` and then fetching the reminder must return the exact updated values.

**Validates: Requirements 9.3**

---

### Property 18: Environment critical alert triggering

*For any* `EnvironmentReading` where `co2_ppm > 5000`, `o2_pct < 16.0`, or `radiation_usv > 1000`, the Alert Engine must insert a critical Alert with `metric` set to the offending field name.

**Validates: Requirements 10.3**

---

### Property 19: IndexedDB UUID generation on add

*For any* call to any IndexedDB repository `add` method without a supplied `id`, the resulting record must have a valid UUID v4 as its `id` and an `updated_at` set to the current UTC timestamp.

**Validates: Requirements 12.8**

---

### Property 20: Zustand login/logout symmetry

*For any* (crewId, role, token) triple, calling `login` followed by `logout` must result in `isAuthenticated = false`, `token = null`, and no JWT remaining in `localStorage`.

**Validates: Requirements 13.2**

---

### Property 21: Token expiry restore

*For any* JWT stored in `localStorage`, the Zustand store must restore `isAuthenticated = true` on startup if and only if the token's `exp` claim is in the future; expired tokens must be discarded.

**Validates: Requirements 13.3**

---

### Property 22: API client JWT attachment

*For any* non-login API call, the outgoing HTTP request must include an `Authorization: Bearer <token>` header whose value matches the token currently held in the Zustand store.

**Validates: Requirements 14.2**

---

### Property 23: API client error propagation

*For any* HTTP response with a non-2xx status code, `apiClient` must throw an `ApiError` whose `status` matches the HTTP status code and whose `detail` matches the `detail` field parsed from the response body.

**Validates: Requirements 14.4**

---

### Property 24: Offline queue enqueue on write

*For any* call to any IndexedDB repository `add` or `updateStatus` method that succeeds, a corresponding entry must appear in `sync_queue` with `synced_at = null` and `entity_id` matching the written record's `id`.

**Validates: Requirements 15.1**

---

### Property 25: Sync batch size invariant

*For any* set of pending sync queue items, `pushPendingItems` must send them to the server in batches where every batch contains at most 50 items.

**Validates: Requirements 15.2**

---

### Property 26: Last-write-wins conflict resolution

*For any* pair of local and server records with the same `id`, after sync the retained record must be the one with the strictly later `updated_at` timestamp.

**Validates: Requirements 15.4**

---

### Property 27: Pull merge skips newer local records

*For any* record returned by `GET /sync/pull`, if the local copy has an `updated_at` strictly later than the server record's `updated_at`, the local copy must remain unchanged after the pull.

**Validates: Requirements 15.5**

---

### Property 28: Auth guard redirect

*For any* route other than `/login` and *any* application state where `isAuthenticated = false`, navigating to that route must result in a redirect to `/login` without rendering the requested route's content.

**Validates: Requirements 20.2**
