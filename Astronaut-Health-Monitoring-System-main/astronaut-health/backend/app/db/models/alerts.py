from datetime import datetime
from typing import Any, Optional

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin, utcnow


class AlertRule(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "alert_rules"
    metric: Mapped[str] = mapped_column(String(32))
    rule_type: Mapped[str] = mapped_column(String(24))  # threshold / baseline_deviation / trend
    params: Mapped[Any] = mapped_column(JSON, default=dict)
    severity: Mapped[str] = mapped_column(String(10))  # info / caution / warning / critical
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)


class Alert(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "alerts"
    __table_args__ = (Index("ix_alert_crew_status_time", "crew_id", "status", "created_at"),)
    crew_id: Mapped[str] = mapped_column(ForeignKey("crew_members.id", ondelete="CASCADE"))
    metric: Mapped[str] = mapped_column(String(32))
    severity: Mapped[str] = mapped_column(String(10))
    message: Mapped[str] = mapped_column(Text)
    triggered_by_rule: Mapped[Optional[str]] = mapped_column(ForeignKey("alert_rules.id", ondelete="SET NULL"))
    status: Mapped[str] = mapped_column(String(14), default="open")  # open / acknowledged / resolved


class Reminder(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "reminders"
    crew_id: Mapped[str] = mapped_column(ForeignKey("crew_members.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(30))
    schedule: Mapped[str] = mapped_column(String(60))  # cron-like
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    last_done_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class GuidanceArticle(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "guidance_articles"
    topic: Mapped[str] = mapped_column(String(40), index=True)
    trigger_tags: Mapped[Any] = mapped_column(JSON, default=list)
    title: Mapped[str] = mapped_column(String(160))
    body: Mapped[str] = mapped_column(Text)
    severity_level: Mapped[str] = mapped_column(String(10), default="info")
    source_url: Mapped[Optional[str]] = mapped_column(String(300))


class Achievement(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "achievements"
    crew_id: Mapped[str] = mapped_column(ForeignKey("crew_members.id", ondelete="CASCADE"), index=True)
    badge_code: Mapped[str] = mapped_column(String(40))
    earned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
