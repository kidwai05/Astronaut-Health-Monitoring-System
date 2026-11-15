from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Alert
from app.db.session import get_db
from app.deps import get_current_crew, TokenData

router = APIRouter(prefix="/alerts", tags=["alerts"])


# ---------- Schemas ----------
class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    crew_id: str
    metric: str
    severity: str
    message: str
    triggered_by_rule: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    flight_surgeon_contact: bool = Field(default=False)


class AlertStatusUpdate(BaseModel):
    status: Literal["acknowledged", "resolved"]


# ---------- Endpoints ----------
@router.get("", response_model=list[AlertOut])
def list_alerts(
    status: Optional[Literal["open", "acknowledged", "resolved"]] = Query(None),
    severity: Optional[Literal["info", "caution", "warning", "critical"]] = Query(None),
    current: TokenData = Depends(get_current_crew),
    db: Session = Depends(get_db),
):
    """
    Return all alerts for authenticated crew member.
    Supports optional filtering by status and severity.
    Adds flight_surgeon_contact: true to critical severity alerts.
    """
    query = select(Alert).where(Alert.crew_id == current.crew_id)
    
    if status:
        query = query.where(Alert.status == status)
    
    if severity:
        query = query.where(Alert.severity == severity)
    
    query = query.order_by(Alert.created_at.desc())
    
    alerts = db.scalars(query).all()
    
    # Convert to response models and add flight_surgeon_contact flag
    result = []
    for alert in alerts:
        alert_dict = AlertOut.model_validate(alert).model_dump()
        if alert.severity == "critical":
            alert_dict["flight_surgeon_contact"] = True
        result.append(AlertOut(**alert_dict))
    
    return result


@router.patch("/{id}", response_model=AlertOut)
def update_alert_status(
    id: str,
    body: AlertStatusUpdate,
    current: TokenData = Depends(get_current_crew),
    db: Session = Depends(get_db),
):
    """
    Update alert status field.
    Valid transitions: open → acknowledged, open → resolved, acknowledged → resolved.
    Invalid transition: resolved → * (returns HTTP 422).
    Verifies alert belongs to authenticated crew member.
    """
    alert = db.get(Alert, id)
    
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    # Verify alert belongs to authenticated crew member
    if alert.crew_id != current.crew_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    # Check for invalid transition: resolved → anything else
    if alert.status == "resolved":
        raise HTTPException(
            status_code=422,
            detail="Resolved alerts cannot be reopened"
        )
    
    # Update status
    alert.status = body.status
    db.commit()
    db.refresh(alert)
    
    # Add flight_surgeon_contact flag if critical
    alert_out = AlertOut.model_validate(alert)
    if alert.severity == "critical":
        alert_out.flight_surgeon_contact = True
    
    return alert_out
