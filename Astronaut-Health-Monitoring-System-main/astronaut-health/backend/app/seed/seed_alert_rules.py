"""Starting thresholds from the build plan, section 5.3.
ILLUSTRATIVE ONLY - to be reviewed by medical professionals. Ranges are [lo, hi) per severity."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import AlertRule

BIG = 10_000
DEFAULT_RULES = [
    # metric, severity, ranges
    ("heart_rate", "caution", [[50, 60], [100, 120]]),
    ("heart_rate", "warning", [[0, 45], [120, BIG]]),
    ("systolic", "caution", [[120, 140]]),
    ("systolic", "warning", [[140, 180]]),
    ("systolic", "critical", [[180, BIG]]),
    ("diastolic", "caution", [[80, 90]]),
    ("diastolic", "warning", [[90, 120]]),
    ("diastolic", "critical", [[120, BIG]]),
    ("glucose", "caution", [[60, 70], [100, 126]]),
    ("glucose", "warning", [[0, 60], [126, BIG]]),
    ("temperature", "caution", [[37.3, 38.0]]),
    ("temperature", "warning", [[38.0, BIG]]),
    ("spo2", "caution", [[92, 95]]),
    ("spo2", "warning", [[0, 92]]),
]


def seed_alert_rules(db: Session) -> int:
    if db.scalar(select(AlertRule.id).limit(1)):
        return 0
    for metric, sev, ranges in DEFAULT_RULES:
        db.add(AlertRule(metric=metric, rule_type="threshold", severity=sev,
                         params={"ranges": ranges, "status": "to be reviewed by medical professionals"}))
    db.flush()
    return len(DEFAULT_RULES)
