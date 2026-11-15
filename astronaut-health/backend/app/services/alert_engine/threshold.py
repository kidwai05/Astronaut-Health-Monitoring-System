"""ThresholdEvaluator — evaluates a threshold AlertRule against a single measurement value."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from .loader import AlertRule, ThresholdParams


# ---------------------------------------------------------------------------
# AlertFinding — shared result dataclass for all evaluator modules
# ---------------------------------------------------------------------------


@dataclass
class AlertFinding:
    rule_id: str
    rule_type: str   # "threshold" | "baseline_deviation" | "trend"
    metric: str
    severity: str    # "info" | "caution" | "warning" | "critical"
    message: str


# Severity rank: higher number = higher priority
_SEVERITY_RANK: dict[str, int] = {
    "info": 0,
    "caution": 1,
    "warning": 2,
    "critical": 3,
}


# ---------------------------------------------------------------------------
# ThresholdEvaluator
# ---------------------------------------------------------------------------


class ThresholdEvaluator:
    """Pure-function evaluator for threshold alert rules.

    Severity priority: critical > warning > caution > info.
    Returns the highest-severity :class:`AlertFinding` that fires, or
    ``None`` when no boundary is crossed.

    Boundary semantics (all comparisons are strict):
      low_critical  fires when value <  low_critical
      low_warning   fires when value <  low_warning  AND NOT already in low_critical zone
                    (i.e. when low_critical is None OR value >= low_critical)
      high_critical fires when value >  high_critical
      high_warning  fires when value >  high_warning AND NOT already in high_critical zone
                    (i.e. when high_critical is None OR value <= high_critical)
    """

    def evaluate(self, rule: AlertRule, value: float) -> Optional[AlertFinding]:
        params: ThresholdParams = rule.params  # type: ignore[assignment]

        best_severity: Optional[str] = None
        best_message: Optional[str] = None

        def _try(severity: str, message: str) -> None:
            nonlocal best_severity, best_message
            if best_severity is None or _SEVERITY_RANK[severity] > _SEVERITY_RANK[best_severity]:
                best_severity = severity
                best_message = message

        # --- low side (mutually exclusive: critical takes precedence over warning) ---
        if params.low_critical is not None and value < params.low_critical:
            _try(
                "critical",
                f"{rule.metric} {value} is critically low (threshold: {params.low_critical})",
            )
        elif params.low_warning is not None and value < params.low_warning:
            _try(
                "warning",
                f"{rule.metric} {value} is low (threshold: {params.low_warning})",
            )

        # --- high side (mutually exclusive: critical takes precedence over warning) ---
        if params.high_critical is not None and value > params.high_critical:
            _try(
                "critical",
                f"{rule.metric} {value} is critically high (threshold: {params.high_critical})",
            )
        elif params.high_warning is not None and value > params.high_warning:
            _try(
                "warning",
                f"{rule.metric} {value} is high (threshold: {params.high_warning})",
            )

        if best_severity is None:
            return None

        return AlertFinding(
            rule_id=rule.id,
            rule_type="threshold",
            metric=rule.metric,
            severity=best_severity,
            message=best_message,  # type: ignore[arg-type]
        )
