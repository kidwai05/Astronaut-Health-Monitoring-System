from fastapi import APIRouter

from app.api.v1 import alerts, auth, crew, dashboard, environment, logs, measurements, sync, ws

api_router = APIRouter(prefix="/api/v1")
for r in (auth.router, crew.router, measurements.router, logs.sleep_router, logs.mood_router,
          logs.symptoms_router, logs.exercise_router, environment.router, sync.router, ws.router, alerts.router, dashboard.router):
    api_router.include_router(r)
