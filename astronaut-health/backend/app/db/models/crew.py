from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class Mission(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "missions"
    name: Mapped[str] = mapped_column(String(120))
    destination: Mapped[str] = mapped_column(String(20), default="Mars")  # ISS / Moon / Mars
    start_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    planned_end_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class CrewMember(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "crew_members"
    name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(20), default="astronaut")  # astronaut / flight_surgeon / admin
    job_title: Mapped[Optional[str]] = mapped_column(String(80))
    age: Mapped[Optional[int]] = mapped_column(Integer)
    sex: Mapped[Optional[str]] = mapped_column(String(10))
    height_cm: Mapped[Optional[float]] = mapped_column(Float)
    weight_kg: Mapped[Optional[float]] = mapped_column(Float)
    mission_id: Mapped[Optional[str]] = mapped_column(ForeignKey("missions.id", ondelete="SET NULL"))
    pin_hash: Mapped[Optional[str]] = mapped_column(String(200))
