"""Tests for /api/v1/alerts endpoints."""
import pytest
from datetime import datetime


@pytest.fixture()
def auth_token(client, crew_id):
    """Get a valid JWT token for the test crew member."""
    response = client.post(
        "/api/v1/auth/login",
        json={"crew_id": crew_id, "pin": "1234"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture()
def auth_headers(auth_token):
    """Return authorization headers with JWT token."""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture()
def sample_alerts(db_session, crew_id):
    """Create sample alerts in the database."""
    from app.db.models import Alert
    
    alerts = [
        Alert(
            crew_id=crew_id,
            metric="heart_rate",
            severity="critical",
            message="Heart rate critically high",
            status="open",
            triggered_by_rule="threshold_heart_rate_critical_high"
        ),
        Alert(
            crew_id=crew_id,
            metric="glucose",
            severity="warning",
            message="Glucose level elevated",
            status="open",
            triggered_by_rule="threshold_glucose_warning_high"
        ),
        Alert(
            crew_id=crew_id,
            metric="spo2",
            severity="caution",
            message="SpO2 slightly low",
            status="acknowledged",
            triggered_by_rule="baseline_deviation_spo2"
        ),
        Alert(
            crew_id=crew_id,
            metric="temperature_c",
            severity="info",
            message="Temperature normal range",
            status="resolved",
            triggered_by_rule="threshold_temperature_info"
        ),
    ]
    
    for alert in alerts:
        db_session.add(alert)
    db_session.commit()
    
    return alerts


def test_list_alerts_all(client, auth_headers, sample_alerts, crew_id):
    """Test GET /api/v1/alerts returns all alerts for authenticated crew member."""
    response = client.get("/api/v1/alerts", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    
    # Should return all 4 alerts
    assert len(data) == 4
    
    # Should be ordered by created_at descending (most recent first)
    # All have same created_at in test, so just verify structure
    assert all("id" in alert for alert in data)
    assert all("severity" in alert for alert in data)
    assert all("status" in alert for alert in data)
    
    # Check that critical alert has flight_surgeon_contact flag
    critical_alerts = [a for a in data if a["severity"] == "critical"]
    assert len(critical_alerts) == 1
    assert critical_alerts[0]["flight_surgeon_contact"] is True
    
    # Check that non-critical alerts don't have the flag or it's False
    non_critical = [a for a in data if a["severity"] != "critical"]
    for alert in non_critical:
        assert alert.get("flight_surgeon_contact", False) is False


def test_list_alerts_filter_by_status(client, auth_headers, sample_alerts):
    """Test GET /api/v1/alerts with status filter."""
    # Filter by 'open' status
    response = client.get("/api/v1/alerts?status=open", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2  # 2 open alerts
    assert all(alert["status"] == "open" for alert in data)
    
    # Filter by 'acknowledged' status
    response = client.get("/api/v1/alerts?status=acknowledged", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["status"] == "acknowledged"
    
    # Filter by 'resolved' status
    response = client.get("/api/v1/alerts?status=resolved", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["status"] == "resolved"


def test_list_alerts_filter_by_severity(client, auth_headers, sample_alerts):
    """Test GET /api/v1/alerts with severity filter."""
    # Filter by 'critical' severity
    response = client.get("/api/v1/alerts?severity=critical", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["severity"] == "critical"
    assert data[0]["flight_surgeon_contact"] is True
    
    # Filter by 'warning' severity
    response = client.get("/api/v1/alerts?severity=warning", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["severity"] == "warning"


def test_list_alerts_filter_combined(client, auth_headers, sample_alerts):
    """Test GET /api/v1/alerts with both status and severity filters."""
    response = client.get(
        "/api/v1/alerts?status=open&severity=critical",
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["status"] == "open"
    assert data[0]["severity"] == "critical"


def test_list_alerts_requires_auth(client, sample_alerts):
    """Test GET /api/v1/alerts requires authentication."""
    response = client.get("/api/v1/alerts")
    assert response.status_code == 401


def test_patch_alert_acknowledge(client, auth_headers, sample_alerts):
    """Test PATCH /api/v1/alerts/{id} to acknowledge an open alert."""
    # Get the open critical alert
    response = client.get("/api/v1/alerts?status=open&severity=critical", headers=auth_headers)
    assert response.status_code == 200
    alert = response.json()[0]
    alert_id = alert["id"]
    
    # Acknowledge the alert
    response = client.patch(
        f"/api/v1/alerts/{alert_id}",
        json={"status": "acknowledged"},
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == alert_id
    assert data["status"] == "acknowledged"
    assert data["severity"] == "critical"
    assert data["flight_surgeon_contact"] is True


def test_patch_alert_resolve_from_open(client, auth_headers, sample_alerts):
    """Test PATCH /api/v1/alerts/{id} to resolve an open alert."""
    # Get an open alert
    response = client.get("/api/v1/alerts?status=open&severity=warning", headers=auth_headers)
    assert response.status_code == 200
    alert = response.json()[0]
    alert_id = alert["id"]
    
    # Resolve the alert directly from open
    response = client.patch(
        f"/api/v1/alerts/{alert_id}",
        json={"status": "resolved"},
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == alert_id
    assert data["status"] == "resolved"


def test_patch_alert_resolve_from_acknowledged(client, auth_headers, sample_alerts):
    """Test PATCH /api/v1/alerts/{id} to resolve an acknowledged alert."""
    # Get the acknowledged alert
    response = client.get("/api/v1/alerts?status=acknowledged", headers=auth_headers)
    assert response.status_code == 200
    alert = response.json()[0]
    alert_id = alert["id"]
    
    # Resolve the acknowledged alert
    response = client.patch(
        f"/api/v1/alerts/{alert_id}",
        json={"status": "resolved"},
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == alert_id
    assert data["status"] == "resolved"


def test_patch_alert_cannot_reopen_resolved(client, auth_headers, sample_alerts):
    """Test PATCH /api/v1/alerts/{id} returns 422 when trying to reopen a resolved alert."""
    # Get the resolved alert
    response = client.get("/api/v1/alerts?status=resolved", headers=auth_headers)
    assert response.status_code == 200
    alert = response.json()[0]
    alert_id = alert["id"]
    
    # Try to reopen (acknowledge) - should fail
    response = client.patch(
        f"/api/v1/alerts/{alert_id}",
        json={"status": "acknowledged"},
        headers=auth_headers
    )
    
    assert response.status_code == 422
    assert "cannot be reopened" in response.json()["detail"].lower()


def test_patch_alert_not_found(client, auth_headers):
    """Test PATCH /api/v1/alerts/{id} returns 404 for non-existent alert."""
    response = client.patch(
        "/api/v1/alerts/non-existent-id",
        json={"status": "acknowledged"},
        headers=auth_headers
    )
    
    assert response.status_code == 404


def test_patch_alert_forbidden_wrong_crew(client, sample_alerts):
    """Test PATCH /api/v1/alerts/{id} returns 403 when alert belongs to another crew member."""
    # Create a different crew member
    response = client.post("/api/v1/crew", json={"name": "Other", "pin": "5678", "age": 35})
    assert response.status_code == 201
    other_crew_id = response.json()["id"]
    
    # Get auth token for the other crew member
    response = client.post(
        "/api/v1/auth/login",
        json={"crew_id": other_crew_id, "pin": "5678"}
    )
    assert response.status_code == 200
    other_token = response.json()["access_token"]
    other_headers = {"Authorization": f"Bearer {other_token}"}
    
    # Try to update an alert that belongs to the first crew member
    alert_id = sample_alerts[0].id
    response = client.patch(
        f"/api/v1/alerts/{alert_id}",
        json={"status": "acknowledged"},
        headers=other_headers
    )
    
    assert response.status_code == 403


def test_patch_alert_requires_auth(client, sample_alerts):
    """Test PATCH /api/v1/alerts/{id} requires authentication."""
    alert_id = sample_alerts[0].id
    response = client.patch(
        f"/api/v1/alerts/{alert_id}",
        json={"status": "acknowledged"}
    )
    
    assert response.status_code == 401
