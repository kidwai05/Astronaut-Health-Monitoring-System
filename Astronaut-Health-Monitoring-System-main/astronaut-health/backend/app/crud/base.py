from datetime import datetime
from typing import Any, Generic, Optional, Type, TypeVar

from sqlalchemy import DateTime, select
from sqlalchemy.orm import Session

from app.db.base import Base, as_utc

ModelT = TypeVar("ModelT", bound=Base)


def parse_dt(value: str) -> datetime:
    return as_utc(datetime.fromisoformat(value.replace("Z", "+00:00")))


def coerce_payload(model: Type[Base], data: dict[str, Any]) -> dict[str, Any]:
    """Keep only real columns; turn ISO strings into aware datetimes."""
    cols = {c.name: c for c in model.__table__.columns}
    out: dict[str, Any] = {}
    for key, value in data.items():
        col = cols.get(key)
        if col is None:
            continue
        if isinstance(col.type, DateTime):
            if isinstance(value, str):
                value = parse_dt(value)
            elif isinstance(value, datetime):
                value = as_utc(value)
        out[key] = value
    return out


def row_to_dict(obj: Base) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for col in obj.__table__.columns:
        v = getattr(obj, col.name)
        out[col.name] = v.isoformat() if isinstance(v, datetime) else v
    return out


class CRUDBase(Generic[ModelT]):
    def __init__(self, model: Type[ModelT], time_field: Optional[str] = "recorded_at"):
        self.model = model
        self.time_field = time_field

    def get(self, db: Session, id: str) -> Optional[ModelT]:
        return db.get(self.model, id)

    def upsert(self, db: Session, data: dict[str, Any]) -> ModelT:
        """Insert, or update when the client-supplied id already exists (idempotent retries)."""
        data = coerce_payload(self.model, data)
        if data.get("id") is None:
            data.pop("id", None)
        obj = db.get(self.model, data["id"]) if "id" in data else None
        if obj is not None:
            for k, v in data.items():
                if k != "id":
                    setattr(obj, k, v)
        else:
            obj = self.model(**data)
            db.add(obj)
        db.flush()
        return obj

    def list_for_crew(self, db: Session, crew_id: str, start: Optional[datetime] = None,
                      end: Optional[datetime] = None, limit: int = 500) -> list[ModelT]:
        col = getattr(self.model, self.time_field)
        q = select(self.model).where(self.model.crew_id == crew_id)
        if start:
            q = q.where(col >= as_utc(start))
        if end:
            q = q.where(col <= as_utc(end))
        return list(db.scalars(q.order_by(col.desc()).limit(limit)))

    def delete(self, db: Session, id: str) -> bool:
        obj = db.get(self.model, id)
        if obj is None:
            return False
        db.delete(obj)
        db.flush()
        return True
