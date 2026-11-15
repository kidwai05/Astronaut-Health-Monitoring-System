from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class MissionCreate(BaseModel):
    id: Optional[str] = None
    name: str
    destination: Literal["ISS", "Moon", "Mars"] = "Mars"
    start_date: Optional[datetime] = None
    planned_end_date: Optional[datetime] = None


class MissionOut(MissionCreate):
    model_config = ConfigDict(from_attributes=True)
    id: str


class CrewCreate(BaseModel):
    id: Optional[str] = None
    name: str
    role: Literal["astronaut", "flight_surgeon", "admin"] = "astronaut"
    job_title: Optional[str] = None
    age: Optional[int] = Field(None, ge=18, le=100)
    sex: Optional[str] = None
    height_cm: Optional[float] = Field(None, gt=100, lt=250)
    weight_kg: Optional[float] = Field(None, gt=30, lt=250)
    mission_id: Optional[str] = None
    pin: Optional[str] = Field(None, min_length=4, max_length=12, description="Stored hashed, never returned")


class CrewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    role: str
    job_title: Optional[str] = None
    age: Optional[int] = None
    sex: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    mission_id: Optional[str] = None
