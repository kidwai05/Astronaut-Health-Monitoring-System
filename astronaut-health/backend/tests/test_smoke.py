import os

os.environ["DATABASE_URL"] = "sqlite:///./test_astronaut.db"

import pytest
from fastapi.testclient import TestClient

from app.db.base import Base
from app.db.session import engine
from app.main import app


@pytest.fixture()
def client():
    from app.db import models  # noqa: F401
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def crew_id(client):
    r = client.post("/api/v1/crew", json={"name": "Test", "pin": "1234", "age": 40})
    assert r.status_code == 201
    assert "pin" not in r.json() and "pin_hash" not in r.json()
    return r.json()["id"]


def test_measurement_roundtrip_and_validation(client, crew_id):
    ok = client.post("/api/v1/measurements", json={"crew_id": crew_id, "metric": "heart_rate", "value": 64})
    assert ok.status_code == 201 and ok.json()["unit"] == "bpm"
    assert client.post("/api/v1/measurements", json={"crew_id": crew_id, "metric": "heart_rate", "value": 900}).status_code == 422
    assert client.post("/api/v1/measurements", json={"crew_id": crew_id, "metric": "mood", "value": 3}).status_code == 422
    assert client.post("/api/v1/measurements", json={"crew_id": "nope", "metric": "heart_rate", "value": 60}).status_code == 404
    assert len(client.get(f"/api/v1/measurements/latest?crew_id={crew_id}").json()) == 1


def test_client_uuid_is_idempotent(client, crew_id):
    body = {"id": "11111111-1111-1111-1111-111111111111", "crew_id": crew_id, "metric": "spo2", "value": 97}
    client.post("/api/v1/measurements", json=body)
    client.post("/api/v1/measurements", json=body)
    assert len(client.get(f"/api/v1/measurements?crew_id={crew_id}").json()) == 1


def test_wearable_import_dedupes_and_baseline(client, crew_id):
    feed = [{"timestamp": f"2026-11-0{d}T08:00:00Z", "hr": 60 + d, "spo2": 97} for d in range(1, 6)]
    feed.append({"timestamp": "bad", "hr": 60})
    r1 = client.post(f"/api/v1/measurements/import/wearable-json?crew_id={crew_id}", json=feed).json()
    r2 = client.post(f"/api/v1/measurements/import/wearable-json?crew_id={crew_id}", json=feed).json()
    assert r1["imported"] == 10 and len(r1["errors"]) == 1
    assert len(client.get(f"/api/v1/measurements?crew_id={crew_id}").json()) == 10
    bl = client.post(f"/api/v1/crew/{crew_id}/baselines/compute").json()
    hr = next(b for b in bl if b["metric"] == "heart_rate")
    assert hr["sample_size"] == 5 and abs(hr["mean"] - 63) < 1e-6


def test_logs(client, crew_id):
    s = client.post("/api/v1/sleep", json={"crew_id": crew_id, "sleep_start": "2026-11-01T22:00:00Z",
                                            "sleep_end": "2026-11-02T05:30:00Z", "quality": 4})
    assert s.status_code == 201 and s.json()["duration_h"] == 7.5
    assert client.post("/api/v1/mood", json={"crew_id": crew_id, "mood": 9, "stress": 1, "energy": 3}).status_code == 422
    assert client.post("/api/v1/mood", json={"crew_id": crew_id, "mood": 4, "stress": 2, "energy": 3, "tags": ["tired"]}).status_code == 201
    assert client.post("/api/v1/symptoms", json={"crew_id": crew_id, "body_region": "eyes", "symptom_type": "vision change", "severity": 3}).status_code == 201


def test_sync_last_write_wins(client, crew_id):
    eid = "22222222-2222-2222-2222-222222222222"
    def item(val, ts):
        return {"entity": "measurements", "entity_id": eid, "updated_at": ts,
                "payload": {"crew_id": crew_id, "metric": "heart_rate", "value": val, "recorded_at": "2026-11-01T08:00:00Z"}}
    r = client.post("/api/v1/sync/push", json={"items": [item(70, "2026-11-01T09:00:00Z")]}).json()
    assert r["applied"] == 1
    r = client.post("/api/v1/sync/push", json={"items": [item(55, "2026-11-01T08:00:00Z")]}).json()
    assert r["stale"] == 1  # older write rejected
    bad = client.post("/api/v1/sync/push", json={"items": [{"entity": "nope", "entity_id": "x"}]}).json()
    assert bad["errors"] == 1
    pulled = client.get(f"/api/v1/sync/pull?crew_id={crew_id}").json()
    assert pulled["changes"]["measurements"][0]["value"] == 70


def test_space_weather_cache_and_risk(client):
    from app.db.session import SessionLocal
    from app.db.base import utcnow
    from app.services import donki_client
    db = SessionLocal()
    donki_client.cache_events(db, [{"source_id": "FLR-1", "type": "flare", "start_time": utcnow(),
                                    "event_class": "M5.2", "raw": {}}])
    db.commit(); db.close()
    r = client.get("/api/v1/space-weather/recent").json()
    assert r["risk"]["level"] == "Elevated" and len(r["events"]) == 1


def test_demo_seed():
    from app.seed import seed_demo_mission
    Base.metadata.drop_all(engine)
    cid = seed_demo_mission.run()
    with TestClient(app) as c:
        assert len(c.get(f"/api/v1/crew/{cid}/baselines").json()) >= 5


def test_wearable_csv_body(client, crew_id):
    csv_text = "timestamp,heart_rate,temp\n2026-11-01T08:00:00Z,61,36.6\n2026-11-02T08:00:00Z,63,36.7\n"
    r = client.post(f"/api/v1/measurements/import/wearable-csv?crew_id={crew_id}", content=csv_text,
                    headers={"Content-Type": "text/csv"}).json()
    assert r["imported"] == 4
