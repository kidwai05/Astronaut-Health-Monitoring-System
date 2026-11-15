# Astronaut Health Monitoring: Backend (data layer)

FastAPI + SQLAlchemy 2.0 + Pydantic v2. SQLite by default, PostgreSQL by changing `DATABASE_URL`.

## Run
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m app.seed.seed_demo_mission     # optional: 30-day SIMULATED mission
uvicorn app.main:app --reload            # docs at http://localhost:8000/docs
pytest
```

## Layout
| Path | What it does |
|---|---|
| `app/config.py` | Settings from `.env` |
| `app/db/session.py` | Engine, `SessionLocal`, `get_db`, `init_db` (SQLite WAL + FK pragmas) |
| `app/db/models/` | All tables from plan section 4 |
| `app/schemas/` | Pydantic request/response models, with range validation |
| `app/crud/` | Generic `CRUDBase` (idempotent upsert by client UUID) + measurement queries |
| `app/services/ingest.py` | Single, bulk and wearable JSON/CSV ingestion (deterministic IDs, so re-import never duplicates) |
| `app/services/validation.py` | Impossible-value checks per metric |
| `app/services/baseline_service.py` | Personal baseline (mean/std/min/max over first N days) |
| `app/services/donki_client.py` | Fetch NASA DONKI, cache in DB, radiation-risk indicator |
| `app/services/sync_service.py` | Offline push/pull, last-write-wins, per-record error isolation |
| `app/api/v1/` | Routers (`/crew`, `/measurements`, `/sleep`, `/mood`, `/symptoms`, `/exercise`, `/environment`, `/space-weather`, `/sync`) |
| `app/seed/` | Default alert rules + demo mission (simulated) |

## Notes
- Rows are created with `create_all` for the MVP; move to Alembic once the schema settles.
- Not included yet: JWT login/roles, alert engine, guidance, reports, WebSocket.
- Alert thresholds in `seed_alert_rules.py` are illustrative, pending medical review.
- Sync pull does not report deletions yet.
