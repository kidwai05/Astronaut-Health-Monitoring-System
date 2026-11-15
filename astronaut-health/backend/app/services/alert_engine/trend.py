"""TrendEvaluator — detects monotone rising or falling trends over a sliding window."""

from __future__ import annotations

from typing import Optional

from .loader import AlertRule, TrendParams
from .threshold import AlertFinding


class TrendEvaluator:
    """Pure-function evaluator for trend alert rules.

    Call :meth:`evaluate` with a loaded :class:`AlertRule` whose
    ``rule_type`` is ``"trend"`` and a list of recent readings ordered
    oldest-first (the current value is the last element).

    Returns an :class:`AlertFinding` when the last ``window`` readings
    form a strictly monotone sequence in the configured direction,
    or ``None`` otherwise.
    """

    def evaluate(
        self,
        rule: AlertRule,
        recent_readings: list[float],
    ) -> Optional[AlertFinding]:
        """Evaluate *recent_readings* for a sustained trend.

        Parameters
        ----------
        rule:
            An :class:`AlertRule` with ``rule_type == "trend"`` and
            ``params`` of type :class:`TrendParams`.
        recent_readings:
            Readings ordered oldest-first.  The current value must be
            the last element.

        Returns
        -------
        AlertFinding or None
        """
        params: TrendParams = rule.params  # type: ignore[assignment]
        window: int = params.window
        direction: str = params.direction

        if len(recent_readings) < window:
            return None

        window_readings = recent_readings[-window:]

        # Check every consecutive pair for strict monotonicity.
        for a, b in zip(window_readings, window_readings[1:]):
            if direction == "rising" and b <= a:
                return None
            if direction == "falling" and b >= a:
                return None

        message = (
            f"{rule.metric} has been {direction} for {window} consecutive readings"
        )
        return AlertFinding(
            rule_id=rule.id,
            rule_type="trend",
            metric=rule.metric,
            severity=rule.severity,
            message=message,
        )
