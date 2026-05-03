"""Pydantic request bodies for FastAPI endpoints.

Response shapes remain plain dicts (built by `_ex_to_dict` etc. in main.py)
to avoid breaking the existing frontend contract.
"""
from typing import List, Optional

from pydantic import BaseModel, Field


# ─── Exercises ────────────────────────────────────────────────────────────────


class ExerciseCreate(BaseModel):
    name: str
    aliases: List[str] = Field(default_factory=list)
    primary_muscles: List[str] = Field(default_factory=list)
    secondary_muscles: List[str] = Field(default_factory=list)
    equipment: Optional[str] = None
    movement_pattern: Optional[str] = None
    is_compound: bool = False
    notes: Optional[str] = None


class ExerciseUpdate(BaseModel):
    name: Optional[str] = None
    aliases: Optional[List[str]] = None
    primary_muscles: Optional[List[str]] = None
    secondary_muscles: Optional[List[str]] = None
    equipment: Optional[str] = None
    movement_pattern: Optional[str] = None
    is_compound: Optional[bool] = None
    target_reps_low: Optional[int] = None
    target_reps_high: Optional[int] = None
    progression_enabled: Optional[bool] = None
    notes: Optional[str] = None


# ─── Sessions ─────────────────────────────────────────────────────────────────


class SessionCreate(BaseModel):
    date: str  # ISO date "YYYY-MM-DD"
    day_type: Optional[str] = None
    emphasis: Optional[str] = None
    body_weight_lbs: Optional[float] = None
    notes: Optional[str] = None


class SessionUpdate(BaseModel):
    date: Optional[str] = None
    day_type: Optional[str] = None
    emphasis: Optional[str] = None
    started_at: Optional[str] = None
    ended_at: Optional[str] = None
    duration_minutes: Optional[int] = None
    body_weight_lbs: Optional[float] = None
    notes: Optional[str] = None


# ─── Session Exercises ────────────────────────────────────────────────────────


class SessionExerciseCreate(BaseModel):
    exercise_id: int
    exercise_order: Optional[int] = None
    notes: Optional[str] = None


class SessionExerciseUpdate(BaseModel):
    exercise_order: Optional[int] = None
    notes: Optional[str] = None


# ─── Sets ─────────────────────────────────────────────────────────────────────


class SetCreate(BaseModel):
    set_number: Optional[int] = None
    reps: Optional[int] = None
    weight_lbs: Optional[float] = None
    is_warmup: bool = False
    rpe: Optional[float] = None
    rir: Optional[int] = None
    status: str = "done"
    notes: Optional[str] = None


class SetUpdate(BaseModel):
    set_number: Optional[int] = None
    reps: Optional[int] = None
    weight_lbs: Optional[float] = None
    is_warmup: Optional[bool] = None
    rpe: Optional[float] = None
    rir: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None


# ─── PR check ─────────────────────────────────────────────────────────────────


class PRCheckRequest(BaseModel):
    session_id: int


# ─── Bulk session finalize (task #4) ──────────────────────────────────────────


class FinalizeSet(BaseModel):
    reps: Optional[int] = None
    weight_lbs: Optional[float] = None
    is_warmup: bool = False
    rpe: Optional[float] = None
    rir: Optional[int] = None


class FinalizeExercise(BaseModel):
    exercise_id: int
    notes: Optional[str] = None
    sets: List[FinalizeSet] = Field(default_factory=list)


class FinalizeSession(BaseModel):
    date: Optional[str] = None
    day_type: Optional[str] = None
    body_weight_lbs: Optional[float] = None
    notes: Optional[str] = None
    exercises: List[FinalizeExercise] = Field(default_factory=list)
