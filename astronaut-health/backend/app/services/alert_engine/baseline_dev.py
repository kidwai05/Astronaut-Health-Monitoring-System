"""BaselineDeviationEvaluator — z-score deviation from a personal baseline."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from app.services.alert_engine.loader import AlertRule, BaselineDeviationParams
from app.services.alert_engine.threshold import AlertFinding

# Minimum number of samples required before a baseline is considered reliable.
_MIN_SAMPLE_SIZE = 3


# ---------------------------------------------------------------------------
# Input type
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class BaselineInput:
    """Summary statistics describing an astronaut's personal baseline for one metric."""

    mean: float
    std_dev: float
    sample_size: int


# ---------------------------------------------------------------------------
# BaselineDeviationEvaluator
# ---------------------------------------------------------------------------


class BaselineDeviationEvaluator:
    """Evaluates a baseline_deviation-type AlertRule via z-score comparison.

    A finding is returned when the absolute z-score of *value* relative to the
    astronaut's personal *baseline* meets or exceeds the threshold defined in
    the rule parameters.

    The evaluator returns ``None`` (no alert) in any of these cases:

    * ``baseline`` is ``None`` — no baseline has been established yet.
    * ``baseline.sample_size < 3`` — too few measurements for a reliable baseline.
    * ``baseline.std_dev == 0`` — no spread in the baseline data; z-score is
      undefined and the evaluator conservatively skips the alert.

    Usage::

        evaluator = BaselineDeviationEvaluator()
        finding = evaluator.evaluate(rule, value=112.0, baseline=BaselineInput(...))
        if finding:
            print(finding.message)
    """

    def evaluate(
        self,
        rule: AlertRule,
        value: float,
        baseline: Optional[BaselineInput],
    ) -> Optional[AlertFinding]:
        """Evaluate *value* against the astronaut's *baseline* for *rule*.

        Args:
            rule:     An :class:`~loader.AlertRule` whose ``params`` is a
                      :class:`~loader.BaselineDeviationParams`.
            value:    The newly recorded measurement value.
            baseline: Personal baseline statistics, or ``None`` if unavailable.

        Returns:
            An :class:`~threshold.AlertFinding` when the z-score meets or
            exceeds the threshold, otherwise ``None``.

        Raises:
            TypeError: if ``rule.params`` is not :class:`~loader.BaselineDeviationParams`.
        """
        if not isinstance(rule.params, BaselineDeviationParams):
            raise TypeError(
                f"BaselineDeviationEvaluator requires BaselineDeviationParams, "
                f"got {type(rule.params).__name__}"
            )

        # Guard: baseline must be present, sufficiently populated, and have spread.
        if baseline is None:
            return None
        if baseline.sample_size < _MIN_SAMPLE_SIZE:
            return None
        if baseline.std_dev == 0:
            return None

        params: BaselineDeviationParams = rule.params
        z_score = abs(value - baseline.mean) / baseline.std_dev

        if z_score >= params.z_score_threshold:
            message = (
                f"{rule.metric} value is {z_score:.2f} SD from your baseline "
                f"(baseline {baseline.mean:.2f}\u00b1{baseline.std_dev:.2f})"
            )
            return AlertFinding(
                rule_id=rule.id,
                rule_type="baseline_deviation",
                metric=rule.metric,
                severity=rule.severity,
                message=message,
            )

        return None
