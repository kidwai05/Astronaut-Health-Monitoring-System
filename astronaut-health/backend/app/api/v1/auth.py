from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from jose import jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.security import verify_pin
from app.db.models import CrewMember
from app.db.session import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    crew_id: str
    pin: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    crew_id: str
    role: str


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    crew_member: CrewMember | None = db.get(CrewMember, body.crew_id)
    if crew_member is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not crew_member.pin_hash or not verify_pin(body.pin, crew_member.pin_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    settings = get_settings()
    claims = {
        "sub": body.crew_id,
        "role": crew_member.role,
        "exp": datetime.utcnow() + timedelta(seconds=3600),
    }
    token = jwt.encode(claims, settings.secret_key, algorithm="HS256")

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        crew_id=body.crew_id,
        role=crew_member.role,
    )
