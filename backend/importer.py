"""
FitNotes CSV import pipeline.
Fields: Name,StartTime,EndTime,BodyWeight,Exercise,Equipment,Reps,Weight,Time,Distance,Status,IsWarmup,RPE,RIR,Categories,Note
"""
import csv
import json
import io
import datetime as dt
from typing import Optional
from zoneinfo import ZoneInfo

from sqlmodel import Session, select
from rapidfuzz import fuzz, process as rfprocess

from models import Exercise, TrainingSession, SessionExercise, Set

PT_TZ = ZoneInfo("America/Los_Angeles")


def utc_to_pt_date(dt_str: str) -> dt.date:
    """Parse UTC datetime string and convert to America/Los_Angeles date (DST-aware)."""
    d = dt.datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    return d.astimezone(PT_TZ).date()


def utc_to_datetime(dt_str: str) -> Optional[dt.datetime]:
    if not dt_str:
        return None
    try:
        return dt.datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    except Exception:
        return None


def build_exercise_index(db: Session):
    """Build a name → exercise dict + flattened alias list for matching."""
    exercises = db.exec(select(Exercise)).all()
    name_map = {}
    for ex in exercises:
        name_map[ex.name.lower()] = ex
        if ex.aliases:
            for alias in json.loads(ex.aliases):
                name_map[alias.lower()] = ex
    return exercises, name_map


def find_exercise(name: str, exercises: list, name_map: dict) -> Optional[Exercise]:
    """Find exercise by exact name, alias, or fuzzy match."""
    key = name.strip().lower()
    if key in name_map:
        return name_map[key]
    
    # Fuzzy match against all names + aliases
    all_keys = list(name_map.keys())
    match = rfprocess.extractOne(key, all_keys, scorer=fuzz.token_sort_ratio, score_cutoff=80)
    if match:
        return name_map[match[0]]
    
    return None


