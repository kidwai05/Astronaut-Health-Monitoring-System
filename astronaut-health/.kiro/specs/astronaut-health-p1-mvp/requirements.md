# Requirements Document

## Introduction

This document covers the P1 MVP completion for the Astronaut Health Monitoring System — a decision-support application for spaceflight crews to log and monitor personal health vitals, receive rule-based alerts, and access contextual guidance. The system operates offline-first on a React/TypeScript/Dexie.js frontend backed by a Python/FastAPI/SQLAlchemy server. Work in scope: the alert engine (threshold, baseline-deviation, and trend rules), all remaining stub API routes, the guidance service, shared alert-rule and test-vector JSON files, and all stub frontend files (login, page wrappers, IndexedDB schema, Dexie repositories, Zustand store, API client, sync layer, and routing). Items already implemented — `HomeDashboard.tsx`, `QuickLog.tsx`, `baseline_service.py`, `sync_service.py`, all DB models, `measurements.py`, `crew.py`, `security.py`, and `main.py` — are excluded.

## Glossary

- **Alert_Engine**: The backend subsystem (`engine.py`, `threshold.py`, `baseline_dev.py`, `trend.py`) that evaluates alert rules against incoming measurements and writes `Alert` records.
- **Alert_Rule**: A persisted rule record in `alert_rules` table specifying metric, rule type, params, severity, and enabled flag.
- **Alert**: A persisted record in the `alerts` table representing a triggered health finding for a crew member.
- **API_Client**: The typed fetch wrapper (`api/client.ts`) used by all frontend pages to communicate with the FastAPI backend.
- **Auth_API**: The `/api/v1/auth` endpoint that authenticates a crew member by PIN and returns a signed JWT.
- **Baseline**: The personal statistical baseline for a crew member's metric computed by `baseline_service.py` over the first `baseline_days` days of data.
- **Baseline_Deviation_Rule**: An alert rule type that fires when a new measurement's z-score relative to the crew member's personal Baseline exceeds a configured threshold.
- **Conflict_Resolver**: The `sync/conflict.ts` module that applies last-write-wins logic when merging server and local records.
- **CrewMember**: A record in the `crew_members` table representing one astronaut or flight surgeon.
- **Dashboard_API**: The `/api/v1/dashboard/summary` endpoint that returns the latest vital values, per-metric status, open alert count, and daily streak.
- **Dexie_DB**: The IndexedDB database instance defined in `db/schema.ts` using the Dexie.js library.
- **Flight_Surgeon**: A crew member with `role = "flight_surgeon"` who has read access to all crew members' data.
- **Guidance_Article**: A persisted record in `guidance_articles` providing contextual health information linked to an alert topic.
- **Guidance_Service**: The backend service (`guidance_service.py`) that maps alert topics and trigger tags to Guidance_Articles.
- **IndexedDB_Repository**: One of the Dexie repository modules under `db/repositories/` providing typed offline CRUD for a single entity.
- **JWT**: A JSON Web Token signed with `Settings.secret_key` using HS256, encoding `sub` (crew_id), `role`, and `exp` (60-minute expiry).
- **Measurement**: A single vital-sign reading in the `measurements` table (metric, value, unit, source, recorded_at).
- **Offline_Queue**: The `sync/syncQueue.ts` module that buffers writes made without a network connection for later upload.
- **Push_Pull**: The `sync/pushPull.ts` module that calls `POST /sync/push` and `GET /sync/pull` to synchronize local and server state.
- **Reminder**: A scheduled health task record in the `reminders` table tied to a crew member.
- **Settings**: The Pydantic `Settings` class in `app/config.py` whose fields are loaded from environment variables.
- **Sync_API**: The `/api/v1/sync` endpoints (`POST /push`, `GET /pull`) already implemented in `sync.py`.
- **Threshold_Rule**: An alert rule type that fires when a measurement value crosses an absolute upper or lower boundary defined in `default_rules.json`.
- **Trend_Rule**: An alert rule type that fires when a metric shows a monotone directional change over a configurable number of consecutive readings.
- **Zustand_Store**: The global React state store (`useAppStore.ts`) holding authenticated crew identity, alert counts, connectivity status, and reminder state.

