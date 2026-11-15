from datetime import datetime
from typing import Any, Optional

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin, utcnow

def _crew_fk() -> ForeignKey:
    return ForeignKey("crew_members.id", ondelete="CASCADE")


class Baseline(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "baselines"
    __table_args__ = (UniqueConstraint("crew_id", "metric", name="uq_baseline_crew_metric"),)
    crew_id: Mapped[str] = mapped_column(_crew_fk(), index=True)
    metric: Mapped[str] = mapped_column(String(32))
    mean: Mapped[float] = mapped_column(Float)
    std_dev: Mapped[float] = mapped_column(Float)
    min: Mapped[float] = mapped_column(Float)
    max: Mapped[float] = mapped_column(Float)
    sample_size: Mapped[int] = mapped_column(Integer, default=0)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Measurement(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "measurements"
    __table_args__ = (Index("ix_meas_crew_metric_time", "crew_id", "metric", "recorded_at"),)
    crew_id: Mapped[str] = mapped_column(_crew_fk())
    metric: Mapped[str] = mapped_column(String(32))
    value: Mapped[float] = mapped_column(Float)
    unit: Mapped[Optional[str]] = mapped_column(String(16))
    source: Mapped[str] = mapped_column(String(16), default="manual")  # manual / wearable / camera
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    note: Mapped[Optional[str]] = mapped_column(Text)


class SleepLog(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "sleep_logs"
    __table_args__ = (Index("ix_sleep_crew_start", "crew_id", "sleep_start"),)
    crew_id: Mapped[str] = mapped_column(_crew_fk())
    sleep_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    sleep_end: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    duration_h: Mapped[float] = mapped_column(Float)
    quality: Mapped[Optional[int]] = mapped_column(Integer)  # 1-5
    interruptions: Mapped[int] = mapped_column(Integer, default=0)


class MoodLog(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "mood_logs"
    __table_args__ = (Index("ix_mood_crew_time", "crew_id", "recorded_at"),)
    crew_id: Mapped[str] = mapped_column(_crew_fk())
    mood: Mapped[int] = mapped_column(Integer)
    stress: Mapped[int] = mapped_column(Integer)
    energy: Mapped[int] = mapped_column(Integer)
    tags: Mapped[Any] = mapped_column(JSON, default=list)
    free_text: Mapped[Optional[str]] = mapped_column(Text)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class SymptomLog(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "symptom_logs"
    __table_args__ = (Index("ix_symptom_crew_time", "crew_id", "recorded_at"),)
    crew_id: Mapped[str] = mapped_column(_crew_fk())
    body_region: Mapped[str] = mapped_column(String(32))
    symptom_type: Mapped[str] = mapped_column(String(40))
    severity: Mapped[int] = mapped_column(Integer)  # 1-5
    notes: Mapped[Optional[str]] = mapped_column(Text)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ExerciseLog(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "exercise_logs"
    __table_args__ = (Index("ix_exercise_crew_time", "crew_id", "recorded_at"),)
    crew_id: Mapped[str] = mapped_column(_crew_fk())
    type: Mapped[str] = mapped_column(String(40))
    duration_min: Mapped[int] = mapped_column(Integer)
    intensity: Mapped[str] = mapped_column(String(12), default="moderate")
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
