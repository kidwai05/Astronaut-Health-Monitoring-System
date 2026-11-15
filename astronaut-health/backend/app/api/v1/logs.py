"""Sleep, mood, symptom and exercise logs share the same POST/GET shape, so one factory builds them."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.crud.audit import audit
from app.crud.base import CRUDBase
from app.db.models import ExerciseLog, MoodLog, SleepLog, SymptomLog
from app.db.session import get_db
from app.deps import ensure_crew
from app.schemas.health import (ExerciseLogCreate, ExerciseLogOut, MoodLogCreate, MoodLogOut,
                                SleepLogCreate, SleepLogOut, SymptomLogCreate, SymptomLogOut)


def make_log_router(prefix: str, model, create_schema, out_schema, time_field: str = "recorded_at") -> APIRouter:
    router = APIRouter(prefix=prefix, tags=[prefix.strip("/")])
    crud = CRUDBase(model, time_field)

    @router.post("", response_model=out_schema, status_code=201)
    def create(body: create_schema, db: Session = Depends(get_db)):  # type: ignore[valid-type]
        ensure_crew(db, body.crew_id)
        obj = crud.upsert(db, body.model_dump())
        audit(db, "upsert", model.__tablename__, obj.id, actor_id=body.crew_id)
        db.commit()
        return obj

    @router.get("", response_model=list[out_schema])
    def list_logs(crew_id: str, start: Optional[datetime] = Query(None, alias="from"),
                  end: Optional[datetime] = Query(None, alias="to"),
                  limit: int = Query(500, le=5000), db: Session = Depends(get_db)):
        ensure_crew(db, crew_id)
        return crud.list_for_crew(db, crew_id, start, end, limit)

    return router


sleep_router = make_log_router("/sleep", SleepLog, SleepLogCreate, SleepLogOut, "sleep_start")
mood_router = make_log_router("/mood", MoodLog, MoodLogCreate, MoodLogOut)
symptoms_router = make_log_router("/symptoms", SymptomLog, SymptomLogCreate, SymptomLogOut)
exercise_router = make_log_router("/exercise", ExerciseLog, ExerciseLogCreate, ExerciseLogOut)