---

## Requirements

### Requirement 1: Alert Rule Data Files

**User Story:** As a flight surgeon, I want concrete, medically grounded threshold values and representative test cases defined in shared JSON files, so that the alert engine and frontend alert evaluation both use identical, reviewable rules.

#### Acceptance Criteria

1. THE Alert_Engine SHALL load alert rules exclusively from `shared/alert-rules/default_rules.json` at startup, never from hard-coded constants in Python source files.
2. THE Alert_Engine SHALL validate `default_rules.json` against `shared/alert-rules/schema.json` at startup and raise a `ValueError` if any rule fails schema validation.
3. THE `default_rules.json` file SHALL contain at least one Threshold_Rule for each of the following metrics with the specified default boundaries: `heart_rate` (critical low < 40 bpm, warning low < 50 bpm, warning high > 110 bpm, critical high > 150 bpm), `blood_pressure_systolic` (warning low < 90 mmHg, warning high > 140 mmHg, critical high > 180 mmHg), `blood_pressure_diastolic` (warning high > 90 mmHg, critical high > 120 mmHg), `glucose` (warning low < 70 mg/dL, critical low < 54 mg/dL, warning high > 180 mg/dL, critical high > 250 mg/dL), `temperature_c` (warning low < 35.0 °C, critical low < 34.0 °C, warning high > 38.0 °C, critical high > 39.5 °C), `spo2` (warning low < 94 %, critical low < 90 %), `co2_ppm` (warning high > 2000 ppm, critical high > 5000 ppm), `o2_pct` (warning low < 19.5 %, critical low < 16.0 %).
4. THE `default_rules.json` file SHALL contain at least one Baseline_Deviation_Rule for metrics `heart_rate`, `blood_pressure_systolic`, `glucose`, `temperature_c`, and `spo2`, each with a `z_score_threshold` of 2.0 for severity `caution` and 3.0 for severity `warning`.
5. THE `default_rules.json` file SHALL contain at least one Trend_Rule for metrics `heart_rate`, `glucose`, and `spo2`, each with a `window` of 5 consecutive readings and a monotone direction of `rising` or `falling` as appropriate.
6. THE `shared/test-vectors/alert_cases.json` file SHALL contain at least one test case per rule entry in `default_rules.json`, each test case specifying `input` (metric, value, baseline_mean, baseline_std_dev, recent_readings), `expected_alerts` (array of objects with rule_type, metric, severity), and `description`.
7. WHEN a test case in `alert_cases.json` is executed by both pytest and vitest, THE Alert_Engine and the frontend alert evaluation SHALL produce identical `expected_alerts` arrays for that test case.

---

### Requirement 2: Alert Engine Implementation

**User Story:** As a crew member, I want the system to automatically evaluate each new measurement against all active rules, so that I am notified of clinically significant deviations without manual review.

#### Acceptance Criteria

