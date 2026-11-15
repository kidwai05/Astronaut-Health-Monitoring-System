"""Functions that bring data into the backend: single, bulk, and wearable JSON/CSV feeds."""
import csv
import io
import uuid
from datetime import datetime
from typing import Any, Iterable

from sqlalchemy.orm import Session

from app.crud.audit import audit
from app.crud.base import parse_dt
from app.crud.measurements import measurements
from app.db.base import as_utc
from app.db.models import Measurement
from app.schemas.health import MeasurementCreate
from app.services.validation import METRIC_SPECS, normalize_metric

_NS = uuid.UUID("6f1c2a4e-8f55-4c53-9a3e-0a5c1b7d9e11")  # namespace for deterministic wearable IDs


def ingest_measurement(db: Session, payload: MeasurementCreate) -> Measurement:
    obj = measurements.upsert(db, payload.model_dump())
    audit(db, "upsert", "measurements", obj.id, actor_id=payload.crew_id)

    # Evaluate alert rules for this measurement
    from fastapi import Request
    from app.main import app
    if hasattr(app.state, "alert_engine"):
        app.state.alert_engine.evaluate(obj, db)

    return obj


def ingest_measurements_bulk(db: Session, payloads: Iterable[MeasurementCreate]) -> list[Measurement]:
    out = [ingest_measurement(db, p) for p in payloads]
    return out


def _wearable_rows_to_payloads(crew_id: str, rows: Iterable[dict[str, Any]]) -> tuple[list[MeasurementCreate], list[str]]:
    """Each row: {"timestamp": ISO, "<metric>": value, ...}. Bad values are skipped and reported."""
    payloads: list[MeasurementCreate] = []
    errors: list[str] = []
    for i, row in enumerate(rows):
        ts_raw = row.get("timestamp") or row.get("recorded_at")
        try:
            ts = parse_dt(ts_raw) if isinstance(ts_raw, str) else as_utc(ts_raw)
            if not isinstance(ts, datetime):
                raise ValueError("missing timestamp")
        except Exception as e:  # noqa: BLE001
            errors.append(f"row {i}: bad timestamp ({e})")
            continue
        for key, raw in row.items():
            metric = normalize_metric(key)
            if metric not in METRIC_SPECS or raw in (None, ""):
                continue
            try:
                payloads.append(MeasurementCreate(
                    # Deterministic id -> re-importing the same file never duplicates data
                    id=str(uuid.uuid5(_NS, f"{crew_id}:{metric}:{ts.isoformat()}:wearable")),
                    crew_id=crew_id, metric=metric, value=float(raw), source="wearable",
                    recorded_at=ts, note="simulated wearable import"))
            except Exception as e:  # noqa: BLE001
                errors.append(f"row {i} {key}: {e}")
    return payloads, errors


def ingest_wearable_json(db: Session, crew_id: str, records: list[dict[str, Any]]) -> dict[str, Any]:
    payloads, errors = _wearable_rows_to_payloads(crew_id, records)
    ingest_measurements_bulk(db, payloads)
    return {"imported": len(payloads), "errors": errors}


def ingest_wearable_csv(db: Session, crew_id: str, text: str) -> dict[str, Any]:
    rows = list(csv.DictReader(io.StringIO(text)))
    return ingest_wearable_json(db, crew_id, rows)
