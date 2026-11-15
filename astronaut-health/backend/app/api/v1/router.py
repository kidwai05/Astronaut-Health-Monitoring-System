from fastapi import APIRouter

from app.api.v1 import crew, environment, logs, measurements, sync

api_router = APIRouter(prefix="/api/v1")
for r in (crew.router, measurements.router, logs.sleep_router, logs.mood_router, logs.symptoms_router,
          logs.exercise_router, environment.router, sync.router):
    api_router.include_router(r)
