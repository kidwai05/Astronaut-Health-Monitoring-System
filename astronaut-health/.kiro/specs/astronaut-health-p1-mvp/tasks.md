# Implementation Plan: Astronaut Health Monitoring System — P1 MVP

## Overview

The existing codebase already ships `HomeDashboard.tsx`, `QuickLog.tsx`, `baseline_service.py`, `sync_service.py`, all SQLAlchemy DB models, `measurements.py`, `crew.py`, `security.py`, and `main.py`. Every other file targeted by the P1 MVP spec exists only as a one-line comment stub.

This plan fills those stubs in dependency order: shared data files first, then the backend alert engine, auth/JWT layer, remaining API routes, then the frontend offline layer, state management, sync, page wrappers, and routing. Alert-engine tests (pytest + vitest consuming the shared test vectors) close the plan.

---

## Tasks

- [x] 1. Shared alert-rule schema and default rules
  - [x] 1.1 Write `shared/alert-rules/schema.json`
    - Define JSON Schema draft-07 validating each rule object; `required` fields: `id`, `metric`, `rule_type` (`threshold|baseline_deviation|trend`), `severity` (`info|caution|warning|critical`), `enabled`, `params`
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Write `shared/alert-rules/default_rules.json`
    - Populate the array with all Threshold_Rules for `heart_rate`, `blood_pressure_systolic`, `blood_pressure_diastolic`, `glucose`, `temperature_c`, `spo2`, `co2_ppm`, `o2_pct` with the exact boundary values from Requirement 1.3
    - Add Baseline_Deviation_Rules for `heart_rate`, `blood_pressure_systolic`, `glucose`, `temperature_c`, `spo2` with `z_score_threshold` 2.0 (caution) and 3.0 (warning) per Requirement 1.4
    - Add Trend_Rules for `heart_rate`, `glucose`, `spo2` with `window=5` and direction per Requirement 1.5
    - _Requirements: 1.3, 1.4, 1.5_

  - [x] 1.3 Write `shared/test-vectors/alert_cases.json`
    - Provide at least one test case per rule entry; each case must include `description`, `rule_id`, `input` (`metric`, `value`, `baseline_mean`, `baseline_std_dev`, `recent_readings`), and `expected_alerts` (`rule_type`, `metric`, `severity`)
    - _Requirements: 1.6, 1.7_

- [x] 2. Backend alert engine package
  - [x] 2.1 Implement `app/services/alert_engine/loader.py` — `AlertRuleLoader`
    - Read and validate `default_rules.json` against `schema.json` using `jsonschema`; raise `ValueError` on any failed validation; expose `rules_for_metric(metric)` returning only enabled rules
    - Create `app/services/alert_engine/__init__.py` exporting `AlertEngine`
    - _Requirements: 1.1, 1.2_

  - [x] 2.2 Implement `app/services/alert_engine/threshold.py` — `ThresholdEvaluator`
    - Pure-function `evaluate(rule, value)` checking each boundary (`below` / `above`); return `True` on first match
    - _Requirements: 2.2_

  - [ ]* 2.3 Write property test for `ThresholdEvaluator`
    - **Property 3: Threshold alert correctness**
    - **Validates: Requirements 2.2**
    - File: `backend/tests/unit/test_threshold_property.py` using Hypothesis `@given`

  - [x] 2.4 Implement `app/services/alert_engine/baseline_dev.py` — `BaselineDeviationEvaluator`
    - Pure-function `evaluate(rule, value, mean, std_dev)`: return `False` when `std_dev == 0`; compute `z = (value − mean) / std_dev`; return `abs(z) >= rule["params"]["z_score_threshold"]`
    - _Requirements: 2.3, 2.4_

  - [ ]* 2.5 Write property test for `BaselineDeviationEvaluator`
    - **Property 4: Baseline deviation z-score correctness**
    - **Validates: Requirements 2.3**
    - File: `backend/tests/unit/test_baseline_dev_property.py`

  - [x] 2.6 Implement `app/services/alert_engine/trend.py` — `TrendEvaluator`
    - Pure-function `evaluate(rule, recent_values)`: return `False` when `len < window`; iterate last `window` pairs verifying strict monotone direction (`rising` → `b > a`, `falling` → `b < a`)
    - _Requirements: 2.5_

  - [ ]* 2.7 Write property test for `TrendEvaluator`
    - **Property 5: Trend detection correctness**
    - **Validates: Requirements 2.5**
    - File: `backend/tests/unit/test_trend_property.py`

  - [x] 2.8 Implement `app/services/alert_engine/engine.py` — `AlertEngine`
    - `evaluate(measurement, db)`: load rules via `AlertRuleLoader.rules_for_metric`; dispatch to the three evaluators; deduplicate alerts (update `message`/`updated_at` on existing open alert, insert new otherwise per Requirement 2.7); publish to `connection_manager` via `asyncio.create_task` for `critical` severity; complete within 500 ms (Requirement 2.8)
    - Instantiate and store singleton on `app.state.alert_engine` in `main.py` lifespan; add `_seed_alert_rules` helper to seed `AlertRule` table from JSON on startup
    - Hook `AlertEngine.evaluate` into the existing `measurements.py` POST path within the same DB transaction (Requirement 2.1)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ]* 2.9 Write property test for `AlertEngine` deduplication
    - **Property 6: Alert deduplication (idempotence)**
    - **Validates: Requirements 2.7**
    - File: `backend/tests/unit/test_engine_dedup_property.py`

