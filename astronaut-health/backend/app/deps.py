from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.models import CrewMember
from app.db.session import get_db


def ensure_crew(db: Session, crew_id: str) -> CrewMember:
    crew = db.get(CrewMember, crew_id)
    if crew is None:
        raise HTTPException(404, f"Crew member {crew_id} not found")
    return crew


# ---------------------------------------------------------------------------
# JWT authentication
# ---------------------------------------------------------------------------

_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


class TokenData(BaseModel):
    crew_id: str
    role: str


def get_current_crew(token: str = Depends(_oauth2_scheme)) -> TokenData:
    credentials_exc = HTTPException(status_code=401, detail="Invalid credentials")
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        crew_id: str | None = payload.get("sub")
        role: str | None = payload.get("role")
        if crew_id is None or role is None:
            raise credentials_exc
        return TokenData(crew_id=crew_id, role=role)
    except JWTError:
        raise credentials_exc


def require_own_crew(
    crew_id: str,
    current: TokenData = Depends(get_current_crew),
) -> TokenData:
    if crew_id != current.crew_id and current.role != "flight_surgeon":
        raise HTTPException(status_code=403, detail="Forbidden")
    return current


__all__ = [
    "get_db",
    "ensure_crew",
    "Depends",
    "TokenData",
    "get_current_crew",
    "require_own_crew",
]
