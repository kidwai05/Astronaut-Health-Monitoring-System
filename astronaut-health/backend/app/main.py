from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.api.v1.ws import connection_manager
from app.config import get_settings
from app.db.session import init_db
from app.services.alert_engine import AlertEngine, AlertRuleLoader


def _seed_alert_rules() -> None:
    """Seed the alert_rules table from default_rules.json if empty.

    This runs once at startup to ensure the database has the baseline alert rules.
    """
    from sqlalchemy import select

    from app.db.models import AlertRule as AlertRuleModel
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        # Check if alert_rules table has any records
        existing_count = db.scalar(select(AlertRuleModel).limit(1))
        if existing_count is not None:
            # Table already has data, skip seeding
            return

        # Load rules from JSON
        loader = AlertRuleLoader()
        rules = loader.load()

        # Insert each rule into the database
        for rule in rules:
            db_rule = AlertRuleModel(
                id=rule.id,
                metric=rule.metric,
                rule_type=rule.rule_type,
                params=rule.params.__dict__,  # Convert dataclass to dict for JSON column
                severity=rule.severity,
                enabled=rule.enabled,
            )
            db.add(db_rule)

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Warning: Failed to seed alert rules: {e}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    init_db()

    # Load alert rules from JSON and seed database if needed
    loader = AlertRuleLoader()
    loader.load()
    _seed_alert_rules()

    # Create and store AlertEngine on app.state
    app_instance.state.alert_engine = AlertEngine(loader, connection_manager)

    yield


settings = get_settings()
app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan,
              description="Decision-support tool, not a diagnostic tool.")
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_methods=["*"], allow_headers=["*"])
app.include_router(api_router)


@app.get("/health")
def health():
    return {"status": "ok"}
