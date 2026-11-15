"""AlertEngine — orchestrates all three rule types and manages alert lifecycle."""

from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Alert, Baseline, Measurement
from app.services.alert_engine.baseline_dev import BaselineDeviationEvaluator, BaselineInput
from app.services.alert_engine.loader import AlertRuleLoader
from app.services.alert_engine.threshold import AlertFinding, ThresholdEvaluator
from app.services.alert_engine.trend import TrendEvaluator

if TYPE_CHECKING:
    from app.api.v1.ws import ConnectionManager


class AlertEngine:
    """Orchestrates evaluation of all three rule types and manages alert lifecycle.

    The engine evaluates threshold, baseline_deviation, and trend rules against
    incoming measurements, deduplicates alerts, and publishes critical alerts
    via WebSocket.

    Usage::

        loader = AlertRuleLoader()
        loader.load()
        engine = AlertEngine(loader)

        # After persisting a measurement:
        alerts = engine.evaluate(measurement, db)

    Performance target: complete within 500ms for a single measurement.
    """

    def __init__(
        self,
        loader: AlertRuleLoader,
        connection_manager: Optional[ConnectionManager] = None,
    ):
        """Initialize the alert engine.

        Args:
            loader: Loaded AlertRuleLoader with rules from default_rules.json
            connection_manager: WebSocket connection manager for critical alerts.
                               If None, WebSocket publishing is skipped.
        """
        self._loader = loader
        self._threshold_eval = ThresholdEvaluator()
        self._baseline_eval = BaselineDeviationEvaluator()
        self._trend_eval = TrendEvaluator()
        self._connection_manager = connection_manager

    def evaluate(self, measurement: Measurement, db: Session) -> list[Alert]:
        """Evaluate all enabled rules for a measurement and manage alert lifecycle.

        This method:
        1. Retrieves all enabled rules for the measurement's metric
        2. Evaluates each rule type (threshold, baseline_deviation, trend)
        3. Deduplicates alerts (updates existing open alerts instead of creating duplicates)
        4. Publishes critical alerts via WebSocket
        5. Returns all inserted/updated Alert records

        Args:
            measurement: The newly persisted Measurement to evaluate
            db: Active SQLAlchemy session (same transaction as measurement persistence)

        Returns:
            List of Alert records that were inserted or updated

        Performance:
            Targets completion within 500ms on development hardware.
        """
        rules = [
            r for r in self._loader.get_rules_for_metric(measurement.metric)
            if r.enabled
        ]

        result_alerts: list[Alert] = []

        for rule in rules:
            finding: Optional[AlertFinding] = None

            # Dispatch to appropriate evaluator based on rule type
            if rule.rule_type == "threshold":
                finding = self._threshold_eval.evaluate(rule, measurement.value)

            elif rule.rule_type == "baseline_deviation":
                # Fetch the crew's baseline for this metric
                baseline_row = db.scalar(
                    select(Baseline).where(
                        Baseline.crew_id == measurement.crew_id,
                        Baseline.metric == measurement.metric,
                    )
                )
                if baseline_row and baseline_row.sample_size >= 3:
                    baseline_input = BaselineInput(
                        mean=baseline_row.mean,
                        std_dev=baseline_row.std_dev,
                        sample_size=baseline_row.sample_size,
                    )
                    finding = self._baseline_eval.evaluate(
                        rule, measurement.value, baseline_input
                    )
                # else: skip rule if no baseline or insufficient samples

            elif rule.rule_type == "trend":
                # Query the last N measurements (window size) for this crew+metric
                window = rule.params.window  # type: ignore[attr-defined]
                recent = list(
                    db.scalars(
                        select(Measurement.value)
                        .where(
                            Measurement.crew_id == measurement.crew_id,
                            Measurement.metric == measurement.metric,
                        )
                        .order_by(Measurement.recorded_at.asc())
                        .limit(window)
                    )
                )
                finding = self._trend_eval.evaluate(rule, recent)

            if finding is None:
                continue

            # Deduplication: check for existing open alert with same crew_id, metric, and rule
            existing_alert = db.scalar(
                select(Alert).where(
                    Alert.crew_id == measurement.crew_id,
                    Alert.metric == measurement.metric,
                    Alert.triggered_by_rule == rule.id,
                    Alert.status == "open",
                )
            )

            if existing_alert:
                # Update existing alert's message and updated_at
                existing_alert.message = finding.message
                # SQLAlchemy's TimestampMixin automatically updates updated_at on modification
                alert = existing_alert
            else:
                # Insert new alert
                alert = Alert(
                    crew_id=measurement.crew_id,
                    metric=finding.metric,
                    severity=finding.severity,
                    message=finding.message,
                    triggered_by_rule=rule.id,
                    status="open",
                )
                db.add(alert)

            # Flush to get the alert ID for WebSocket publishing
            db.flush()
            result_alerts.append(alert)

            # Publish critical alerts via WebSocket
            if finding.severity == "critical" and self._connection_manager:
                # Schedule WebSocket publishing
                # Check if there's a running event loop
                try:
                    import asyncio
                    loop = asyncio.get_running_loop()
                    # If we have a loop, create the task
                    asyncio.create_task(
                        self._connection_manager.publish(
                            measurement.crew_id,
                            {
                                "id": alert.id,
                                "crew_id": alert.crew_id,
                                "metric": alert.metric,
                                "severity": alert.severity,
                                "message": alert.message,
                                "triggered_by_rule": alert.triggered_by_rule,
                                "status": alert.status,
                                "created_at": alert.created_at.isoformat(),
                                "updated_at": alert.updated_at.isoformat(),
                            },
                        )
                    )
                except RuntimeError:
                    # No event loop - skip WebSocket publishing (e.g., in sync context or tests)
                    pass

        return result_alerts
