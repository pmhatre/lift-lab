import datetime as dt
import json
import os
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select, func, or_

from database import create_db_and_tables, get_session
from models import (
    Exercise, TrainingSession, SessionExercise, Set,
    NutritionDay, DexaScan, WhoopDay, Microcycle, PRRecord
)
from importer import import_fitnotes_csv
from seed import seed

app = FastAPI(title="Lift Lab API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    # Run column migrations via raw DB connection before SQLModel touches tables
    import sqlite3
    conn = sqlite3.connect(os.path.join(os.path.dirname(__file__), "database.db"))
    cur = conn.cursor()
    for col, dtype in [("target_reps_low", "INTEGER"), ("target_reps_high", "INTEGER"), ("progression_enabled", "BOOLEAN DEFAULT FALSE")]:
        try:
            cur.execute(f"ALTER TABLE exercises ADD COLUMN {col} {dtype}")
            conn.commit()
        except sqlite3.OperationalError:
            pass  # Column already exists
    conn.close()

    create_db_and_tables()
    seed()


# ─── Exercises ────────────────────────────────────────────────────────────────

@app.get("/api/exercises")
def list_exercises(
    q: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_session)
):
    query = select(Exercise)
    if q:
        query = query.where(
            or_(
                Exercise.name.ilike(f"%{q}%"),
                Exercise.aliases.ilike(f"%{q}%"),
            )
        )
    exercises = db.exec(query.order_by(Exercise.name).limit(limit)).all()
    return [_ex_to_dict(ex) for ex in exercises]


def _ex_to_dict(ex: Exercise):
    return {
        "id": ex.id,
        "name": ex.name,
        "aliases": json.loads(ex.aliases) if ex.aliases else [],
        "primary_muscles": json.loads(ex.primary_muscles) if ex.primary_muscles else [],
        "secondary_muscles": json.loads(ex.secondary_muscles) if ex.secondary_muscles else [],
        "equipment": ex.equipment,
        "movement_pattern": ex.movement_pattern,
        "is_compound": ex.is_compound,
        "target_reps_low": ex.target_reps_low,
        "target_reps_high": ex.target_reps_high,
        "progression_enabled": ex.progression_enabled,
        "notes": ex.notes,
    }


@app.post("/api/exercises")
def create_exercise(data: dict, db: Session = Depends(get_session)):
    ex = Exercise(
        name=data["name"],
        aliases=json.dumps(data.get("aliases", [])),
        primary_muscles=json.dumps(data.get("primary_muscles", [])),
        secondary_muscles=json.dumps(data.get("secondary_muscles", [])),
        equipment=data.get("equipment"),
        movement_pattern=data.get("movement_pattern"),
        is_compound=data.get("is_compound", False),
        notes=data.get("notes"),
    )
    db.add(ex)
    db.commit()
    db.refresh(ex)
    return _ex_to_dict(ex)


@app.put("/api/exercises/{exercise_id}")
def update_exercise(exercise_id: int, data: dict, db: Session = Depends(get_session)):
    ex = db.get(Exercise, exercise_id)
    if not ex:
        raise HTTPException(404, "Exercise not found")
    for k, v in data.items():
        if k in ("aliases", "primary_muscles", "secondary_muscles") and isinstance(v, list):
            setattr(ex, k, json.dumps(v))
        elif k == "progression_enabled" and isinstance(v, bool):
            setattr(ex, k, v)
        elif k in ("target_reps_low", "target_reps_high"):
            setattr(ex, k, v if v is not None else None)
        elif hasattr(ex, k):
            setattr(ex, k, v)
    db.add(ex)
    db.commit()
    db.refresh(ex)
    return _ex_to_dict(ex)


# ─── Sessions ─────────────────────────────────────────────────────────────────

