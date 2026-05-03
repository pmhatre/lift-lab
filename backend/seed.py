"""Run this to seed the exercise library."""
import json
from sqlmodel import Session, select
from database import engine, create_db_and_tables
from models import Exercise
from seed_exercises import get_seed_data


def seed():
    create_db_and_tables()
    with Session(engine) as session:
        existing = session.exec(select(Exercise)).all()
        existing_names = {e.name for e in existing}
        
        added = 0
        for ex_data in get_seed_data():
            if ex_data["name"] in existing_names:
                continue
            exercise = Exercise(
                name=ex_data["name"],
                aliases=json.dumps(ex_data.get("aliases", [])),
                primary_muscles=json.dumps(ex_data.get("primary_muscles", [])),
                secondary_muscles=json.dumps(ex_data.get("secondary_muscles", [])),
                equipment=ex_data.get("equipment"),
                movement_pattern=ex_data.get("movement_pattern"),
                is_compound=ex_data.get("is_compound", False),
                notes=ex_data.get("notes"),
            )
            session.add(exercise)
            added += 1
        
        session.commit()
        print(f"Seeded {added} exercises. Total: {added + len(existing_names)}")


if __name__ == "__main__":
    seed()
