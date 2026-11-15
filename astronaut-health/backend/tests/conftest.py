"""Shared pytest fixtures for all tests."""
import os

os.environ["DATABASE_URL"] = "sqlite:///./test_astronaut.db"
os.environ["SECRET_KEY"] = "test-secret-key-for-jwt-testing-only"

import pytest
from fastapi.testclient import TestClient

from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.main import app


def _seed_alert_rules_for_tests(db):
    """Seed alert rules for tests."""
    from app.db.models import AlertRule as AlertRuleModel
    from app.services.alert_engine import AlertRuleLoader

    loader = AlertRuleLoader()
    rules = loader.load()

    for rule in rules:
        db_rule = AlertRuleModel(
            id=rule.id,
            metric=rule.metric,
            rule_type=rule.rule_type,
            params=rule.params.__dict__,
            severity=rule.severity,
            enabled=rule.enabled,
        )
        db.add(db_rule)
    db.commit()


@pytest.fixture()
def client():
    """Create a test client with a clean database."""
    from app.db import models  # noqa: F401
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)

    # Seed alert rules after database is created
    db = SessionLocal()
    try:
        _seed_alert_rules_for_tests(db)
    finally:
        db.close()

    with TestClient(app) as c:
        yield c


@pytest.fixture()
def db_session():
    """Create a database session for direct DB manipulation in tests."""
    from app.db import models  # noqa: F401
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)

    # Seed alert rules after database is created
    db = SessionLocal()
    try:
        _seed_alert_rules_for_tests(db)
        yield db
    finally:
        db.close()


@pytest.fixture()
def crew_id(client):
    """Create a test crew member and return their ID."""
    r = client.post("/api/v1/crew", json={"name": "Test", "pin": "1234", "age": 40})
    assert r.status_code == 201
    assert "pin" not in r.json() and "pin_hash" not in r.json()
    return r.json()["id"]
