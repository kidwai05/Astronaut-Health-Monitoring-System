from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_pin
from app.crud.audit import audit
from app.db.models import CrewMember, Mission
from app.db.session import get_db
from app.deps import ensure_crew
from app.schemas.crew import CrewCreate, CrewOut, MissionCreate, MissionOut
from app.schemas.health import BaselineOut
from app.services.baseline_service import compute_all_baselines
from app.db.models import Baseline

router = APIRouter(tags=["crew"])


@router.post("/missions", response_model=MissionOut, status_code=201)
def create_mission(body: MissionCreate, db: Session = Depends(get_db)):
    m = Mission(**{k: v for k, v in body.model_dump().items() if v is not None})
    db.add(m)
    db.commit()
    return m


@router.post("/crew", response_model=CrewOut, status_code=201)
def create_crew(body: CrewCreate, db: Session = Depends(get_db)):
    data = body.model_dump(exclude={"pin"})
    data = {k: v for k, v in data.items() if v is not None}
    if body.mission_id and db.get(Mission, body.mission_id) is None:
        raise HTTPException(404, "Mission not found")
    crew = CrewMember(**data, pin_hash=hash_pin(body.pin) if body.pin else None)
    db.add(crew)
    audit(db, "create", "crew_members", crew.id)
    db.commit()
    return crew


@router.get("/crew", response_model=list[CrewOut])
def list_crew(db: Session = Depends(get_db)):
    return list(db.scalars(select(CrewMember).order_by(CrewMember.name)))


@router.get("/crew/{crew_id}", response_model=CrewOut)
def get_crew(crew_id: str, db: Session = Depends(get_db)):
    return ensure_crew(db, crew_id)


@router.post("/crew/{crew_id}/baselines/compute", response_model=list[BaselineOut])
def compute_baselines(crew_id: str, days: int | None = None, db: Session = Depends(get_db)):
    ensure_crew(db, crew_id)
    result = compute_all_baselines(db, crew_id, days)
    db.commit()
    return result


@router.get("/crew/{crew_id}/baselines", response_model=list[BaselineOut])
def get_baselines(crew_id: str, db: Session = Depends(get_db)):
    ensure_crew(db, crew_id)
    return list(db.scalars(select(Baseline).where(Baseline.crew_id == crew_id)))
