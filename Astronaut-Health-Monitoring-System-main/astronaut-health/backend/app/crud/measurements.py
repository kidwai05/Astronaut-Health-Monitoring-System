from datetime import datetime
from typing import Optional

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.db.base import as_utc
from app.db.models import Measurement

measurements = CRUDBase(Measurement, "recorded_at")


def query_measurements(db: Session, crew_id: str, metric: Optional[str] = None,
                       start: Optional[datetime] = None, end: Optional[datetime] = None,
                       limit: int = 1000) -> list[Measurement]:
    q = select(Measurement).where(Measurement.crew_id == crew_id)
    if metric:
        q = q.where(Measurement.metric == metric)
    if start:
        q = q.where(Measurement.recorded_at >= as_utc(start))
    if end:
        q = q.where(Measurement.recorded_at <= as_utc(end))
    return list(db.scalars(q.order_by(Measurement.recorded_at.desc()).limit(limit)))


def latest_per_metric(db: Session, crew_id: str) -> list[Measurement]:
    """Most recent reading for each metric (feeds the dashboard tiles)."""
    sub = (select(Measurement.metric, func.max(Measurement.recorded_at).label("mx"))
           .where(Measurement.crew_id == crew_id).group_by(Measurement.metric).subquery())
    q = (select(Measurement)
         .join(sub, and_(Measurement.metric == sub.c.metric, Measurement.recorded_at == sub.c.mx))
         .where(Measurement.crew_id == crew_id))
    return list(db.scalars(q))
