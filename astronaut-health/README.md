# Astronaut Health Monitoring System

NASA Space Apps Challenge #04. Offline-first health monitoring and decision support for long-duration missions
(decision-support tool, not a diagnostic tool).

## Structure
- `frontend/`: React + TypeScript PWA (device tier, runs fully offline)
- `backend/`: FastAPI + SQLAlchemy (habitat tier). **Implemented**: models, DB connection, ingestion, baselines, DONKI cache, sync
- `shared/`: alert rules, guidance and test vectors used by both tiers
- `data/`: simulated (labelled) and NASA reference data
- `docs/`, `tools/`

Files containing only a comment or "Placeholder" note are stubs describing what belongs there.

## Quick start (backend)
See `backend/README.md`.
