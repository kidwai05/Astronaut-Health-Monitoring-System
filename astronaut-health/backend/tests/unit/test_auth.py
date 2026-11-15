"""Unit tests for the auth endpoint."""
import pytest
from jose import jwt

from app.config import get_settings
from app.core.security import hash_pin
from app.db.models import CrewMember


def test_login_success(client, db_session):
    """Test successful login with valid credentials."""
    # Create a test crew member with a PIN
    pin = "1234"
    crew_member = CrewMember(
        id="test-crew-001",
        name="Test Astronaut",
        role="astronaut",
        pin_hash=hash_pin(pin),
    )
    db_session.add(crew_member)
    db_session.commit()

    # Attempt login
    response = client.post(
        "/api/v1/auth/login",
        json={"crew_id": "test-crew-001", "pin": pin},
    )

    # Verify response
    assert response.status_code == 200
    data = response.json()
    assert data["token_type"] == "bearer"
    assert data["crew_id"] == "test-crew-001"
    assert data["role"] == "astronaut"
    assert "access_token" in data

    # Verify JWT claims
    token = data["access_token"]
    settings = get_settings()
    decoded = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
    assert decoded["sub"] == "test-crew-001"
    assert decoded["role"] == "astronaut"
    assert "exp" in decoded


def test_login_invalid_crew_id(client, db_session):
    """Test login with non-existent crew ID."""
    response = client.post(
        "/api/v1/auth/login",
        json={"crew_id": "nonexistent", "pin": "1234"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_login_invalid_pin(client, db_session):
    """Test login with incorrect PIN."""
    # Create a test crew member with a PIN
    crew_member = CrewMember(
        id="test-crew-002",
        name="Test Astronaut 2",
        role="astronaut",
        pin_hash=hash_pin("1234"),
    )
    db_session.add(crew_member)
    db_session.commit()

    # Attempt login with wrong PIN
    response = client.post(
        "/api/v1/auth/login",
        json={"crew_id": "test-crew-002", "pin": "9999"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_login_no_pin_hash(client, db_session):
    """Test login when crew member has no PIN set."""
    # Create a test crew member without a PIN
    crew_member = CrewMember(
        id="test-crew-003",
        name="Test Astronaut 3",
        role="astronaut",
        pin_hash=None,
    )
    db_session.add(crew_member)
    db_session.commit()

    # Attempt login
    response = client.post(
        "/api/v1/auth/login",
        json={"crew_id": "test-crew-003", "pin": "1234"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_jwt_expiry_one_hour(client, db_session):
    """Test that JWT expires in 3600 seconds (1 hour)."""
    import time
    from datetime import datetime

    # Create a test crew member
    crew_member = CrewMember(
        id="test-crew-004",
        name="Test Astronaut 4",
        role="flight_surgeon",
        pin_hash=hash_pin("5678"),
    )
    db_session.add(crew_member)
    db_session.commit()

    # Login and get token
    before = datetime.utcnow()
    response = client.post(
        "/api/v1/auth/login",
        json={"crew_id": "test-crew-004", "pin": "5678"},
    )
    after = datetime.utcnow()

    # Decode and check expiry
    token = response.json()["access_token"]
    settings = get_settings()
    decoded = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
    
    exp_timestamp = decoded["exp"]
    exp_datetime = datetime.utcfromtimestamp(exp_timestamp)
    
    # Should be approximately 3600 seconds (1 hour) from now
    # Allow a few seconds tolerance for test execution time
    delta_seconds = (exp_datetime - before).total_seconds()
    assert 3595 <= delta_seconds <= 3605, f"Expected ~3600s, got {delta_seconds}s"
