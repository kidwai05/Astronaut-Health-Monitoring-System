"""Dashboard API — single-query endpoint for homepage data."""

from datetime import datetime, date, timedelta
from typing import Literal, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, func, distinct
from sqlalchemy.orm import Session

from app.db.models import Alert, Measurement, Reminder
from app.db.session import get_db
from app.deps import get_current_crew, TokenData
from app.services.alert_engine.loader import AlertRuleLoader
from app.services.alert_engine.threshold import ThresholdEvaluator

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


# ---------- Schemas ----------
class VitalStatus(BaseModel):
    """Single vital sign with classified status."""
    metric: str
    value: float
    unit: Optional[str] = None
    status: Literal["normal", "caution", "warning", "critical"] = "normal"
    timestamp: datetime


class AlertOut(BaseModel):
    """Alert record for dashboard summary."""
    model_config = ConfigDict(from_attributes=True)
    id: str
    crew_id: str
    metric: str
    severity: str
    message: str
    triggered_by_rule: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime


class ReminderOut(BaseModel):
    """Reminder record for dashboard summary."""
    model_config = ConfigDict(from_attributes=True)
    id: str
    crew_id: str
    type: str
    schedule: str
    enabled: bool
    last_done_at: Optional[datetime] = None


class DashboardSummary(BaseModel):
    """Complete dashboard payload."""
    vitals: list[VitalStatus]
    streak_days: int
    recent_alerts: list[AlertOut]
    todays_reminders: list[ReminderOut]


# ---------- Helper Functions ----------
def classify_status(
    metric: str, value: float, loader: AlertRuleLoader, evaluator: ThresholdEvaluator
) -> str:
    """
    Classify measurement status by evaluating all enabled threshold rules for metric.
    Returns most severe status: critical > warning > caution > info, default "normal".
    """
    rules = loader.get_rules_for_metric(metric)
    enabled_threshold_rules = [r for r in rules if r.enabled and r.rule_type == "threshold"]
    
    if not enabled_threshold_rules:
        return "normal"
    
    severity_rank = {"info": 0, "caution": 1, "warning": 2, "critical": 3}
    max_severity = "normal"
    max_rank = -1
    
    for rule in enabled_threshold_rules:
        finding = evaluator.evaluate(rule, value)
        if finding and severity_rank.get(finding.severity, -1) > max_rank:
            max_severity = finding.severity
            max_rank = severity_rank[finding.severity]
    
    return max_severity


def calculate_streak_days(db: Session, crew_id: str) -> int:
    """
    Count consecutive calendar days (UTC) going backwards from today with at least
    one measurement. Returns 0 if no measurements today.
    """
    # Get all distinct dates where crew member has measurements
    stmt = (
        select(func.date(Measurement.recorded_at))
        .where(Measurement.crew_id == crew_id)
        .distinct()
        .order_by(func.date(Measurement.recorded_at).desc())
    )
    
    dates = db.scalars(stmt).all()
    
    if not dates:
        return 0
    
    # Convert to date objects and sort descending
    measurement_dates = sorted([d if isinstance(d, date) else d.date() for d in dates], reverse=True)
    
    today = datetime.utcnow().date()
    
    # Check if there's a measurement today
    if measurement_dates[0] != today:
        return 0
    
    # Count consecutive days
    streak = 0
    expected_date = today
    
    for measurement_date in measurement_dates:
        if measurement_date == expected_date:
            streak += 1
            expected_date = expected_date - timedelta(days=1)
        else:
            break
    
    return streak


# ---------- Endpoint ----------
@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    current: TokenData = Depends(get_current_crew),
    db: Session = Depends(get_db),
):
    """
    Returns dashboard summary for authenticated crew member:
    - Latest measurement per metric with classified status
    - Streak of consecutive days with measurements
    - Five most recent open alerts
    - Today's reminders
    
    Requirement 4.1-4.4: Single query endpoint, status classification,
    streak calculation, responds within 800ms.
    """
    # Initialize alert engine components
    loader = AlertRuleLoader()
    loader.load()
    evaluator = ThresholdEvaluator()
    
    # 1. Get latest measurement per metric
    vitals: list[VitalStatus] = []
    
    # Query for latest measurements (using the same approach as latest_per_metric)
    from app.crud.measurements import latest_per_metric
    latest_measurements = latest_per_metric(db, current.crew_id)
    
    for measurement in latest_measurements:
        status = classify_status(
            measurement.metric,
            measurement.value,
            loader,
            evaluator
        )
        
        vitals.append(VitalStatus(
            metric=measurement.metric,
            value=measurement.value,
            unit=measurement.unit,
            status=status,
            timestamp=measurement.recorded_at
        ))
    
    # 2. Calculate streak days
    streak_days = calculate_streak_days(db, current.crew_id)
    
    # 3. Fetch five most recent open alerts
    alerts_query = (
        select(Alert)
        .where(Alert.crew_id == current.crew_id, Alert.status != "resolved")
        .order_by(Alert.created_at.desc())
        .limit(5)
    )
    recent_alerts = [AlertOut.model_validate(a) for a in db.scalars(alerts_query).all()]
    
    # 4. Fetch today's reminders (due_date = today)
    # Note: The Reminder model doesn't have a due_date field based on the model we saw,
    # it has schedule (cron-like). For now, we'll return all enabled reminders.
    # This may need adjustment based on actual business logic for "today's reminders"
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    reminders_query = (
        select(Reminder)
        .where(Reminder.crew_id == current.crew_id, Reminder.enabled == True)
    )
    todays_reminders = [ReminderOut.model_validate(r) for r in db.scalars(reminders_query).all()]
    
    return DashboardSummary(
        vitals=vitals,
        streak_days=streak_days,
        recent_alerts=recent_alerts,
        todays_reminders=todays_reminders
    )
