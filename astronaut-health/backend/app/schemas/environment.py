from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.db.base import utcnow


class EnvironmentCreate(BaseModel):
    id: Optional[str] = None
    recorded_at: datetime = Field(default_factory=utcnow)
    co2_ppm: Optional[float] = Field(None, ge=0, le=100000)
    o2_pct: Optional[float] = Field(None, ge=0, le=100)
    temperature_c: Optional[float] = Field(None, ge=-50, le=80)
    humidity_pct: Optional[float] = Field(None, ge=0, le=100)
    noise_db: Optional[float] = Field(None, ge=0, le=200)
    radiation_usv: Optional[float] = Field(None, ge=0)
    location: Optional[str] = None


class EnvironmentOut(EnvironmentCreate):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime
    updated_at: datetime


class SpaceWeatherOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    source_id: str
    type: str
    start_time: datetime
    event_class: Optional[str] = None
    fetched_at: datetime
