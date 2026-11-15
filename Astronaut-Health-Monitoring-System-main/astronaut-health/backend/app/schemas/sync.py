from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class SyncItem(BaseModel):
    entity: str = Field(description="e.g. measurements, sleep_logs, mood_logs")
    entity_id: str
    operation: Literal["upsert", "delete"] = "upsert"
    payload: dict[str, Any] = {}
    updated_at: Optional[datetime] = None  # client timestamp used for last-write-wins


class SyncPushRequest(BaseModel):
    items: list[SyncItem]


class SyncResultItem(BaseModel):
    entity: str
    entity_id: str
    status: Literal["applied", "stale", "error"]
    detail: Optional[str] = None


class SyncPushResponse(BaseModel):
    applied: int
    stale: int
    errors: int
    results: list[SyncResultItem]


class SyncPullResponse(BaseModel):
    server_time: datetime
    changes: dict[str, list[dict[str, Any]]]