- [x] 3. Backend auth and JWT configuration
  - [x] 3.1 Add `secret_key: str` to `app/config.py` `Settings`
    - No default value; loaded from `SECRET_KEY` env var; app raises `ValidationError` at startup if absent (Requirement 3.1)
    - _Requirements: 3.1_

  - [x] 3.2 Implement `app/deps.py` JWT dependency
    - Add `get_current_crew` using `HTTPBearer` + `python-jose` to decode and return JWT claims; raise HTTP 401 on `JWTError`
    - Add `require_own_or_surgeon(crew_id, current)` raising HTTP 403 when `current["sub"] != crew_id` and `role != "flight_surgeon"`
    - _Requirements: 3.5, 3.6_

  - [x] 3.3 Implement `app/api/v1/auth.py`
    - `POST /api/v1/auth/login`: look up `CrewMember`, call `security.verify_pin`; return HTTP 401 on mismatch; on success encode JWT (`sub`, `role`, `exp = utcnow + 3600 s`) with HS256 and return `{access_token, token_type, crew_id, role}`
    - _Requirements: 3.2, 3.3, 3.4_

  - [ ]* 3.4 Write property test for JWT claims correctness
    - **Property 7: JWT claims correctness**
    - **Validates: Requirements 3.4**
    - File: `backend/tests/unit/test_auth_property.py`

  - [ ]* 3.5 Write property test for cross-crew access control
    - **Property 8: Cross-crew access control**
    - **Validates: Requirements 3.6**
    - File: `backend/tests/unit/test_access_control_property.py`

- [ ] 4. Backend API routes — dashboard, alerts, WebSocket
  - [x] 4.1 Implement `app/api/v1/ws.py` — `ConnectionManager` and WebSocket endpoint
    - `ConnectionManager`: `defaultdict(list)` keyed by `crew_id`; `connect`, `disconnect`, `publish` methods
    - `WS /api/v1/ws/alerts?token=…`: validate JWT query param; close with code 4001 on missing/invalid token; register in manager; keep alive with `receive_text` loop; deregister on `WebSocketDisconnect`
    - Export `connection_manager` singleton for use by `AlertEngine`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 4.2 Write property test for WebSocket fan-out
    - **Property 13: WebSocket fan-out**
    - **Validates: Requirements 6.2**
    - File: `backend/tests/unit/test_ws_fanout_property.py`

  - [ ] 4.3 Implement `app/api/v1/dashboard.py`
    - `GET /api/v1/dashboard/summary` (requires `get_current_crew`): query latest measurement per metric, classify `status` via `ThresholdEvaluator` across all enabled threshold rules (most severe wins), compute `streak_days` by walking calendar days backward, fetch five most recent open alerts and today's reminders; respond within 800 ms (Requirement 4.4)
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 4.4 Write property test for dashboard vital status classification
    - **Property 9: Dashboard vital status classification**
    - **Validates: Requirements 4.2**
    - File: `backend/tests/unit/test_dashboard_property.py`

  - [ ] 4.5 Implement `app/api/v1/alerts.py`
    - `GET /api/v1/alerts`: return all alerts for authenticated crew member ordered by `created_at` desc; support optional `status` and `severity` filter query params; add `flight_surgeon_contact: true` to any critical alert in response serializer
    - `PATCH /api/v1/alerts/{id}`: update `status`; return HTTP 422 on `resolved → *` transition; return updated record
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 4.6 Write property tests for alert list filter and critical flag
    - **Property 10: Alert list filter correctness**
    - **Property 12: Critical alert flight-surgeon flag**
    - **Validates: Requirements 5.1, 5.4**
    - File: `backend/tests/unit/test_alerts_property.py`