1. WHEN a new Measurement is persisted to the database, THE Alert_Engine SHALL evaluate all enabled Alert_Rules whose `metric` matches the measurement's `metric` within the same database transaction.
2. WHEN a Threshold_Rule is evaluated and the measurement value is outside the rule's configured boundaries, THE Alert_Engine SHALL insert an Alert record with the correct `crew_id`, `metric`, `severity`, `message`, and `triggered_by_rule` fields.
3. WHEN a Baseline_Deviation_Rule is evaluated and the crew member's Baseline for that metric exists with `sample_size >= 3`, THE Alert_Engine SHALL compute the z-score as `(value − mean) / std_dev` and insert an Alert if the absolute z-score meets or exceeds `z_score_threshold`.
4. IF a Baseline_Deviation_Rule is evaluated and no Baseline exists for the crew member and metric, THEN THE Alert_Engine SHALL skip the rule without raising an exception.
5. WHEN a Trend_Rule is evaluated, THE Alert_Engine SHALL retrieve the most recent `window` measurements (inclusive of the current one) ordered by `recorded_at` ascending and insert an Alert only when every consecutive pair shows a change in the configured direction.
6. WHEN the Alert_Engine inserts an Alert with severity `critical`, THE Alert_Engine SHALL immediately publish a WebSocket message to the crew member's alert channel with the full Alert payload.
7. WHEN the Alert_Engine inserts any Alert, THE Alert_Engine SHALL deduplicate: if an open Alert with the same `crew_id`, `metric`, and `triggered_by_rule` already exists, THE Alert_Engine SHALL update that record's `message` and `updated_at` rather than inserting a duplicate.
8. THE Alert_Engine SHALL complete evaluation and all database writes for a single measurement within 500 ms on the development host.

---

### Requirement 3: Auth API and JWT Configuration

**User Story:** As a crew member, I want to authenticate with my crew card and PIN, so that the system identifies me and issues a session token that restricts access to my own data.

#### Acceptance Criteria

1. THE `Settings` class SHALL include a `secret_key` field of type `str` with no default value, loaded from the `SECRET_KEY` environment variable, and THE FastAPI application SHALL raise a `ValidationError` at startup if `SECRET_KEY` is absent.
2. WHEN `POST /api/v1/auth/login` receives a JSON body with `crew_id` (string) and `pin` (string), THE Auth_API SHALL retrieve the CrewMember record and call `security.verify_pin(pin, crew_member.pin_hash)`.
3. IF `security.verify_pin` returns `False` or no CrewMember with the given `crew_id` exists, THEN THE Auth_API SHALL return HTTP 401 with a JSON body `{"detail": "Invalid credentials"}`.
4. WHEN `security.verify_pin` returns `True`, THE Auth_API SHALL generate a JWT signed with `Settings.secret_key` using algorithm HS256, encoding claims `{"sub": crew_id, "role": crew_member.role, "exp": <utcnow + 3600 seconds>}`, and return HTTP 200 with body `{"access_token": "<jwt>", "token_type": "bearer", "crew_id": crew_id, "role": crew_member.role}`.
5. WHEN any protected API endpoint receives a request without a valid Bearer JWT in the `Authorization` header, THE API SHALL return HTTP 401.
6. WHEN a JWT-authenticated request arrives for a crew-scoped resource with a `crew_id` path or query parameter that does not match the token's `sub` claim, THE API SHALL return HTTP 403 unless the token's `role` is `"flight_surgeon"`.

---

### Requirement 4: Dashboard API

**User Story:** As a crew member, I want a single endpoint that returns all the data my home screen needs, so that the HomePage loads with one network request.

#### Acceptance Criteria

1. WHEN `GET /api/v1/dashboard/summary` is called with a valid JWT, THE Dashboard_API SHALL return a JSON object containing `latest_vitals` (array of objects with `metric`, `value`, `unit`, `recorded_at`, `status`), `open_alert_count` (integer), `open_alerts` (array of the five most recent open Alert records), `today_reminders` (array of Reminder records due today), and `streak_days` (integer count of consecutive calendar days with at least one Measurement).
2. WHEN computing `status` for each entry in `latest_vitals`, THE Dashboard_API SHALL classify the value as `"normal"`, `"caution"`, `"warning"`, or `"critical"` by evaluating the value against enabled Threshold_Rules for that metric.
3. WHEN no Measurement exists for a metric, THE Dashboard_API SHALL omit that metric from `latest_vitals`.
4. THE Dashboard_API SHALL respond within 800 ms for a crew member with up to 10 000 Measurement records.

---

### Requirement 5: Alerts API

