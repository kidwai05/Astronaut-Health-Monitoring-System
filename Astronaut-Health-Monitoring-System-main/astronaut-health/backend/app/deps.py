from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.models import CrewMember
from app.db.session import get_db


def ensure_crew(db: Session, crew_id: str) -> CrewMember:
    crew = db.get(CrewMember, crew_id)
    if crew is None:
        raise HTTPException(404, f"Crew member {crew_id} not found")
    return crew


__all__ = ["get_db", "ensure_crew", "Depends"]
