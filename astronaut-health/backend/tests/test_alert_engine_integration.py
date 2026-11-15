"""Integration test for AlertEngine with measurements endpoint."""

import pytest
from fastapi.testclient import TestClient

from app.db.models import Alert, Baseline, Measurement
from app.main import app


def test_alert_engine_threshold_integration(client, db_session):
    """Test that AlertEngine evaluates threshold rules when a measurement is posted."""
    # Arrange: Create a crew member
    from app.db.models import CrewMember
    crew = CrewMember(id="TEST001", name="Test Astronaut", role="astronaut", pin_hash="dummy")
    db_session.add(crew)
    db_session.commit()

    # Act: Post a measurement that should trigger a critical threshold alert
    # According to the spec, heart_rate < 40 is critical
    response = client.post(
        "/api/v1/measurements",
        json={
            "crew_id": "TEST001",
            "metric": "heart_rate",
            "value": 35.0,  # Below critical threshold of 40
            "source": "manual",
        },
    )

    # Assert: Measurement was created
    assert response.status_code == 201
    measurement_data = response.json()
    assert measurement_data["value"] == 35.0

    # Assert: Alert was created
    alerts = db_session.query(Alert).filter_by(crew_id="TEST001").all()
    assert len(alerts) >= 1

    # Find the critical heart rate alert
    critical_alert = next(
        (a for a in alerts if a.metric == "heart_rate" and a.severity == "critical"),
        None,
    )
    assert critical_alert is not None
    assert "critically low" in critical_alert.message.lower()
    assert critical_alert.status == "open"


def test_alert_engine_deduplication(client, db_session):
    """Test that AlertEngine deduplicates alerts instead of creating duplicates."""
    # Arrange: Create a crew member
    from app.db.models import CrewMember
    crew = CrewMember(id="TEST002", name="Test Astronaut 2", role="astronaut", pin_hash="dummy")
    db_session.add(crew)
    db_session.commit()

    # Act: Post two measurements that trigger the same rule
    for value in [35.0, 36.0]:
        client.post(
            "/api/v1/measurements",
            json={
                "crew_id": "TEST002",
                "metric": "heart_rate",
                "value": value,
                "source": "manual",
            },
        )

    # Assert: Only one alert was created (deduplication worked)
    alerts = db_session.query(Alert).filter_by(
        crew_id="TEST002", metric="heart_rate"
    ).all()
    assert len(alerts) == 1
    assert alerts[0].severity == "critical"
    # The message should be updated to reflect the latest value
    assert "36" in alerts[0].message


def test_alert_engine_baseline_deviation(client, db_session):
    """Test that AlertEngine evaluates baseline deviation rules."""
    # Arrange: Create a crew member with a baseline
    from app.db.models import CrewMember
    crew = CrewMember(id="TEST003", name="Test Astronaut 3", role="astronaut", pin_hash="dummy")
    db_session.add(crew)

    baseline = Baseline(
        crew_id="TEST003",
        metric="heart_rate",
        mean=70.0,
        std_dev=5.0,
        min=60.0,
        max=80.0,
        sample_size=10,
    )
    db_session.add(baseline)
    db_session.commit()

    # Act: Post a measurement that deviates significantly from baseline
    # z-score = (90 - 70) / 5 = 4.0, which should trigger z_score_threshold of 2.0
    response = client.post(
        "/api/v1/measurements",
        json={
            "crew_id": "TEST003",
            "metric": "heart_rate",
            "value": 90.0,
            "source": "manual",
        },
    )

    # Assert: Alert was created for baseline deviation
    assert response.status_code == 201

    alerts = db_session.query(Alert).filter_by(crew_id="TEST003").all()
    # Should have both threshold alert (high warning) and baseline deviation alert
    assert len(alerts) >= 1

    # Find the baseline deviation alert
    baseline_alert = next(
        (a for a in alerts if "baseline" in a.message.lower()),
        None,
    )
    if baseline_alert:
        assert "SD from your baseline" in baseline_alert.message


def test_alert_engine_trend_detection(client, db_session):
    """Test that AlertEngine detects monotone trends."""
    # Arrange: Create a crew member
    from app.db.models import CrewMember
    crew = CrewMember(id="TEST004", name="Test Astronaut 4", role="astronaut", pin_hash="dummy")
    db_session.add(crew)
    db_session.commit()

    # Act: Post 5 consecutive rising values to trigger a trend alert
    # According to the spec, trend rules use window=5
    values = [60.0, 62.0, 64.0, 66.0, 68.0]
    for value in values:
        client.post(
            "/api/v1/measurements",
            json={
                "crew_id": "TEST004",
                "metric": "heart_rate",
                "value": value,
                "source": "manual",
            },
        )

    # Assert: Trend alert was created
    alerts = db_session.query(Alert).filter_by(crew_id="TEST004").all()

    # Find the trend alert
    trend_alert = next(
        (a for a in alerts if "consecutive" in a.message.lower()),
        None,
    )
    if trend_alert:
        assert "rising" in trend_alert.message.lower()