**User Story:** As a crew member, I want to view, acknowledge, and resolve my alerts, so that I can track which findings I have acted on.

#### Acceptance Criteria

1. WHEN `GET /api/v1/alerts` is called with a valid JWT, THE Alerts API SHALL return all Alert records for the authenticated crew member ordered by `created_at` descending, filtered by optional query parameters `status` (`open` | `acknowledged` | `resolved`) and `severity` (`info` | `caution` | `warning` | `critical`).
2. WHEN `PATCH /api/v1/alerts/{id}` is called with body `{"status": "acknowledged"}` or `{"status": "resolved"}`, THE Alerts API SHALL update the Alert's `status` field and return the updated Alert record.
3. IF `PATCH /api/v1/alerts/{id}` is called with a status transition from `"resolved"` to any other status, THEN THE Alerts API SHALL return HTTP 422.
4. WHEN an Alert with severity `"critical"` is returned by any alert endpoint, THE Alerts API SHALL include a `flight_surgeon_contact` field set to `true` in that Alert's JSON object.

---

### Requirement 6: WebSocket Alert Stream

**User Story:** As a crew member with the app open, I want new alerts delivered to my screen in real time without polling, so that I see critical findings immediately.

#### Acceptance Criteria

1. WHEN a client connects to `WS /api/v1/ws/alerts` with a valid JWT as a query parameter `token`, THE WebSocket endpoint SHALL accept the connection and register the client in an in-process connection manager keyed by `crew_id`.
2. WHEN the Alert_Engine publishes an Alert for `crew_id`, THE WebSocket endpoint SHALL deliver the serialized Alert JSON to all active WebSocket connections registered for that `crew_id`.
3. WHEN a WebSocket client disconnects, THE WebSocket endpoint SHALL remove the connection from the manager without raising an exception.
4. WHEN a WebSocket connection request arrives with a missing or invalid `token` query parameter, THE WebSocket endpoint SHALL close the connection with code 4001.

---

### Requirement 7: Trends API

**User Story:** As a crew member, I want to view a metric's time-series values with my personal baseline band overlaid, so that I can judge whether a reading is unusual for me specifically.

#### Acceptance Criteria

1. WHEN `GET /api/v1/trends/{metric}` is called with a valid JWT and optional query parameter `window` (default `"7d"`, accepted values `"7d"`, `"14d"`, `"30d"`), THE Trends API SHALL return a JSON object with `readings` (array of `{recorded_at, value}` objects), `baseline` (object with `mean`, `std_dev`, `min`, `max`), and `band` (object with `lower` = mean − 2 × std_dev, `upper` = mean + 2 × std_dev).
2. IF no Baseline exists for the crew member and metric, THEN THE Trends API SHALL return `"baseline": null` and `"band": null` without an error.
3. WHEN `window` is not one of the accepted values, THE Trends API SHALL return HTTP 422.

---

### Requirement 8: Guidance API and Service

**User Story:** As a crew member, I want to read actionable health guidance linked to an alert or topic, so that I know what to do when a measurement is flagged.

#### Acceptance Criteria

1. WHEN `GET /api/v1/guidance` is called with query parameter `alert_id` and a valid JWT, THE Guidance_Service SHALL retrieve the Alert, extract its `metric` and `severity` as topic and trigger tags, and return all matching Guidance_Articles ordered by `severity_level` descending.
2. WHEN `GET /api/v1/guidance` is called with query parameter `topic` and a valid JWT, THE Guidance_Service SHALL return all Guidance_Articles whose `topic` matches the parameter value, ordered by `severity_level` descending.
3. IF neither `alert_id` nor `topic` is provided, THEN THE Guidance API SHALL return HTTP 422.
4. WHEN no Guidance_Article matches the query, THE Guidance API SHALL return an empty array with HTTP 200.
5. THE Guidance_Service SHALL match articles by checking whether any element in the article's `trigger_tags` array is a case-insensitive substring of the concatenated `topic` and `severity` search string.

