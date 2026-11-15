from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.sync import SyncPullResponse, SyncPushRequest, SyncPushResponse
from app.services import sync_service

router = APIRouter(prefix="/sync", tags=["sync"])


@router.post("/push", response_model=SyncPushResponse)
def push(body: SyncPushRequest, db: Session = Depends(get_db)):
    result = sync_service.apply_push(db, body.items)
    db.commit()
    return result


@router.get("/pull", response_model=SyncPullResponse)
def pull(since: Optional[datetime] = None, crew_id: Optional[str] = None, db: Session = Depends(get_db)):
    return sync_service.pull_changes(db, crew_id, since)