def import_fitnotes_csv(content: bytes, db: Session, force: bool = False):
    """
    Import FitNotes CSV data.
    Returns dict with stats.
    """
    exercises_list, name_map = build_exercise_index(db)
    
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    
    # Group rows by date
    sessions_by_date: dict = {}
    unmatched_exercises = set()
    
    for row in reader:
        try:
            start_str = row.get("StartTime", "").strip()
            if not start_str:
                continue
            pt_date = utc_to_pt_date(start_str)
        except Exception:
            continue
        
        if pt_date not in sessions_by_date:
            sessions_by_date[pt_date] = {
                "rows": [],
                "start_time": row.get("StartTime", ""),
                "end_time": row.get("EndTime", ""),
                "name": row.get("Name", "").strip(),
                "body_weight": None,
            }
        
        sessions_by_date[pt_date]["rows"].append(row)
        
        # Track latest end time
        if row.get("EndTime"):
            sessions_by_date[pt_date]["end_time"] = row["EndTime"]
        
        # Body weight from first non-null
        if sessions_by_date[pt_date]["body_weight"] is None:
            bw = row.get("BodyWeight", "").strip()
            if bw:
                try:
                    sessions_by_date[pt_date]["body_weight"] = float(bw)
                except ValueError:
                    pass

    sessions_created = 0
    sessions_skipped = 0
    sets_created = 0
    
    for session_date, session_data in sorted(sessions_by_date.items()):
        # Check if session already exists
        existing = db.exec(
            select(TrainingSession).where(
                TrainingSession.session_date == session_date,
                TrainingSession.source == "fitnotes"
            )
        ).first()
        
        if existing and not force:
            sessions_skipped += 1
            continue
        
        # Parse times
        started_at = utc_to_datetime(session_data["start_time"])
        ended_at = utc_to_datetime(session_data["end_time"])
        duration = None
        if started_at and ended_at:
            duration = int((ended_at - started_at).total_seconds() / 60)
        
        # Map day name → day_type
        name_lower = session_data["name"].lower()
        if any(x in name_lower for x in ["chest", "back"]):
            day_type = "chest_back"
        elif any(x in name_lower for x in ["leg", "core"]):
            day_type = "legs_core"
        elif any(x in name_lower for x in ["shoulder", "arm"]):
            day_type = "shoulders_arms"
        elif "full" in name_lower or "whole" in name_lower:
            day_type = "full_body"
        else:
            day_type = None
        
        if existing and force:
            session_obj = existing
            session_obj.started_at = started_at
            session_obj.ended_at = ended_at
            session_obj.duration_minutes = duration
            session_obj.body_weight_lbs = session_data["body_weight"]
            session_obj.day_type = day_type
            db.add(session_obj)
        else:
            session_obj = TrainingSession(
                session_date=session_date,
                day_type=day_type,
                started_at=started_at,
                ended_at=ended_at,
                duration_minutes=duration,
                body_weight_lbs=session_data["body_weight"],
                source="fitnotes",
                source_id=str(session_date),
            )
            db.add(session_obj)
            db.flush()
            sessions_created += 1
        
        # Group rows by exercise name to maintain order
        exercises_in_session: dict = {}
        exercise_order = 0
        
        for row in session_data["rows"]:
            ex_name = row.get("Exercise", "").strip()
            if not ex_name or ex_name == "Exercise":
                continue
            
            if ex_name not in exercises_in_session:
                exercises_in_session[ex_name] = {
                    "order": exercise_order,
                    "sets": [],
                    "notes": row.get("Note", ""),
                }
                exercise_order += 1
            
            exercises_in_session[ex_name]["sets"].append(row)
        
        for ex_name, ex_data in exercises_in_session.items():
            exercise = find_exercise(ex_name, exercises_list, name_map)
            
            if exercise is None:
                unmatched_exercises.add(ex_name)
                # Create a placeholder exercise
                exercise = Exercise(
                    name=ex_name,
                    aliases=json.dumps([]),
                    primary_muscles=json.dumps([]),
                    secondary_muscles=json.dumps([]),
                    notes="Auto-created during FitNotes import - needs review",
                )
                db.add(exercise)
                db.flush()
                exercises_list.append(exercise)
                name_map[ex_name.lower()] = exercise
            
            se = SessionExercise(
                session_id=session_obj.id,
                exercise_id=exercise.id,
                exercise_order=ex_data["order"],
                notes=ex_data["notes"] or None,
            )
            db.add(se)
            db.flush()
            
            for i, row in enumerate(ex_data["sets"]):
                status = row.get("Status", "Done")
                if status not in ("Done", "Failed", "Partial"):
                    status = "done"
                else:
                    status = status.lower()
                
                is_warmup = row.get("IsWarmup", "false").lower() == "true"
                
                reps = None
                weight = None
                rpe = None
                rir = None
                
                try:
                    reps = int(row.get("Reps", "").strip() or 0) or None
                except (ValueError, AttributeError):
                    pass
                
                try:
                    w = row.get("Weight", "").strip()
                    if w:
                        weight = float(w)
                except (ValueError, AttributeError):
                    pass
                
                try:
                    r = row.get("RPE", "").strip()
                    if r:
                        rpe = float(r)
                except (ValueError, AttributeError):
                    pass
                
                try:
                    r = row.get("RIR", "").strip()
                    if r:
                        rir = int(r)
                except (ValueError, AttributeError):
                    pass
                
                s = Set(
                    session_exercise_id=se.id,
                    set_number=i + 1,
                    reps=reps,
                    weight_lbs=weight,
                    is_warmup=is_warmup,
                    rpe=rpe,
                    rir=rir,
                    status=status,
                )
                db.add(s)
                sets_created += 1
        
        db.flush()
    
    db.commit()
    
    return {
        "sessions_created": sessions_created,
        "sessions_skipped": sessions_skipped,
        "sets_created": sets_created,
        "unmatched_exercises": sorted(list(unmatched_exercises)),
    }