---

### Requirement 9: Reminders API

**User Story:** As a crew member, I want to manage my scheduled health reminders, so that the system prompts me to log vitals, hydrate, and exercise at the right times.

#### Acceptance Criteria

1. WHEN `GET /api/v1/reminders` is called with a valid JWT, THE Reminders API SHALL return all Reminder records for the authenticated crew member.
2. WHEN `POST /api/v1/reminders` is called with a valid JWT and a JSON body containing `type` (string, max 30 chars) and `schedule` (non-empty string, max 60 chars), THE Reminders API SHALL insert a Reminder record with `crew_id` from the JWT and return HTTP 201 with the created record.
3. WHEN `PATCH /api/v1/reminders/{id}` is called with body `{"enabled": false}` or `{"last_done_at": "<iso8601>"}`, THE Reminders API SHALL update the specified fields and return the updated Reminder.
4. IF `PATCH /api/v1/reminders/{id}` targets a Reminder that does not belong to the authenticated crew member, THEN THE Reminders API SHALL return HTTP 403.

---

### Requirement 10: Environment API

**User Story:** As a crew member, I want to log and view habitat environmental readings, so that I can correlate health changes with environmental factors.

#### Acceptance Criteria

1. WHEN `POST /api/v1/environment` is called with a valid JWT and a JSON body containing at least one of `co2_ppm`, `o2_pct`, `temperature_c`, `humidity_pct`, `noise_db`, `radiation_usv`, or `location`, THE Environment API SHALL insert an `EnvironmentReading` record and return HTTP 201.
2. WHEN `GET /api/v1/environment` is called with a valid JWT and optional query parameters `from` (ISO 8601 datetime) and `to` (ISO 8601 datetime), THE Environment API SHALL return all EnvironmentReading records within the specified time range ordered by `recorded_at` descending, limited to 500 records.
3. WHEN any `EnvironmentReading` field exceeds a critical threshold (`co2_ppm > 5000`, `o2_pct < 16.0`, `radiation_usv` single-reading > 1000 µSv), THE Alert_Engine SHALL insert a critical Alert with `metric` set to the offending field name.

---

### Requirement 11: Reports API

**User Story:** As a flight surgeon, I want to export a crew member's health records as PDF or CSV, so that I can include them in mission health reports.

#### Acceptance Criteria

1. WHEN `GET /api/v1/reports/export` is called with a valid JWT for a user with `role = "flight_surgeon"`, query parameter `crew_id`, and `format` (`"csv"` or `"pdf"`), THE Reports API SHALL generate and return the report file with the appropriate Content-Type header (`text/csv` or `application/pdf`).
2. IF `GET /api/v1/reports/export` is called with `role != "flight_surgeon"`, THEN THE Reports API SHALL return HTTP 403.
3. THE Reports API SHALL include Measurement records, SleepLog records, MoodLog records, SymptomLog records, and ExerciseLog records for the requested crew member within optional `from` / `to` date range query parameters.
4. WHEN `format` is not `"csv"` or `"pdf"`, THE Reports API SHALL return HTTP 422.

---

### Requirement 12: IndexedDB Schema and Repositories

**User Story:** As a crew member without network connectivity, I want my health data stored locally on-device in a typed, queryable database, so that logging and reviewing records always works regardless of connectivity.

#### Acceptance Criteria

