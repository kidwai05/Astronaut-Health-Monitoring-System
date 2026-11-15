"""Range checks for vitals (FR-12). Rejects impossible values, not merely abnormal ones."""

# metric -> (default unit, hard_min, hard_max)
METRIC_SPECS: dict[str, tuple[str, float, float]] = {
    "heart_rate": ("bpm", 20, 250),
    "systolic": ("mmHg", 50, 260),
    "diastolic": ("mmHg", 30, 160),
    "glucose": ("mg/dL", 20, 600),
    "temperature": ("C", 30, 43),
    "spo2": ("%", 50, 100),
    "weight": ("kg", 20, 300),
}

# Aliases accepted from wearable feeds
METRIC_ALIASES = {"hr": "heart_rate", "pulse": "heart_rate", "temp": "temperature",
                  "sys": "systolic", "dia": "diastolic", "blood_glucose": "glucose", "o2sat": "spo2"}


def normalize_metric(name: str) -> str:
    name = name.strip().lower()
    return METRIC_ALIASES.get(name, name)


def validate_measurement(metric: str, value: float) -> str:
    """Returns the default unit; raises ValueError for unknown metrics or impossible values."""
    if metric not in METRIC_SPECS:
        raise ValueError(f"Unknown metric '{metric}'. Allowed: {', '.join(METRIC_SPECS)}")
    unit, lo, hi = METRIC_SPECS[metric]
    if not (lo <= value <= hi):
        raise ValueError(f"{metric} value {value} is outside the possible range {lo}-{hi} {unit}")
    return unit