- [ ] 5. Backend API routes — trends, guidance, reminders, environment GET, reports
  - [ ] 5.1 Implement `app/api/v1/trends.py`
    - `GET /api/v1/trends/{metric}?window=7d|14d|30d`: validate window (422 on other values); query measurements within window; fetch Baseline; return `readings`, `baseline` (`mean`, `std_dev`, `min`, `max`), and `band` (`lower = mean − 2×std_dev`, `upper = mean + 2×std_dev`); return `null` for both when no baseline exists
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 5.2 Write property test for trend band formula
    - **Property 14: Trend band formula**
    - **Validates: Requirements 7.1**
    - File: `backend/tests/unit/test_trends_property.py`

  - [ ] 5.3 Implement `app/services/guidance_service.py` — `GuidanceService`
    - `by_alert(alert_id, db)`: retrieve alert, build search string `"{metric} {severity}".lower()`, delegate to `_match`
    - `by_topic(topic, db)`: delegate to `_match` with `topic.lower()`
    - `_match(search, db)`: load all `GuidanceArticle` rows; filter those where any `trigger_tag.lower()` is a substring of `search`; sort by `severity_level` descending
    - _Requirements: 8.1, 8.2, 8.5_

  - [ ]* 5.4 Write property test for guidance tag matching
    - **Property 15: Guidance tag matching (case-insensitive substring)**
    - **Validates: Requirements 8.1, 8.2, 8.5**
    - File: `backend/tests/unit/test_guidance_property.py`

  - [ ] 5.5 Implement `app/api/v1/guidance.py`
    - `GET /api/v1/guidance`: require `alert_id` or `topic`; return HTTP 422 when neither is supplied; delegate to `GuidanceService`; return `[]` with HTTP 200 on no match
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ] 5.6 Implement `app/api/v1/reminders.py`
    - `GET /api/v1/reminders`: return all reminders for authenticated crew member
    - `POST /api/v1/reminders`: validate `type` (max 30 chars) and `schedule` (non-empty, max 60 chars); set `crew_id` from JWT; return HTTP 201
    - `PATCH /api/v1/reminders/{id}`: validate ownership (HTTP 403 on mismatch); update `enabled` or `last_done_at`; return updated record
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ]* 5.7 Write property tests for reminder creation ownership and update round-trip
    - **Property 16: Reminder creation ownership**
    - **Property 17: Reminder update round-trip**
    - **Validates: Requirements 9.2, 9.3**
    - File: `backend/tests/unit/test_reminders_property.py`

  - [ ] 5.8 Complete `app/api/v1/environment.py` — add GET with filters and alert trigger
    - `GET /api/v1/environment`: accept optional `from`/`to` ISO 8601 query params; filter `EnvironmentReading` by `recorded_at`; return up to 500 records ordered by `recorded_at` descending
    - After the existing `POST /environment` persists, call `AlertEngine.evaluate_environment(reading, db)` to insert critical alerts for `co2_ppm > 5000`, `o2_pct < 16.0`, `radiation_usv > 1000`
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ]* 5.9 Write property test for environment critical alert triggering
    - **Property 18: Environment critical alert triggering**
    - **Validates: Requirements 10.3**
    - File: `backend/tests/unit/test_environment_property.py`

  - [ ] 5.10 Implement `app/api/v1/reports.py`
    - `GET /api/v1/reports/export`: guard `role == "flight_surgeon"` (HTTP 403 otherwise); validate `format` as `csv` or `pdf` (HTTP 422 otherwise); accept optional `from`/`to` date range; join `Measurement`, `SleepLog`, `MoodLog`, `SymptomLog`, `ExerciseLog` for requested `crew_id`; stream CSV via Python `csv` module or PDF via `reportlab`; set correct `Content-Type` header
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ] 6. Backend checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Frontend IndexedDB schema and repositories
  - [ ] 7.1 Implement `src/db/schema.ts` — Dexie v1 schema
    - Define TypeScript interfaces for `MeasurementRecord`, `AlertRecord`, `SyncQueueRecord`, `SleepLogRecord`, `MoodLogRecord`, `SymptomLogRecord`, `ExerciseLogRecord`, `ReminderRecord`
    - Define `VitalisDB extends Dexie` with version-1 stores and indexes: `measurements` on `id, crew_id, [crew_id+metric], recorded_at`; `alerts` on `id, crew_id, [crew_id+status], created_at`; `sync_queue` on `id, synced_at`; all others on `id, crew_id`
    - Export `db` singleton
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [ ] 7.2 Implement `src/db/repositories/syncQueue.ts` — `syncQueueRepo`
    - `enqueue(entity, entityId, operation, payload)`: generate UUID v4 for `id`, write to `sync_queue` with `synced_at = null`
    - `getPending()`: return all records where `synced_at` is null
    - `markSynced(id)`: set `synced_at` to current UTC ISO string
    - _Requirements: 12.4, 15.1_

  - [ ] 7.3 Implement `src/db/repositories/measurements.ts` — `measurementsRepo`
    - `add(record)`: generate UUID v4 for `id` if not supplied; set `updated_at`; write to `measurements`; enqueue in `syncQueueRepo`
    - `listForCrew(crewId, metric?, from?, to?, limit?)`: query by `[crew_id+metric]` or `crew_id`; apply time filters; sort descending; limit
    - `getLatestPerMetric(crewId)`: return a `Record<metric, MeasurementRecord>` keyed by metric
    - `markSynced(id)`: update `synced_at`
    - _Requirements: 12.5, 12.8_

  - [ ]* 7.4 Write property test for `measurementsRepo.add` UUID generation
    - **Property 19: IndexedDB UUID generation on add**
    - **Validates: Requirements 12.8**
    - File: `frontend/tests/unit/measurementsRepo.test.ts`

  - [ ] 7.5 Implement `src/db/repositories/alerts.ts` — `alertsRepo`
    - `add(record)`: generate UUID v4, set `updated_at`, write to `alerts`, enqueue in `syncQueueRepo`
    - `listForCrew(crewId, status?, severity?)`: query by `[crew_id+status]` or `crew_id`; apply severity filter
    - `updateStatus(id, status)`: update `status` and `updated_at`; enqueue upsert in `syncQueueRepo`
    - `markSynced(id)`: update `synced_at`
    - _Requirements: 12.6, 12.8_

  - [ ]* 7.6 Write property test for offline queue enqueue on write
    - **Property 24: Offline queue enqueue on write**
    - **Validates: Requirements 15.1**
    - File: `frontend/tests/unit/offlineQueue.test.ts`

  - [ ] 7.7 Implement `src/db/repositories/sleep.ts`, `mood.ts`, `symptoms.ts`
    - Each exposes `add(record)` (UUID + `updated_at` + `syncQueueRepo.enqueue`), `listForCrew(crewId, from?, to?, limit?)`, and `markSynced(id)`
    - _Requirements: 12.7, 12.8_