1. THE `db/schema.ts` file SHALL define a Dexie_DB instance with version 1 stores for `measurements`, `sleep_logs`, `mood_logs`, `symptom_logs`, `exercise_logs`, `alerts`, `reminders`, and `sync_queue`, each indexed on `id` (primary key, UUID string) and `crew_id` where the entity is crew-scoped.
2. THE `measurements` store SHALL additionally index `[crew_id+metric]` and `recorded_at` to support efficient metric-scoped time-range queries.
3. THE `alerts` store SHALL additionally index `[crew_id+status]` and `created_at`.
4. THE `sync_queue` store SHALL index `synced_at` to allow querying all unsynced records (where `synced_at` is null).
5. THE `db/repositories/measurements.ts` IndexedDB_Repository SHALL expose `add(record)`, `listForCrew(crewId, metric?, from?, to?, limit?)`, `getLatestPerMetric(crewId)`, and `markSynced(id)` methods, each returning typed Promises.
6. THE `db/repositories/alerts.ts` IndexedDB_Repository SHALL expose `add(record)`, `listForCrew(crewId, status?, severity?)`, `updateStatus(id, status)`, and `markSynced(id)` methods.
7. THE `db/repositories/sleep.ts`, `db/repositories/mood.ts`, and `db/repositories/symptoms.ts` IndexedDB_Repository files SHALL each expose `add(record)`, `listForCrew(crewId, from?, to?, limit?)`, and `markSynced(id)` methods.
8. WHEN any IndexedDB_Repository `add` method is called, THE IndexedDB_Repository SHALL generate a client-side UUID v4 for `id` if no `id` is supplied and SHALL set `updated_at` to the current UTC timestamp.

---

### Requirement 13: Zustand Store

**User Story:** As a frontend developer, I want a single reactive store that holds authentication state, alert counts, connectivity status, and reminder data, so that all pages derive their state from one source without prop drilling.

#### Acceptance Criteria

1. THE Zustand_Store SHALL hold the following slices: `auth` (`crewId`, `role`, `token`, `isAuthenticated`), `alerts` (`openCount`, `criticalPending`), `connectivity` (`isOnline`), and `reminders` (`items`, `completedToday`).
2. THE Zustand_Store SHALL expose `login(crewId, role, token)` and `logout()` actions; `login` SHALL set `isAuthenticated = true` and persist `token` to `localStorage`; `logout` SHALL clear all auth fields and remove the token from `localStorage`.
3. WHEN the application initialises, THE Zustand_Store SHALL read any previously stored token from `localStorage` and restore the `auth` slice if the token's `exp` claim is in the future.
4. THE Zustand_Store SHALL expose `setOnline(value: boolean)` and `incrementOpenAlerts(count: number)` actions.
5. WHEN `criticalPending` becomes `true`, THE Zustand_Store SHALL not automatically clear it; a separate `dismissCritical()` action is required to set it to `false`.

---

### Requirement 14: API Client

**User Story:** As a frontend developer, I want a typed HTTP client that automatically attaches the JWT, retries on 401 by clearing auth, and surfaces typed errors, so that all pages share consistent authentication and error handling.

#### Acceptance Criteria

1. THE API_Client SHALL export typed functions covering at minimum: `login(crewId, pin)`, `getDashboardSummary()`, `getAlerts(filters?)`, `patchAlert(id, status)`, `getMeasurements(crewId, filters?)`, `postMeasurement(payload)`, `getTrends(metric, window?)`, `getGuidance(params)`, `getReminders()`, `patchReminder(id, payload)`, and `syncPush(items)` / `syncPull(since?)`.
2. THE API_Client SHALL read the JWT from the Zustand_Store `auth.token` field and attach it as `Authorization: Bearer <token>` to every request except `login`.
3. WHEN the server returns HTTP 401 on any non-login request, THE API_Client SHALL call `useAppStore.getState().logout()` and throw an `AuthError` so the router can redirect to the login page.
4. WHEN the server returns a non-2xx response, THE API_Client SHALL throw an `ApiError` containing the HTTP status code and the parsed `detail` field from the response body.
5. THE API_Client SHALL set a request timeout of 10 000 ms for all calls and throw a `TimeoutError` if the response does not arrive within that window.

---

### Requirement 15: Sync Layer

