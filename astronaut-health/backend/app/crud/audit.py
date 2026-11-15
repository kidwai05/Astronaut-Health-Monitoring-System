from typing import Optional

from sqlalchemy.orm import Session

from app.db.models import AuditLog


def audit(db: Session, action: str, entity: str, entity_id: Optional[str], actor_id: Optional[str] = None) -> None:
    db.add(AuditLog(actor_id=actor_id, action=action, entity=entity, entity_id=entity_id))