def _session_to_dict(s: TrainingSession, include_exercises: bool = False, db: Session = None):
    d = {
        "id": s.id,
        "date": str(s.session_date),
        "day_type": s.day_type,
        "emphasis": s.emphasis,
        "started_at": s.started_at.isoformat() if s.started_at else None,
        "ended_at": s.ended_at.isoformat() if s.ended_at else None,
        "duration_minutes": s.duration_minutes,
        "body_weight_lbs": s.body_weight_lbs,
        "notes": s.notes,
        "source": s.source,
    }
    if include_exercises and db:
        ses_exercises = db.exec(
            select(SessionExercise)
            .where(SessionExercise.session_id == s.id)
            .order_by(SessionExercise.exercise_order)
        ).all()
        exercises_out = []
        for se in ses_exercises:
            ex = db.get(Exercise, se.exercise_id)
            sets = db.exec(
                select(Set)
                .where(Set.session_exercise_id == se.id)
                .order_by(Set.set_number)
            ).all()
            exercises_out.append({
                "id": se.id,
                "exercise_id": se.exercise_id,
                "exercise_name": ex.name if ex else "Unknown",
                "exercise_order": se.exercise_order,
                "notes": se.notes,
                "sets": [_set_to_dict(st) for st in sets],
            })
        d["exercises"] = exercises_out
    return d


def _set_to_dict(st: Set):
    return {
        "id": st.id,
        "set_number": st.set_number,
        "reps": st.reps,
        "weight_lbs": st.weight_lbs,
        "is_warmup": st.is_warmup,
        "rpe": st.rpe,
        "rir": st.rir,
        "status": st.status,
        "notes": st.notes,
    }


@app.get("/api/sessions")
def list_sessions(
    start: Optional[str] = None,
    end: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_session)
):
    query = select(TrainingSession).order_by(TrainingSession.session_date.desc())
    if start:
        query = query.where(TrainingSession.session_date >= dt.date.fromisoformat(start))
    if end:
        query = query.where(TrainingSession.session_date <= dt.date.fromisoformat(end))

    total = db.exec(select(func.count()).select_from(TrainingSession)).one()
    sessions = db.exec(query.offset(offset).limit(limit)).all()
    return {
        "total": total,
        "sessions": [_session_to_dict(s) for s in sessions]
    }


@app.post("/api/sessions")
def create_session(data: dict, db: Session = Depends(get_session)):
    s = TrainingSession(
        session_date=dt.date.fromisoformat(data["date"]),
        day_type=data.get("day_type"),
        emphasis=data.get("emphasis"),
        body_weight_lbs=data.get("body_weight_lbs"),
        notes=data.get("notes"),
        source="native",
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return _session_to_dict(s)


@app.get("/api/sessions/{session_id}")
def get_session_detail(session_id: int, db: Session = Depends(get_session)):
    s = db.get(TrainingSession, session_id)
    if not s:
        raise HTTPException(404, "Session not found")
    return _session_to_dict(s, include_exercises=True, db=db)


@app.put("/api/sessions/{session_id}")
def update_session(session_id: int, data: dict, db: Session = Depends(get_session)):
    s = db.get(TrainingSession, session_id)
    if not s:
        raise HTTPException(404, "Session not found")
    for k, v in data.items():
        if k == "date":
            s.session_date = dt.date.fromisoformat(v)
        elif hasattr(s, k):
            setattr(s, k, v)
    db.add(s)
    db.commit()
    db.refresh(s)
    return _session_to_dict(s)


@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_session)):
    s = db.get(TrainingSession, session_id)
    if not s:
        raise HTTPException(404, "Session not found")
    db.delete(s)
    db.commit()
    return {"ok": True}


# ─── Session Exercises ────────────────────────────────────────────────────────

@app.post("/api/sessions/{session_id}/exercises")
def add_exercise_to_session(session_id: int, data: dict, db: Session = Depends(get_session)):
    s = db.get(TrainingSession, session_id)
    if not s:
        raise HTTPException(404, "Session not found")
    ex = db.get(Exercise, data["exercise_id"])
    if not ex:
        raise HTTPException(404, "Exercise not found")

    existing = db.exec(
        select(SessionExercise)
        .where(SessionExercise.session_id == session_id)
        .order_by(SessionExercise.exercise_order.desc())
    ).first()
    order = (existing.exercise_order or 0) + 1 if existing else 0

    se = SessionExercise(
        session_id=session_id,
        exercise_id=data["exercise_id"],
        exercise_order=data.get("exercise_order", order),
        notes=data.get("notes"),
    )
    db.add(se)
    db.commit()
    db.refresh(se)
    return {"id": se.id, "exercise_id": se.exercise_id, "exercise_name": ex.name}