**User Story:** As a crew member using the app in low-connectivity conditions, I want all local writes buffered and automatically uploaded when the network is available, so that no data is lost during communication blackouts.

#### Acceptance Criteria

1. WHEN a record is written to any IndexedDB_Repository, THE Offline_Queue SHALL add a corresponding entry with fields `entity`, `entity_id`, `operation` (`"upsert"` or `"delete"`), `payload`, and `updated_at`, with `synced_at = null`.
2. WHEN `useConnectivity.ts` reports `isOnline = true` and the Offline_Queue contains records with `synced_at = null`, THE Push_Pull module SHALL call `POST /api/v1/sync/push` with those records in batches of at most 50.
3. WHEN the server returns `{"status": "applied"}` for a sync item, THE Offline_Queue SHALL set `synced_at` to the current UTC timestamp for that item.
4. WHEN the server returns `{"status": "stale"}` for a sync item, THE Conflict_Resolver SHALL apply last-write-wins by comparing the item's `updated_at` with the server's copy and retaining the record with the later timestamp.
5. WHEN `GET /api/v1/sync/pull` returns changed records, THE Push_Pull module SHALL call the appropriate IndexedDB_Repository's `add` or `updateStatus` method for each changed record, skipping any record whose local `updated_at` is newer than the server record's `updated_at`.
6. WHEN any sync HTTP call fails with a network error or timeout, THE Push_Pull module SHALL log the error and schedule a retry after 30 seconds without blocking the user interface.

---

### Requirement 16: Login Page

**User Story:** As a crew member, I want to select my crew card and enter my PIN to log in, so that the system identifies me and loads my personal health data.

#### Acceptance Criteria

1. WHEN `LoginPage` mounts, THE LoginPage SHALL call `GET /api/v1/crew` and render one selectable card per returned CrewMember showing name, role, and job title.
2. WHEN a crew card is selected, THE LoginPage SHALL reveal a PIN pad with digits 0–9, a backspace button, and a confirm button.
3. WHEN the confirm button is tapped with a PIN of 4 to 8 digits, THE LoginPage SHALL call `API_Client.login(crewId, pin)`, and on success SHALL call `useAppStore.login(crewId, role, token)` and navigate to the home route.
4. IF `API_Client.login` returns an `AuthError`, THEN THE LoginPage SHALL display the message "Incorrect PIN. Try again." and clear the PIN input without navigating.
5. THE LoginPage SHALL display the disclaimer "Decision support only. Not a medical diagnosis." at the bottom of the screen.
6. WHILE a login request is in flight, THE LoginPage SHALL disable the confirm button and show a loading indicator on it.

---

### Requirement 17: Home Page

**User Story:** As a crew member, I want my home screen to show live data from the server and my local store, so that I see an accurate health overview immediately on opening the app.

#### Acceptance Criteria

1. WHEN `HomePage` mounts and `isAuthenticated` is `true`, THE HomePage SHALL call `API_Client.getDashboardSummary()` and pass the result to the `HomeDashboard` component as props.
2. WHEN `getDashboardSummary` succeeds, THE HomePage SHALL update the Zustand_Store `alerts.openCount` with the value from `open_alert_count`.
3. WHEN `getDashboardSummary` fails with a network error and `isOnline` is `false`, THE HomePage SHALL render the `HomeDashboard` component using the most recent data cached in `IndexedDB` measurements without displaying an error state.
4. WHEN `getDashboardSummary` fails with a non-network API error, THE HomePage SHALL display an inline error message below the status banner.
5. WHEN a WebSocket message arrives on the alert channel, THE HomePage SHALL increment the Zustand_Store `alerts.openCount` and set `criticalPending = true` if the alert severity is `"critical"`.
6. WHILE `criticalPending` is `true`, THE HomePage SHALL render a full-screen overlay containing the message "Contact flight surgeon now" and a dismiss button that calls `useAppStore.dismissCritical()`.

---