- [ ] 8. Frontend Zustand store and API client
  - [ ] 8.1 Implement `src/store/useAppStore.ts` — Zustand store with persistence
    - Define slices: `auth` (`crewId`, `role`, `token`, `isAuthenticated`), `alerts` (`openCount`, `criticalPending`), `connectivity` (`isOnline`), `reminders` (`items`, `completedToday`)
    - Actions: `login(crewId, role, token)` persists token to `localStorage` and sets `isAuthenticated = true`; `logout()` clears all auth fields and removes from `localStorage`; `setOnline(value)`; `incrementOpenAlerts(count)`; `dismissCritical()` sets `criticalPending = false`; `setReminders(items)`
    - Startup rehydration: read `localStorage` token, `jwtDecode` it, restore auth slice only if `exp * 1000 > Date.now()`
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ]* 8.2 Write property test for `login`/`logout` symmetry
    - **Property 20: Zustand login/logout symmetry**
    - **Validates: Requirements 13.2**
    - File: `frontend/tests/unit/useAppStore.test.ts`

  - [ ]* 8.3 Write property test for token expiry restore
    - **Property 21: Token expiry restore**
    - **Validates: Requirements 13.3**
    - Add to `frontend/tests/unit/useAppStore.test.ts`

  - [ ] 8.4 Implement `src/api/client.ts` — typed API client
    - `request<T>(path, init, skipAuth)`: attach `Authorization: Bearer <token>` from Zustand store for all non-login calls; set 10 s `AbortController` timeout; on 401 (non-login) call `logout()` and throw `AuthError`; on non-2xx throw `ApiError(status, detail)`; on abort throw `TimeoutError`
    - Export `apiClient` with all typed functions: `login`, `getDashboardSummary`, `getAlerts`, `patchAlert`, `getMeasurements`, `postMeasurement`, `getTrends`, `getGuidance`, `getReminders`, `patchReminder`, `syncPush`, `syncPull`
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [ ]* 8.5 Write property test for API client JWT attachment
    - **Property 22: API client JWT attachment**
    - **Validates: Requirements 14.2**
    - File: `frontend/tests/unit/apiClient.test.ts`

  - [ ]* 8.6 Write property test for API client error propagation
    - **Property 23: API client error propagation**
    - **Validates: Requirements 14.4**
    - Add to `frontend/tests/unit/apiClient.test.ts`

