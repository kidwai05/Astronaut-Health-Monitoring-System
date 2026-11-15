from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy.orm import Session

from app.crud.measurements import latest_per_metric, query_measurements
from app.db.session import get_db
from app.deps import ensure_crew
from app.schemas.health import MeasurementCreate, MeasurementOut
from app.services.ingest import ingest_measurement, ingest_measurements_bulk, ingest_wearable_csv, ingest_wearable_json

router = APIRouter(prefix="/measurements", tags=["measurements"])


@router.post("", response_model=MeasurementOut, status_code=201)
def create_measurement(body: MeasurementCreate, db: Session = Depends(get_db)):
    ensure_crew(db, body.crew_id)
    obj = ingest_measurement(db, body)
    db.commit()
    return obj


@router.post("/bulk", response_model=list[MeasurementOut], status_code=201)
def create_bulk(body: list[MeasurementCreate], db: Session = Depends(get_db)):
    for crew_id in {b.crew_id for b in body}:
        ensure_crew(db, crew_id)
    objs = ingest_measurements_bulk(db, body)
    db.commit()
    return objs


@router.get("", response_model=list[MeasurementOut])
def list_measurements(crew_id: str, metric: Optional[str] = None,
                      start: Optional[datetime] = Query(None, alias="from"),
                      end: Optional[datetime] = Query(None, alias="to"),
                      limit: int = Query(1000, le=10000), db: Session = Depends(get_db)):
    ensure_crew(db, crew_id)
    return query_measurements(db, crew_id, metric, start, end, limit)


@router.get("/latest", response_model=list[MeasurementOut])
def latest(crew_id: str, db: Session = Depends(get_db)):
    ensure_crew(db, crew_id)
    return latest_per_metric(db, crew_id)


@router.post("/import/wearable-json")
def import_wearable_json(crew_id: str, records: list[dict[str, Any]], db: Session = Depends(get_db)):
    ensure_crew(db, crew_id)
    result = ingest_wearable_json(db, crew_id, records)
    db.commit()
    return result


@router.post("/import/wearable-csv")
def import_wearable_csv(crew_id: str, csv_text: str = Body(..., media_type="text/csv"), db: Session = Depends(get_db)):
    ensure_crew(db, crew_id)
    result = ingest_wearable_csv(db, crew_id, csv_text)
    db.commit()
    return result
