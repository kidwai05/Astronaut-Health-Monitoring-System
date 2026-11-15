"""AlertRuleLoader — loads and validates alert rules from shared/alert-rules/default_rules.json."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, Optional, Union

import jsonschema

# ---------------------------------------------------------------------------
# Resolve paths relative to this file so the loader works regardless of CWD.
# loader.py lives at: <root>/backend/app/services/alert_engine/loader.py
# shared/ lives at:  <root>/shared/
# ---------------------------------------------------------------------------
_THIS_FILE = Path(__file__).resolve()
_SHARED_DIR = _THIS_FILE.parents[4] / "shared" / "alert-rules"
_RULES_PATH = _SHARED_DIR / "default_rules.json"
_SCHEMA_PATH = _SHARED_DIR / "schema.json"


# ---------------------------------------------------------------------------
# Typed parameter dataclasses
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ThresholdParams:
    low_critical: Optional[float] = None
    low_warning: Optional[float] = None
    high_warning: Optional[float] = None
    high_critical: Optional[float] = None


@dataclass(frozen=True)
class BaselineDeviationParams:
    z_score_threshold: float = 2.0


@dataclass(frozen=True)
class TrendParams:
    window: int = 5
    direction: Literal["rising", "falling"] = "rising"


# ---------------------------------------------------------------------------
# Top-level AlertRule dataclass
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class AlertRule:
    id: str
    metric: str
    rule_type: Literal["threshold", "baseline_deviation", "trend"]
    severity: Literal["info", "caution", "warning", "critical"]
    enabled: bool
    params: Union[ThresholdParams, BaselineDeviationParams, TrendParams]
    description: str = ""


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _load_schema() -> dict:
    with _SCHEMA_PATH.open(encoding="utf-8-sig") as fh:
        return json.load(fh)


def _parse_params(
    rule_type: str, raw_params: dict
) -> Union[ThresholdParams, BaselineDeviationParams, TrendParams]:
    if rule_type == "threshold":
        return ThresholdParams(
            low_critical=raw_params.get("low_critical"),
            low_warning=raw_params.get("low_warning"),
            high_warning=raw_params.get("high_warning"),
            high_critical=raw_params.get("high_critical"),
        )
    if rule_type == "baseline_deviation":
        return BaselineDeviationParams(
            z_score_threshold=raw_params["z_score_threshold"]
        )
    if rule_type == "trend":
        return TrendParams(
            window=raw_params["window"],
            direction=raw_params["direction"],
        )
    raise ValueError(f"Unknown rule_type: {rule_type!r}")


def _parse_rule(raw: dict) -> AlertRule:
    return AlertRule(
        id=raw["id"],
        metric=raw["metric"],
        rule_type=raw["rule_type"],
        severity=raw["severity"],
        enabled=raw["enabled"],
        params=_parse_params(raw["rule_type"], raw["params"]),
        description=raw.get("description", ""),
    )


# ---------------------------------------------------------------------------
# AlertRuleLoader
# ---------------------------------------------------------------------------


class AlertRuleLoader:
    """Loads, validates, and provides access to alert rules.

    Usage::

        loader = AlertRuleLoader()
        rules = loader.load()
        hr_rules = loader.get_rules_for_metric("heart_rate")
        active  = loader.get_enabled_rules()
    """

    def __init__(
        self,
        rules_path: Path = _RULES_PATH,
        schema_path: Path = _SCHEMA_PATH,
    ) -> None:
        self._rules_path = rules_path
        self._schema_path = schema_path
        self._rules: Optional[list[AlertRule]] = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def load(self) -> list[AlertRule]:
        """Read default_rules.json, validate every rule, and return parsed objects.

        Raises:
            FileNotFoundError: if the JSON file or schema cannot be found.
            ValueError: if any rule fails JSON-schema validation.
        """
        schema = _load_schema()

        with self._rules_path.open(encoding="utf-8") as fh:
            raw_rules: list[dict] = json.load(fh)

        validator = jsonschema.Draft7Validator(schema)

        parsed: list[AlertRule] = []
        for raw in raw_rules:
            errors = list(validator.iter_errors(raw))
            if errors:
                messages = "; ".join(e.message for e in errors)
                raise ValueError(
                    f"Alert rule {raw.get('id', '<unknown>')!r} failed schema "
                    f"validation: {messages}"
                )
            parsed.append(_parse_rule(raw))

        self._rules = parsed
        return parsed

    def get_rules_for_metric(self, metric: str) -> list[AlertRule]:
        """Return all rules (enabled or not) for the given metric name."""
        return [r for r in self._get_loaded() if r.metric == metric]

    def get_enabled_rules(self) -> list[AlertRule]:
        """Return all rules where enabled=True."""
        return [r for r in self._get_loaded() if r.enabled]

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_loaded(self) -> list[AlertRule]:
        """Return cached rules, loading them on first access."""
        if self._rules is None:
            self.load()
        return self._rules  # type: ignore[return-value]
