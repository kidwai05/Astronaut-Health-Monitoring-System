"""Store-and-forward sync. Client records carry UUIDs + updated_at; conflicts = last-write-wins."""
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.audit import audit
from app.crud.base import coerce_payload, row_to_dict
from app.db.base import Base, as_utc, utcnow
from app.db.models import (Alert, EnvironmentReading, ExerciseLog, Measurement, MoodLog, Reminder,
                           SleepLog, SymptomLog)
from app.schemas.sync import SyncItem, SyncPullResponse, SyncPushResponse, SyncResultItem

SYNC_ENTITIES: dict[str, type[Base]] = {
    "measurements": Measurement,
    "sleep_logs": SleepLog,
    "mood_logs": MoodLog,
    "symptom_logs": SymptomLog,
    "exercise_logs": ExerciseLog,
    "environment_readings": EnvironmentReading,
    "alerts": Alert,
    "reminders": Reminder,
}


def _apply(db: Session, item: SyncItem) -> SyncResultItem:
    model = SYNC_ENTITIES.get(item.entity)
    if model is None:
        return SyncResultItem(entity=item.entity, entity_id=item.entity_id, status="error", detail="unknown entity")
    incoming_ts = as_utc(item.updated_at) or utcnow()
    existing = db.get(model, item.entity_id)

    if existing is not None and as_utc(existing.updated_at) > incoming_ts:
        return SyncResultItem(entity=item.entity, entity_id=item.entity_id, status="stale",
                              detail="server copy is newer")

    if item.operation == "delete":
        if existing is not None:
            db.delete(existing)
        audit(db, "delete", item.entity, item.entity_id)
    else:
        data = coerce_payload(model, {**item.payload, "id": item.entity_id})
        data["updated_at"] = incoming_ts
        if existing is not None:
            for k, v in data.items():
                if k != "id":
                    setattr(existing, k, v)
        else:
            db.add(model(**data))
        audit(db, "upsert", item.entity, item.entity_id)
    db.flush()
    return SyncResultItem(entity=item.entity, entity_id=item.entity_id, status="applied")


def apply_push(db: Session, items: list[SyncItem]) -> SyncPushResponse:
    results: list[SyncResultItem] = []
    for item in items:
        # Savepoint per item: one bad record never blocks the rest of the batch
        try:
            with db.begin_nested():
                results.append(_apply(db, item))
        except Exception as e:  # noqa: BLE001
            results.append(SyncResultItem(entity=item.entity, entity_id=item.entity_id,
                                          status="error", detail=str(e)[:200]))
    return SyncPushResponse(
        applied=sum(r.status == "applied" for r in results),
        stale=sum(r.status == "stale" for r in results),
        errors=sum(r.status == "error" for r in results),
        results=results)


def pull_changes(db: Session, crew_id: Optional[str], since: Optional[datetime]) -> SyncPullResponse:
    """Rows changed after `since`. Note: deletions are not reported in v1."""
    changes: dict[str, list[dict]] = {}
    for name, model in SYNC_ENTITIES.items():
        q = select(model)
        if crew_id and hasattr(model, "crew_id"):
            q = q.where(model.crew_id == crew_id)
        if since:
            q = q.where(model.updated_at > as_utc(since))
        changes[name] = [row_to_dict(r) for r in db.scalars(q.order_by(model.updated_at))]
    return SyncPullResponse(server_time=utcnow(), changes=changes)