- [ ] 9. Frontend sync layer
  - [ ] 9.1 Implement `src/sync/syncQueue.ts`
    - Re-export `syncQueueRepo` from the repository layer; expose a `flush()` function that calls `pushPendingItems` from `pushPull.ts`
    - _Requirements: 15.1_

  - [ ] 9.2 Implement `src/sync/conflict.ts` — last-write-wins
    - `resolveConflict(serverResult, localItem)`: when `serverResult.status === "stale"`, mark the local queue item synced (server copy is newer); otherwise no-op
    - _Requirements: 15.4, 15.5_

  - [ ]* 9.3 Write property test for last-write-wins conflict resolution
    - **Property 26: Last-write-wins conflict resolution**
    - **Property 27: Pull merge skips newer local records**
    - **Validates: Requirements 15.4, 15.5**
    - File: `frontend/tests/unit/conflict.test.ts`

  - [ ] 9.4 Implement `src/sync/pushPull.ts` — push/pull orchestration
    - `pushPendingItems()`: get pending items from `syncQueueRepo`; send in batches of ≤ 50 via `apiClient.syncPush`; for each `applied` result call `syncQueueRepo.markSynced`; for each `stale` call `resolveConflict`; on network error log and `scheduleRetry` (30 s)
    - `pullChanges(since?)`: call `apiClient.syncPull`; for each changed record call the appropriate repository `add` or `updateStatus`, skipping records where local `updated_at` is newer
    - _Requirements: 15.2, 15.3, 15.4, 15.5, 15.6_

  - [ ]* 9.5 Write property test for sync batch size invariant
    - **Property 25: Sync batch size invariant**
    - **Validates: Requirements 15.2**
    - File: `frontend/tests/unit/pushPull.test.ts`

  - [ ] 9.6 Implement `src/sync/useConnectivity.ts`
    - React hook attaching `window.addEventListener("online"|"offline")` listeners; on online calls `useAppStore.setOnline(true)` then `pushPendingItems()`; on offline calls `setOnline(false)`; cleans up listeners on unmount
    - _Requirements: 15.2_

  - [ ] 9.7 Implement `src/hooks/useAlertSocket.ts`
    - React hook opening `WebSocket` to `WS /api/v1/ws/alerts?token=…` when `isAuthenticated`; on message parse alert JSON, call `incrementOpenAlerts(1)`, set `criticalPending = true` if `severity === "critical"`; close socket on cleanup
    - _Requirements: 6.1, 6.2, 17.5_

- [ ] 10. Frontend page wrappers
  - [ ] 10.1 Implement `src/pages/LoginPage.tsx`
    - On mount call `GET /api/v1/crew` and render one card per crew member (name, role, job title)
    - On card selection reveal PIN pad (digits 0–9, backspace, confirm); confirm disabled while request is in-flight
    - On confirm (4–8 digits) call `apiClient.login(crewId, pin)`; on success call `useAppStore.login()` and navigate to `/`
    - On `AuthError` show "Incorrect PIN. Try again." and clear PIN input; show disclaimer at bottom
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6_

  - [ ] 10.2 Implement `src/pages/HomePage.tsx`
    - On mount (when `isAuthenticated`) call `apiClient.getDashboardSummary()`; pass result as props to `<HomeDashboard>`; update `useAppStore.alerts.openCount`
    - On network error while offline read latest measurements from `measurementsRepo.getLatestPerMetric()` and render `<HomeDashboard>` with that data
    - On non-network API error render inline error message below status banner
    - Mount `useAlertSocket()`; render full-screen overlay "Contact flight surgeon now" with dismiss button when `criticalPending` is true
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6_

  - [ ] 10.3 Implement `src/pages/QuickLogPage.tsx`
    - On mount read `measurementsRepo.getLatestPerMetric(crewId)` and pass as "Last value" display to `<QuickLog>`; pass `onNotify` and `onNavigateHome` callbacks
    - On `QuickLog` save action call `measurementsRepo.add(...)` for each non-null vital (UTC `recorded_at`, `"manual"` source)
    - On IndexedDB success, if online, also call `apiClient.postMeasurement(...)` and mark queue item synced
    - If POST response or WebSocket message contains an alert, pass severity and message to `<QuickLog>` result bottom sheet
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

  - [ ] 10.4 Implement `src/pages/AlertsPage.tsx`
    - On mount call `apiClient.getAlerts()` and group alerts into severity sections (critical → warning → caution → info) with count badges
    - Tapping a row expands inline panel showing `message`, `created_at`, rule type, and "See guidance" link with `alert_id` query param
    - Acknowledge: call `apiClient.patchAlert(id, "acknowledged")` with optimistic UI update; Resolve: call `apiClient.patchAlert(id, "resolved")` and move row to collapsed "Resolved" section
    - Show persistent "Contact flight surgeon now" banner while any critical alert is open or acknowledged
    - Display disclaimer "Decision support only. Not a medical diagnosis." at bottom
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6_

