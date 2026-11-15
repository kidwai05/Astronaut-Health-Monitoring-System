from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.db.base import as_utc, utcnow
from app.services.validation import validate_measurement


class OutBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    created_at: datetime
    updated_at: datetime


# ---------- Measurements ----------
class MeasurementCreate(BaseModel):
    id: Optional[str] = Field(None, description="Client-generated UUID (offline create)")
    crew_id: str
    metric: str
    value: float
    unit: Optional[str] = None
    source: Literal["manual", "wearable", "camera"] = "manual"
    recorded_at: datetime = Field(default_factory=utcnow)
    note: Optional[str] = None

    @model_validator(mode="after")
    def _check(self):
        default_unit = validate_measurement(self.metric, self.value)
        self.unit = self.unit or default_unit
        self.recorded_at = as_utc(self.recorded_at)
        return self


class MeasurementOut(OutBase, MeasurementCreate):
    id: str


# ---------- Sleep ----------
class SleepLogCreate(BaseModel):
    id: Optional[str] = None
    crew_id: str
    sleep_start: datetime
    sleep_end: datetime
    duration_h: Optional[float] = None
    quality: Optional[int] = Field(None, ge=1, le=5)
    interruptions: int = Field(0, ge=0, le=50)

    @model_validator(mode="after")
    def _check(self):
        self.sleep_start, self.sleep_end = as_utc(self.sleep_start), as_utc(self.sleep_end)
        if self.sleep_end <= self.sleep_start:
            raise ValueError("sleep_end must be after sleep_start")
        calc = round((self.sleep_end - self.sleep_start).total_seconds() / 3600, 2)
        if calc > 24:
            raise ValueError("Sleep period longer than 24 h")
        self.duration_h = self.duration_h if self.duration_h is not None else calc
        return self


class SleepLogOut(OutBase, SleepLogCreate):
    id: str


# ---------- Mood ----------
class MoodLogCreate(BaseModel):
    id: Optional[str] = None
    crew_id: str
    mood: int = Field(ge=1, le=5)
    stress: int = Field(ge=1, le=5)
    energy: int = Field(ge=1, le=5)
    tags: list[str] = []
    free_text: Optional[str] = None
    recorded_at: datetime = Field(default_factory=utcnow)


class MoodLogOut(OutBase, MoodLogCreate):
    id: str


# ---------- Symptoms ----------
class SymptomLogCreate(BaseModel):
    id: Optional[str] = None
    crew_id: str
    body_region: str
    symptom_type: str
    severity: int = Field(ge=1, le=5)
    notes: Optional[str] = None
    recorded_at: datetime = Field(default_factory=utcnow)


class SymptomLogOut(OutBase, SymptomLogCreate):
    id: str


# ---------- Exercise ----------
class ExerciseLogCreate(BaseModel):
    id: Optional[str] = None
    crew_id: str
    type: str
    duration_min: int = Field(gt=0, le=600)
    intensity: Literal["low", "moderate", "high"] = "moderate"
    recorded_at: datetime = Field(default_factory=utcnow)


class ExerciseLogOut(OutBase, ExerciseLogCreate):
    id: str


# ---------- Baselines ----------
class BaselineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    crew_id: str
    metric: str
    mean: float
    std_dev: float
    min: float
    max: float
    sample_size: int
    computed_at: datetime