@app.put("/api/session_exercises/{se_id}")
def update_session_exercise(se_id: int, data: dict, db: Session = Depends(get_session)):
    se = db.get(SessionExercise, se_id)
    if not se:
        raise HTTPException(404, "Not found")
    for k, v in data.items():
        if hasattr(se, k):
            setattr(se, k, v)
    db.add(se)
    db.commit()
    return {"ok": True}


@app.delete("/api/session_exercises/{se_id}")
def delete_session_exercise(se_id: int, db: Session = Depends(get_session)):
    se = db.get(SessionExercise, se_id)
    if not se:
        raise HTTPException(404, "Not found")
    db.delete(se)
    db.commit()
    return {"ok": True}


# ─── Sets ─────────────────────────────────────────────────────────────────────

@app.post("/api/session_exercises/{se_id}/sets")
def add_set(se_id: int, data: dict, db: Session = Depends(get_session)):
    se = db.get(SessionExercise, se_id)
    if not se:
        raise HTTPException(404, "Session exercise not found")

    existing_sets = db.exec(
        select(Set).where(Set.session_exercise_id == se_id).order_by(Set.set_number.desc())
    ).first()
    set_num = (existing_sets.set_number or 0) + 1 if existing_sets else 1

    s = Set(
        session_exercise_id=se_id,
        set_number=data.get("set_number", set_num),
        reps=data.get("reps"),
        weight_lbs=data.get("weight_lbs"),
        is_warmup=data.get("is_warmup", False),
        rpe=data.get("rpe"),
        rir=data.get("rir"),
        status=data.get("status", "done"),
        notes=data.get("notes"),
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return _set_to_dict(s)


@app.put("/api/sets/{set_id}")
def update_set(set_id: int, data: dict, db: Session = Depends(get_session)):
    s = db.get(Set, set_id)
    if not s:
        raise HTTPException(404, "Set not found")
    for k, v in data.items():
        if hasattr(s, k):
            setattr(s, k, v)
    db.add(s)
    db.commit()
    return _set_to_dict(s)


@app.delete("/api/sets/{set_id}")
def delete_set(set_id: int, db: Session = Depends(get_session)):
    s = db.get(Set, set_id)
    if not s:
        raise HTTPException(404, "Set not found")
    db.delete(s)
    db.commit()
    return {"ok": True}


# ─── Analytics ────────────────────────────────────────────────────────────────

@app.get("/api/analytics/volume")
def analytics_volume(
    start: Optional[str] = None,
    end: Optional[str] = None,
    group_by: str = "week",
    db: Session = Depends(get_session)
):
    # Default: last 8 weeks of actual data (not from today, which breaks historical imports)
    if not end:
        latest = db.exec(select(func.max(TrainingSession.session_date))).one()
        end = str(latest) if latest else str(dt.date.today())
    if not start:
        end_date_parsed = dt.date.fromisoformat(end)
        start = str(end_date_parsed - dt.timedelta(weeks=8))

    start_date = dt.date.fromisoformat(start)
    end_date = dt.date.fromisoformat(end)

    sessions = db.exec(
        select(TrainingSession).where(
            TrainingSession.session_date >= start_date,
            TrainingSession.session_date <= end_date,
        )
    ).all()

    session_map = {s.id: s.session_date for s in sessions}
    session_ids = list(session_map.keys())

    if not session_ids:
        return {"data": [], "muscle_groups": []}

    ses_exercises = db.exec(
        select(SessionExercise).where(SessionExercise.session_id.in_(session_ids))
    ).all()

    data: dict = {}

    for se in ses_exercises:
        ex = db.get(Exercise, se.exercise_id)
        if not ex:
            continue

        working_sets = db.exec(
            select(func.count(Set.id)).where(
                Set.session_exercise_id == se.id,
                Set.is_warmup == False,
                Set.status == "done",
            )
        ).one()

        if working_sets == 0:
            continue

        session_date = session_map[se.session_id]

        if group_by == "week":
            week_start = session_date - dt.timedelta(days=session_date.weekday())
            period_key = str(week_start)
        else:
            period_key = str(session_date)

        muscles = []
        if ex.primary_muscles:
            muscles.extend(json.loads(ex.primary_muscles))

        for muscle in muscles:
            if period_key not in data:
                data[period_key] = {}
            data[period_key][muscle] = data[period_key].get(muscle, 0) + working_sets

    periods = sorted(data.keys())

    all_muscles: set = set()
    for period_data in data.values():
        all_muscles.update(period_data.keys())

    result = []
    for period in periods:
        row = {"period": period}
        for muscle in all_muscles:
            row[muscle] = data[period].get(muscle, 0)
        result.append(row)

    return {"data": result, "muscle_groups": sorted(list(all_muscles))}


@app.get("/api/analytics/frequency")
def analytics_frequency(weeks: int = 12, db: Session = Depends(get_session)):
    end_date = dt.date.today()
    start_date = end_date - dt.timedelta(weeks=weeks)

    sessions = db.exec(
        select(TrainingSession.session_date).where(
            TrainingSession.session_date >= start_date,
            TrainingSession.session_date <= end_date,
        ).order_by(TrainingSession.session_date)
    ).all()

    weeks_data: dict = {}
    for session_date in sessions:
        week_start = session_date - dt.timedelta(days=session_date.weekday())
        key = str(week_start)
        weeks_data[key] = weeks_data.get(key, 0) + 1

    result = []
    current = start_date - dt.timedelta(days=start_date.weekday())
    while current <= end_date:
        key = str(current)
        result.append({"week": key, "sessions": weeks_data.get(key, 0)})
        current += dt.timedelta(weeks=1)

    return {"data": result}


@app.get("/api/analytics/exercise/{exercise_id}/history")
def exercise_history(exercise_id: int, limit: int = 30, db: Session = Depends(get_session)):
    ex = db.get(Exercise, exercise_id)
    if not ex:
        raise HTTPException(404, "Exercise not found")

    ses_exercises = db.exec(
        select(SessionExercise, TrainingSession)
        .join(TrainingSession, SessionExercise.session_id == TrainingSession.id)
        .where(SessionExercise.exercise_id == exercise_id)
        .order_by(TrainingSession.session_date.desc())
        .limit(limit)
    ).all()

    history = []
    for se, s in ses_exercises:
        working_sets = db.exec(
            select(Set).where(
                Set.session_exercise_id == se.id,
                Set.is_warmup == False,
            ).order_by(Set.set_number)
        ).all()

        if not working_sets:
            continue

        max_weight = max((st.weight_lbs or 0) for st in working_sets)
        volume_load = sum((st.weight_lbs or 0) * (st.reps or 0) for st in working_sets)

        best_set = max(working_sets, key=lambda st: (st.weight_lbs or 0) * (1 + (st.reps or 0) / 30))
        e1rm = round((best_set.weight_lbs or 0) * (1 + (best_set.reps or 0) / 30), 1) if best_set.weight_lbs else None

        history.append({
            "session_id": s.id,
            "date": str(s.session_date),
            "max_weight": max_weight,
            "volume_load": round(volume_load, 1),
            "e1rm": e1rm,
            "sets": [
                {"set_number": st.set_number, "reps": st.reps, "weight_lbs": st.weight_lbs, "rpe": st.rpe}
                for st in working_sets
            ],
        })

    history.reverse()
    return {"exercise": _ex_to_dict(ex), "history": history}


@app.get("/api/analytics/beat-the-logbook/{exercise_id}")
def beat_the_logbook(exercise_id: int, n: int = 5, db: Session = Depends(get_session)):
    ex = db.get(Exercise, exercise_id)
    if not ex:
        raise HTTPException(404, "Exercise not found")

    ses_exercises = db.exec(
        select(SessionExercise, TrainingSession)
        .join(TrainingSession, SessionExercise.session_id == TrainingSession.id)
        .where(SessionExercise.exercise_id == exercise_id)
        .order_by(TrainingSession.session_date.desc())
        .limit(n)
    ).all()

    sessions_data = []
    for se, s in ses_exercises:
        working_sets = db.exec(
            select(Set).where(
                Set.session_exercise_id == se.id,
                Set.is_warmup == False,
                Set.status == "done",
            ).order_by(Set.set_number)
        ).all()

        if not working_sets:
            continue

        top_set = max(working_sets, key=lambda st: (st.weight_lbs or 0))

        sessions_data.append({
            "session_id": s.id,
            "date": str(s.session_date),
            "top_set_weight": top_set.weight_lbs,
            "top_set_reps": top_set.reps,
            "sets": [{"reps": st.reps, "weight_lbs": st.weight_lbs} for st in working_sets],
            "volume_load": round(sum((st.weight_lbs or 0) * (st.reps or 0) for st in working_sets), 1),
        })

    last_session = sessions_data[0] if sessions_data else None
    prev_session = sessions_data[1] if len(sessions_data) > 1 else None

    status = None
    if last_session and prev_session:
        last_w = last_session["top_set_weight"] or 0
        prev_w = prev_session["top_set_weight"] or 0
        last_r = last_session["top_set_reps"] or 0
        prev_r = prev_session["top_set_reps"] or 0

        if last_w > prev_w:
            status = "weight_pr"
        elif last_w == prev_w and last_r > prev_r:
            status = "rep_pr"
        elif last_w < prev_w:
            status = "regression"
        else:
            status = "maintained"

    # Ready to progress: check if last session's top set reps hit the ceiling
    ready_to_progress = None
    reps_at_ceiling = None
    if last_session and ex.target_reps_high and ex.progression_enabled:
        ceiling = ex.target_reps_high
        ls_sets = last_session["sets"]
        top_two = sorted(ls_sets, key=lambda s: (s["reps"] or 0), reverse=True)[:2]
        reps_at_ceiling = [{"set": i+1, "reps": s["reps"], "at_ceiling": (s["reps"] or 0) >= ceiling} for i, s in enumerate(ls_sets)]
        at_ceiling_count = sum(1 for s in top_two if (s["reps"] or 0) >= ceiling)
        if at_ceiling_count >= 2:
            ready_to_progress = "ready"
        elif at_ceiling_count == 1:
            ready_to_progress = "close"
        else:
            ready_to_progress = "working"

    return {
        "exercise": _ex_to_dict(ex),
        "last_session": last_session,
        "prev_session": prev_session,
        "recent_sessions": sessions_data,
        "progression_status": status,
        "ready_to_progress": ready_to_progress,
        "reps_at_ceiling": reps_at_ceiling,
    }


@app.get("/api/analytics/body-composition")
def body_composition(days: int = 90, db: Session = Depends(get_session)):
    start_date = dt.date.today() - dt.timedelta(days=days)

    nutrition = db.exec(
        select(NutritionDay)
        .where(NutritionDay.nutrition_date >= start_date)
        .order_by(NutritionDay.nutrition_date)
    ).all()

    dexa = db.exec(select(DexaScan).order_by(DexaScan.scan_date)).all()

    sessions_bw = db.exec(
        select(TrainingSession)
        .where(
            TrainingSession.session_date >= start_date,
            TrainingSession.body_weight_lbs.isnot(None),
        )
        .order_by(TrainingSession.session_date)
    ).all()

    return {
        "nutrition": [
            {"date": str(n.nutrition_date), "body_weight_lbs": n.body_weight_lbs, "calories": n.calories}
            for n in nutrition
        ],
        "dexa_scans": [
            {"date": str(d.scan_date), "total_lbs": d.total_lbs, "lean_lbs": d.lean_lbs,
             "fat_lbs": d.fat_lbs, "bf_pct": d.bf_pct}
            for d in dexa
        ],
        "session_weights": [
            {"date": str(s.session_date), "body_weight_lbs": s.body_weight_lbs}
            for s in sessions_bw
        ],
    }


# ─── Import ───────────────────────────────────────────────────────────────────

import_status_store: dict = {}


@app.post("/api/import/fitnotes")
async def import_fitnotes(
    file: UploadFile = File(...),
    force: bool = False,
    db: Session = Depends(get_session)
):
    content = await file.read()
    result = import_fitnotes_csv(content, db, force=force)
    import_status_store["fitnotes"] = {
        "last_import": dt.datetime.utcnow().isoformat(),
        **result
    }
    return result


@app.get("/api/import/status")
def get_import_status():
    return import_status_store


@app.get("/api/exercises/recent")
def recent_exercises(limit: int = 20, db: Session = Depends(get_session)):
    """Last N unique exercises performed, most recent first."""
    rows = db.exec(
        select(Exercise.id, Exercise.name, func.max(TrainingSession.session_date).label("last_date"))
        .join(SessionExercise, SessionExercise.exercise_id == Exercise.id)
        .join(TrainingSession, TrainingSession.id == SessionExercise.session_id)
        .group_by(Exercise.id)
        .order_by(func.max(TrainingSession.session_date).desc())
        .limit(limit)
    ).all()
    return [
        {"id": r[0], "name": r[1], "last_used": str(r[2])}
        for r in rows
    ]


# ─── PRs ─────────────────────────────────────────────────────────────────────


@app.get("/api/prs/recent")
def recent_prs(days: int = 30, limit: int = 10, db: Session = Depends(get_session)):
    cutoff = dt.date.today() - dt.timedelta(days=days)
    prs = db.exec(
        select(PRRecord, TrainingSession.session_date, Exercise.name)
        .join(TrainingSession, PRRecord.session_id == TrainingSession.id)
        .join(Exercise, PRRecord.exercise_id == Exercise.id)
        .where(TrainingSession.session_date >= cutoff)
        .order_by(PRRecord.created_at.desc())
        .limit(limit)
    ).all()
    return [
        {
            "id": pr.id,
            "date": str(date),
            "exercise_name": name,
            "pr_type": pr.pr_type,
            "pr_value": pr.pr_value,
            "previous_value": pr.previous_value,
        }
        for pr, date, name in prs
    ]


@app.post("/api/prs/check")
def check_prs(session_id: int, db: Session = Depends(get_session)):
    """Check and record any PRs for a completed session."""
    s = db.get(TrainingSession, session_id)
    if not s:
        raise HTTPException(404, "Session not found")

    ses_exercises = db.exec(
        select(SessionExercise).where(SessionExercise.session_id == session_id)
    ).all()

    new_prs = []
    for se in ses_exercises:
        ex = db.get(Exercise, se.exercise_id)
        if not ex:
            continue

        working_sets = db.exec(
            select(Set).where(
                Set.session_exercise_id == se.id,
                Set.is_warmup == False,
                Set.status == "done",
            ).order_by(Set.set_number)
        ).all()

        if not working_sets:
            continue

        max_weight = max((st.weight_lbs or 0) for st in working_sets)
        volume_load = sum((st.weight_lbs or 0) * (st.reps or 0) for st in working_sets)
        best_set = max(working_sets, key=lambda st: (st.weight_lbs or 0) * (1 + (st.reps or 0) / 30))
        e1rm = round((best_set.weight_lbs or 0) * (1 + (best_set.reps or 0) / 30), 1) if best_set.weight_lbs else None

        # Get all previous sessions for this exercise (before this session)
        prev_rows = db.exec(
            select(func.max(Set.weight_lbs), func.max((Set.weight_lbs or 0) * (1 + (Set.reps or 0) / 30)))
            .join(SessionExercise, Set.session_exercise_id == SessionExercise.id)
            .join(TrainingSession, SessionExercise.session_id == TrainingSession.id)
            .where(
                SessionExercise.exercise_id == ex.id,
                TrainingSession.id != session_id,
                Set.is_warmup == False,
                Set.status == "done",
            )
        ).one()

        all_time_max_weight = prev_rows[0] or 0
        all_time_max_e1rm = prev_rows[1] or 0

        # Check weight PR
        if max_weight > all_time_max_weight:
            pr = PRRecord(
                session_id=session_id,
                exercise_id=ex.id,
                session_exercise_id=se.id,
                pr_type="weight",
                pr_value=max_weight,
                previous_value=all_time_max_weight if all_time_max_weight > 0 else None,
            )
            db.add(pr)
            new_prs.append({"exercise": ex.name, "type": "weight", "value": max_weight, "previous": all_time_max_weight})

        # Check e1RM PR
        if e1rm and e1rm > all_time_max_e1rm:
            pr = PRRecord(
                session_id=session_id,
                exercise_id=ex.id,
                session_exercise_id=se.id,
                pr_type="e1rm",
                pr_value=e1rm,
                previous_value=all_time_max_e1rm if all_time_max_e1rm > 0 else None,
            )
            db.add(pr)
            new_prs.append({"exercise": ex.name, "type": "e1rm", "value": e1rm, "previous": all_time_max_e1rm})

    db.commit()
    return {"prs": new_prs}


# ─── Dashboard ────────────────────────────────────────────────────────────────

@app.get("/api/dashboard")
def dashboard(db: Session = Depends(get_session)):
    today = dt.date.today()
    week_start = today - dt.timedelta(days=today.weekday())
    month_ago = today - dt.timedelta(days=30)

    today_session = db.exec(
        select(TrainingSession).where(TrainingSession.session_date == today)
    ).first()

    recent = db.exec(
        select(TrainingSession).where(TrainingSession.session_date >= today - dt.timedelta(days=7)).order_by(TrainingSession.session_date.desc())
    ).all()
    if not recent:
        recent = db.exec(select(TrainingSession).order_by(TrainingSession.session_date.desc()).limit(10)).all()

    # Get exercise counts for recent sessions
    session_ids = [s.id for s in recent]
    ex_counts = {}
    if session_ids:
        rows = db.exec(
            select(SessionExercise.session_id, func.count(SessionExercise.id))
            .where(SessionExercise.session_id.in_(session_ids))
            .group_by(SessionExercise.session_id)
        ).all()
        ex_counts = {r[0]: r[1] for r in rows}

    recent_out = []
    for s in recent:
        d = _session_to_dict(s)
        d["exercise_count"] = ex_counts.get(s.id, 0)
        recent_out.append(d)

    this_week = db.exec(
        select(func.count(TrainingSession.id)).where(TrainingSession.session_date >= week_start)
    ).one()

    nutrition_bw = db.exec(
        select(NutritionDay)
        .where(
            NutritionDay.nutrition_date >= month_ago,
            NutritionDay.body_weight_lbs.isnot(None),
        )
        .order_by(NutritionDay.nutrition_date)
    ).all()

    session_bw = db.exec(
        select(TrainingSession)
        .where(
            TrainingSession.session_date >= month_ago,
            TrainingSession.body_weight_lbs.isnot(None),
        )
        .order_by(TrainingSession.session_date)
    ).all()

    bw_map: dict = {}
    for s in session_bw:
        bw_map[str(s.session_date)] = s.body_weight_lbs
    for n in nutrition_bw:
        bw_map[str(n.nutrition_date)] = n.body_weight_lbs

    bw_trend = [{"date": k, "weight": v} for k, v in sorted(bw_map.items())]

    # Recent PRs
    pr_rows = db.exec(
        select(PRRecord, Exercise.name)
        .join(Exercise, PRRecord.exercise_id == Exercise.id)
        .order_by(PRRecord.created_at.desc())
        .limit(10)
    ).all()
    recent_prs = [
        {
            "id": pr.id,
            "date": str(db.get(TrainingSession, pr.session_id).session_date),
            "exercise_name": name,
            "pr_type": pr.pr_type,
            "pr_value": pr.pr_value,
            "previous_value": pr.previous_value,
        }
        for pr, name in pr_rows
    ]

    return {
        "today_session": _session_to_dict(today_session) if today_session else None,
        "recent_sessions": recent_out,
        "sessions_this_week": this_week,
        "body_weight_trend": bw_trend,
        "recent_prs": recent_prs,
    }
