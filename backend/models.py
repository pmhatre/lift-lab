import datetime as dt
from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship


class Exercise(SQLModel, table=True):
    __tablename__ = "exercises"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    aliases: Optional[str] = Field(default=None)       # JSON array of strings
    primary_muscles: Optional[str] = Field(default=None)   # JSON array
    secondary_muscles: Optional[str] = Field(default=None)  # JSON array
    equipment: Optional[str] = Field(default=None)
    movement_pattern: Optional[str] = Field(default=None)
    is_compound: bool = Field(default=False)
    target_reps_low: Optional[int] = Field(default=None)
    target_reps_high: Optional[int] = Field(default=None)
    progression_enabled: bool = Field(default=False)
    notes: Optional[str] = Field(default=None)

    session_exercises: List["SessionExercise"] = Relationship(back_populates="exercise")


class TrainingSession(SQLModel, table=True):
    __tablename__ = "sessions"
    id: Optional[int] = Field(default=None, primary_key=True)
    session_date: dt.date = Field(index=True, sa_column_kwargs={"name": "date"})
    day_type: Optional[str] = Field(default=None)
    emphasis: Optional[str] = Field(default=None)
    started_at: Optional[dt.datetime] = Field(default=None)
    ended_at: Optional[dt.datetime] = Field(default=None)
    duration_minutes: Optional[int] = Field(default=None)
    body_weight_lbs: Optional[float] = Field(default=None)
    notes: Optional[str] = Field(default=None)
    source: Optional[str] = Field(default=None)
    source_id: Optional[str] = Field(default=None)

    session_exercises: List["SessionExercise"] = Relationship(back_populates="session")


class SessionExercise(SQLModel, table=True):
    __tablename__ = "session_exercises"
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="sessions.id", index=True)
    exercise_id: int = Field(foreign_key="exercises.id", index=True)
    exercise_order: Optional[int] = Field(default=None)
    notes: Optional[str] = Field(default=None)

    session: Optional[TrainingSession] = Relationship(back_populates="session_exercises")
    exercise: Optional[Exercise] = Relationship(back_populates="session_exercises")
    sets: List["Set"] = Relationship(back_populates="session_exercise")


class Set(SQLModel, table=True):
    __tablename__ = "sets"
    id: Optional[int] = Field(default=None, primary_key=True)
    session_exercise_id: int = Field(foreign_key="session_exercises.id", index=True)
    set_number: int
    reps: Optional[int] = Field(default=None)
    weight_lbs: Optional[float] = Field(default=None)
    is_warmup: bool = Field(default=False)
    rpe: Optional[float] = Field(default=None)
    rir: Optional[int] = Field(default=None)
    status: str = Field(default="done")
    notes: Optional[str] = Field(default=None)

    session_exercise: Optional[SessionExercise] = Relationship(back_populates="sets")


class DexaScan(SQLModel, table=True):
    __tablename__ = "dexa_scans"
    id: Optional[int] = Field(default=None, primary_key=True)
    scan_date: dt.date = Field(unique=True)
    total_lbs: Optional[float] = Field(default=None)
    lean_lbs: Optional[float] = Field(default=None)
    fat_lbs: Optional[float] = Field(default=None)
    bf_pct: Optional[float] = Field(default=None)
    arms_lbs: Optional[float] = Field(default=None)
    legs_lbs: Optional[float] = Field(default=None)
    trunk_lbs: Optional[float] = Field(default=None)
    vat_kg: Optional[float] = Field(default=None)
    source: str = Field(default="bodyspec")
    notes: Optional[str] = Field(default=None)


class NutritionDay(SQLModel, table=True):
    __tablename__ = "nutrition_days"
    id: Optional[int] = Field(default=None, primary_key=True)
    nutrition_date: dt.date = Field(unique=True, sa_column_kwargs={"name": "date"})
    calories: Optional[float] = Field(default=None)
    protein_g: Optional[float] = Field(default=None)
    carbs_g: Optional[float] = Field(default=None)
    fat_g: Optional[float] = Field(default=None)
    body_weight_lbs: Optional[float] = Field(default=None)


class WhoopDay(SQLModel, table=True):
    __tablename__ = "whoop_days"
    id: Optional[int] = Field(default=None, primary_key=True)
    whoop_date: dt.date = Field(unique=True, sa_column_kwargs={"name": "date"})
    recovery_score: Optional[float] = Field(default=None)
    hrv_ms: Optional[float] = Field(default=None)
    rhr_bpm: Optional[float] = Field(default=None)
    sleep_hours: Optional[float] = Field(default=None)
    strain: Optional[float] = Field(default=None)
    zone4_5_minutes: Optional[float] = Field(default=None)


class Microcycle(SQLModel, table=True):
    __tablename__ = "microcycles"
    id: Optional[int] = Field(default=None, primary_key=True)
    start_date: dt.date
    end_date: dt.date
    label: Optional[str] = Field(default=None)
    notes: Optional[str] = Field(default=None)


class PRRecord(SQLModel, table=True):
    __tablename__ = "pr_records"
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="sessions.id", index=True)
    exercise_id: int = Field(foreign_key="exercises.id", index=True)
    session_exercise_id: int = Field(foreign_key="session_exercises.id", index=True)
    pr_type: str
    pr_value: float
    previous_value: Optional[float] = Field(default=None)
    created_at: dt.datetime = Field(default_factory=lambda: dt.datetime.now(dt.timezone.utc))
