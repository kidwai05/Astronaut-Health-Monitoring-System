"""30-day simulated mission (SIMULATED data). Run:  python -m app.seed.seed_demo_mission
Stable baseline, then rising resting HR + falling sleep from day 18, mood dip, recovery, and a
scripted critical event (fever + fast heart rate) on day 24."""
import random
from datetime import timedelta

from app.core.security import hash_pin
from app.db.base import utcnow
from app.db.models import CrewMember, Mission, MoodLog, SleepLog, Measurement
from app.db.session import SessionLocal, init_db
from app.seed.seed_alert_rules import seed_alert_rules
from app.services.baseline_service import compute_all_baselines


def run(days: int = 30, seed: int = 42) -> str:
    rnd = random.Random(seed)
    init_db()
    db = SessionLocal()
    try:
        start = (utcnow() - timedelta(days=days - 1)).replace(hour=7, minute=0, second=0, microsecond=0)
        mission = Mission(name="Demo Mars Transit", destination="Mars", start_date=start,
                          planned_end_date=start + timedelta(days=500))
        db.add(mission)
        db.flush()
        crew = CrewMember(name="Cmdr. Demo (simulated)", job_title="Commander", age=41, sex="F",
                          height_cm=170, weight_kg=64, mission_id=mission.id, pin_hash=hash_pin("1234"))
        db.add(crew)
        db.flush()

        for d in range(1, days + 1):
            t = start + timedelta(days=d - 1)
            stress_phase = 18 <= d <= 23
            hr = rnd.gauss(62, 2) + (3 * (d - 17) if stress_phase else 0)
            sleep_h = rnd.gauss(7.4, 0.3) - (0.35 * (d - 17) if stress_phase else 0)
            temp = rnd.gauss(36.6, 0.15)
            if d == 24:  # scripted critical event
                hr, temp = 128, 38.9
            vitals = {"heart_rate": hr, "systolic": rnd.gauss(116, 4), "diastolic": rnd.gauss(74, 3),
                      "glucose": rnd.gauss(88, 5), "temperature": temp, "weight": rnd.gauss(64, 0.2)}
            for metric, val in vitals.items():
                db.add(Measurement(crew_id=crew.id, metric=metric, value=round(val, 1),
                                   unit=None, source="manual", recorded_at=t, note="simulated"))
            sleep_h = max(3.5, sleep_h)
            end = t
            db.add(SleepLog(crew_id=crew.id, sleep_start=end - timedelta(hours=sleep_h), sleep_end=end,
                            duration_h=round(sleep_h, 2), quality=2 if stress_phase else 4,
                            interruptions=rnd.randint(2, 4) if stress_phase else rnd.randint(0, 1)))
            db.add(MoodLog(crew_id=crew.id, mood=2 if stress_phase else rnd.choice([3, 4, 4, 5]),
                           stress=4 if stress_phase else rnd.choice([1, 2, 2, 3]), energy=2 if stress_phase else 4,
                           tags=["tired", "workload"] if stress_phase else ["motivated"], recorded_at=t))
        seed_alert_rules(db)
        db.flush()
        compute_all_baselines(db, crew.id)
        db.commit()
        return crew.id
    finally:
        db.close()


if __name__ == "__main__":
    print("Seeded demo crew id:", run())
