"""NASA DONKI space weather: fetch -> normalise -> cache in DB (so it works offline later)."""
from datetime import datetime, timedelta
from typing import Any, Optional

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.base import as_utc, utcnow
from app.db.models import SpaceWeatherEvent

DONKI_BASE = "https://api.nasa.gov/DONKI"
# endpoint -> (our type, id field, time field, class field)
ENDPOINTS = {
    "FLR": ("flare", "flrID", "beginTime", "classType"),
    "CME": ("CME", "activityID", "startTime", None),
    "SEP": ("SEP", "sepID", "eventTime", None),
}


def _parse_time(value: str) -> datetime:
    return as_utc(datetime.fromisoformat(value.replace("Z", "+00:00")))


def fetch_events(days: int = 7, api_key: Optional[str] = None, client: Optional[httpx.Client] = None) -> list[dict[str, Any]]:
    """Raises httpx.HTTPError if offline; callers should fall back to the cache."""
    key = api_key or get_settings().nasa_api_key
    end = utcnow().date()
    params = {"startDate": (end - timedelta(days=days)).isoformat(), "endDate": end.isoformat(), "api_key": key}
    own = client is None
    client = client or httpx.Client(timeout=15)
    events: list[dict[str, Any]] = []
    try:
        for endpoint, (etype, id_f, time_f, class_f) in ENDPOINTS.items():
            resp = client.get(f"{DONKI_BASE}/{endpoint}", params=params)
            resp.raise_for_status()
            for item in resp.json() or []:
                if item.get(id_f) and item.get(time_f):
                    events.append({"source_id": item[id_f], "type": etype,
                                   "start_time": _parse_time(item[time_f]),
                                   "event_class": item.get(class_f) if class_f else None, "raw": item})
    finally:
        if own:
            client.close()
    return events


def cache_events(db: Session, events: list[dict[str, Any]]) -> int:
    """Upsert by source_id. Returns number of NEW events cached."""
    new = 0
    for ev in events:
        obj = db.scalar(select(SpaceWeatherEvent).where(SpaceWeatherEvent.source_id == ev["source_id"]))
        if obj:
            obj.event_class, obj.raw, obj.fetched_at = ev["event_class"], ev["raw"], utcnow()
        else:
            db.add(SpaceWeatherEvent(**ev))
            new += 1
    db.flush()
    return new


def refresh_space_weather(db: Session, days: int = 7) -> int:
    return cache_events(db, fetch_events(days=days))


def recent_events(db: Session, days: int = 7) -> list[SpaceWeatherEvent]:
    since = utcnow() - timedelta(days=days)
    return list(db.scalars(select(SpaceWeatherEvent).where(SpaceWeatherEvent.start_time >= since)
                           .order_by(SpaceWeatherEvent.start_time.desc())))


def radiation_risk(db: Session) -> dict[str, Any]:
    """Illustrative Low/Elevated/High indicator from cached events (not a dose measurement)."""
    now = utcnow()
    level, reasons = "Low", []
    for ev in recent_events(db, days=3):
        age_h = (now - as_utc(ev.start_time)).total_seconds() / 3600
        cls = (ev.event_class or "").upper()
        if ev.type == "SEP" or (ev.type == "flare" and cls.startswith("X")):
            level = "High"
            reasons.append(f"{ev.type} {cls}".strip())
        elif level != "High" and age_h <= 48 and (ev.type == "CME" or (ev.type == "flare" and cls.startswith("M"))):
            level = "Elevated"
            reasons.append(f"{ev.type} {cls}".strip())
    return {"level": level, "reasons": reasons, "note": "Illustrative indicator from NASA DONKI; decision support only."}