### Requirement 18: Quick Log Page

**User Story:** As a crew member, I want the Quick Log screen to save my vitals locally first and queue them for server sync, so that logging succeeds regardless of network state.

#### Acceptance Criteria

1. WHEN `QuickLogPage` mounts, THE QuickLogPage SHALL pass the `HomeDashboard`-compatible `onNotify` and `onNavigateHome` callbacks to the `QuickLog` component and retrieve the last recorded value for each metric from `IndexedDB` to pre-populate the "Last value" display text in `QuickLog`.
2. WHEN the `QuickLog` component invokes its save action, THE QuickLogPage SHALL call the `measurements` IndexedDB_Repository `add` method for each metric with a non-null value, using the current UTC timestamp as `recorded_at` and `"manual"` as source.
3. WHEN the IndexedDB write succeeds, THE QuickLogPage SHALL add each saved measurement to the Offline_Queue for server sync.
4. WHEN the device is online at save time and the sync queue flush completes successfully, THE QuickLogPage SHALL call `POST /api/v1/measurements` directly for each measurement and update the local record's `synced_at` on success.
5. IF a saved measurement triggers an alert response from the server (returned in the POST response or via WebSocket), THEN THE QuickLogPage SHALL pass the alert severity and message to the `QuickLog` component's result bottom sheet.

---

### Requirement 19: Alerts Page

**User Story:** As a crew member, I want to view all my alerts grouped by severity, acknowledge findings I have reviewed, and access linked guidance, so that I can manage my health findings systematically.

#### Acceptance Criteria

1. WHEN `AlertsPage` mounts, THE AlertsPage SHALL call `API_Client.getAlerts()` and render alerts grouped into sections by severity (`critical`, `warning`, `caution`, `info`) with a count badge on each section header.
2. WHEN an alert row is tapped, THE AlertsPage SHALL expand an inline detail panel showing `message`, `created_at`, the triggering rule type, and a "See guidance" link that navigates to the guidance screen with `alert_id` as a query parameter.
3. WHEN the user taps "Acknowledge" on an open alert, THE AlertsPage SHALL call `API_Client.patchAlert(id, "acknowledged")` and update the row's status indicator optimistically before the response arrives.
4. WHEN the user taps "Resolve" on an acknowledged alert, THE AlertsPage SHALL call `API_Client.patchAlert(id, "resolved")` and move the row to a collapsed "Resolved" section at the bottom.
5. WHEN any alert with severity `"critical"` is present in the list, THE AlertsPage SHALL display a persistent banner at the top reading "Contact flight surgeon now" until all critical alerts are acknowledged or resolved.
6. THE AlertsPage SHALL display the disclaimer "Decision support only. Not a medical diagnosis." at the bottom of the screen.

---

### Requirement 20: Routing and Auth Guard

**User Story:** As a user, I want unauthenticated users redirected to the login screen and connectivity status visible on every screen, so that the app is always secure and informative about its network state.

#### Acceptance Criteria

1. THE `routes.tsx` file SHALL define routes for at minimum: `/login` → `LoginPage`, `/` → `HomePage`, `/log` → `QuickLogPage`, `/alerts` → `AlertsPage`, each with a consistent tab-bar or navigation shell.
2. WHEN any route other than `/login` is accessed and `useAppStore.auth.isAuthenticated` is `false`, THE router SHALL redirect to `/login` without rendering the requested route.
3. WHEN `useAppStore.auth.isAuthenticated` becomes `false` during an active session (e.g., after `logout()` or token expiry), THE router SHALL navigate to `/login` and clear any cached route state.
4. WHILE `isOnline` is `false`, THE routing shell SHALL render a non-blocking banner reading "Offline — data saved locally" on every screen.
5. THE routing shell SHALL wrap all routes in a React error boundary that catches unhandled errors, logs them to the console, and displays "Something went wrong. Restart the app." without a stack trace visible to the user.
