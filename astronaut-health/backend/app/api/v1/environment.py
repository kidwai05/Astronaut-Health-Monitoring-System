import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.db.models import EnvironmentReading
from app.db.session import get_db
from app.schemas.environment import EnvironmentCreate, EnvironmentOut, SpaceWeatherOut
from app.services import donki_client

router = APIRouter(tags=["environment"])
_env = CRUDBase(EnvironmentReading, "recorded_at")


@router.post("/environment", response_model=EnvironmentOut, status_code=201)
def post_environment(body: EnvironmentCreate, db: Session = Depends(get_db)):
    obj = _env.upsert(db, body.model_dump())
    db.commit()
    return obj


@router.get("/environment/latest", response_model=EnvironmentOut)
def latest_environment(db: Session = Depends(get_db)):
    obj = db.scalar(select(EnvironmentReading).order_by(EnvironmentReading.recorded_at.desc()).limit(1))
    if obj is None:
        raise HTTPException(404, "No environment readings yet")
    return obj


@router.get("/space-weather/recent")
def recent_space_weather(days: int = 7, db: Session = Depends(get_db)):
    """Served from the local cache, so it works with no connection."""
    return {"risk": donki_client.radiation_risk(db),
            "events": [SpaceWeatherOut.model_validate(e) for e in donki_client.recent_events(db, days)]}


@router.post("/space-weather/refresh")
def refresh_space_weather(days: int = 7, db: Session = Depends(get_db)):
    try:
        new = donki_client.refresh_space_weather(db, days)
    except httpx.HTTPError as e:
        # Offline-first: not an app failure, we simply keep serving the cache
        raise HTTPException(502, f"NASA DONKI unreachable, serving cached data ({type(e).__name__})")
    db.commit()
    return {"new_events": new}
