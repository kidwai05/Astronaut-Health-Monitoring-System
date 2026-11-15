from datetime import datetime
from typing import Any, Optional

from sqlalchemy import JSON, DateTime, Float, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin, utcnow


class EnvironmentReading(UUIDMixin, TimestampMixin, Base):
    """Habitat-wide (not per crew member)."""
    __tablename__ = "environment_readings"
    __table_args__ = (Index("ix_env_time", "recorded_at"),)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    co2_ppm: Mapped[Optional[float]] = mapped_column(Float)
    o2_pct: Mapped[Optional[float]] = mapped_column(Float)
    temperature_c: Mapped[Optional[float]] = mapped_column(Float)
    humidity_pct: Mapped[Optional[float]] = mapped_column(Float)
    noise_db: Mapped[Optional[float]] = mapped_column(Float)
    radiation_usv: Mapped[Optional[float]] = mapped_column(Float)  # simulated dosimeter unless stated
    location: Mapped[Optional[str]] = mapped_column(String(60))


class SpaceWeatherEvent(UUIDMixin, TimestampMixin, Base):
    """Cached NASA DONKI events (available offline)."""
    __tablename__ = "space_weather_events"
    source_id: Mapped[str] = mapped_column(String(80), unique=True)
    type: Mapped[str] = mapped_column(String(10))  # flare / CME / SEP
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    event_class: Mapped[Optional[str]] = mapped_column(String(10))  # e.g. M5.2 for flares
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    raw: Mapped[Any] = mapped_column(JSON, default=dict)
