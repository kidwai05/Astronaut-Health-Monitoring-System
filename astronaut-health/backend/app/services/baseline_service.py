import statistics
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.base import as_utc, utcnow
from app.db.models import Baseline, Measurement

MIN_SAMPLES = 3


def compute_baseline(db: Session, crew_id: str, metric: str, days: Optional[int] = None) -> Optional[Baseline]:
    """Baseline = stats over the first `days` days of a person's data for that metric."""
    days = days or get_settings().baseline_days
    first = db.scalar(select(func.min(Measurement.recorded_at))
                      .where(Measurement.crew_id == crew_id, Measurement.metric == metric))
    if first is None:
        return None
    first = as_utc(first)
    window_end: datetime = first + timedelta(days=days)
    values = list(db.scalars(select(Measurement.value).where(
        Measurement.crew_id == crew_id, Measurement.metric == metric,
        Measurement.recorded_at >= first, Measurement.recorded_at < window_end)))
    if len(values) < MIN_SAMPLES:
        return None

    stats = dict(mean=statistics.fmean(values), std_dev=statistics.stdev(values),
                 min=min(values), max=max(values), sample_size=len(values), computed_at=utcnow())
    obj = db.scalar(select(Baseline).where(Baseline.crew_id == crew_id, Baseline.metric == metric))
    if obj:
        for k, v in stats.items():
            setattr(obj, k, v)
    else:
        obj = Baseline(crew_id=crew_id, metric=metric, **stats)
        db.add(obj)
    db.flush()
    return obj


def compute_all_baselines(db: Session, crew_id: str, days: Optional[int] = None) -> list[Baseline]:
    metrics = db.scalars(select(Measurement.metric).where(Measurement.crew_id == crew_id).distinct())
    return [b for m in list(metrics) if (b := compute_baseline(db, crew_id, m, days))]