- [ ] 11. Frontend routing and auth guard
  - [ ] 11.1 Implement `src/routes.tsx`
    - Define routes: `/login` → `LoginPage`, `/` → `HomePage`, `/log` → `QuickLogPage`, `/alerts` → `AlertsPage`
    - `AuthGuard` component: redirect to `/login` when `isAuthenticated` is false; redirect to `/login` and clear cached route state when `isAuthenticated` becomes false mid-session
    - `AppShell` component: call `useConnectivity()`, render "Offline — data saved locally" banner when `isOnline` is false
    - Wrap all guarded routes in a React error boundary that catches unhandled errors, logs to console, and shows "Something went wrong. Restart the app." without a stack trace
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

  - [ ]* 11.2 Write property test for auth guard redirect
    - **Property 28: Auth guard redirect**
    - **Validates: Requirements 20.2**
    - File: `frontend/tests/unit/authGuard.test.tsx`

- [ ] 12. Cross-platform alert evaluation tests
  - [ ] 12.1 Implement backend `tests/unit/test_alert_rules.py` — pytest test-vector runner
    - Load `shared/test-vectors/alert_cases.json`; for each test case instantiate the appropriate evaluator (threshold, baseline_dev, or trend); assert the evaluator's output matches `expected_alerts` for `rule_type`, `metric`, and `severity`
    - _Requirements: 1.6, 1.7_

  - [ ] 12.2 Implement frontend `tests/unit/alertEngine.test.ts` — vitest test-vector runner
    - Import `alert_cases.json` and the TypeScript evaluator equivalents; for each test case assert that evaluator output matches `expected_alerts` with identical `rule_type`, `metric`, and `severity` entries
    - _Requirements: 1.7_

- [ ] 13. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoint tasks (6, 13) validate incremental progress before moving to the next layer
- Property tests validate universal correctness properties; unit tests in the same files cover specific examples and edge cases
- The `.config.kiro` for this spec already exists; do not recreate it
- The existing `environment.py` already implements `POST /environment`, `GET /environment/latest`, and the space-weather endpoints — task 5.8 adds only the filtered GET and the alert-trigger call

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["2.1", "3.1"] },
    { "id": 4, "tasks": ["2.2", "2.4", "2.6", "3.2"] },
    { "id": 5, "tasks": ["2.3", "2.5", "2.7", "3.3"] },
    { "id": 6, "tasks": ["2.8", "3.4", "3.5", "4.1"] },
    { "id": 7, "tasks": ["2.9", "4.2", "4.3", "4.5"] },
    { "id": 8, "tasks": ["4.4", "4.6", "5.1", "5.3"] },
    { "id": 9, "tasks": ["5.2", "5.4", "5.5", "5.6", "5.8", "5.10"] },
    { "id": 10, "tasks": ["5.7", "5.9", "7.1"] },
    { "id": 11, "tasks": ["7.2"] },
    { "id": 12, "tasks": ["7.3", "7.5", "7.7"] },
    { "id": 13, "tasks": ["7.4", "7.6", "8.1"] },
    { "id": 14, "tasks": ["8.2", "8.3", "8.4"] },
    { "id": 15, "tasks": ["8.5", "8.6", "9.1", "9.2"] },
    { "id": 16, "tasks": ["9.3", "9.4"] },
    { "id": 17, "tasks": ["9.5", "9.6", "9.7"] },
    { "id": 18, "tasks": ["10.1", "10.2", "10.3", "10.4"] },
    { "id": 19, "tasks": ["11.1"] },
    { "id": 20, "tasks": ["11.2", "12.1", "12.2"] }
  ]
}
```
