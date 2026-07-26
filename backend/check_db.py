from sqlalchemy import create_engine, inspect, text
import os

engine = create_engine(os.environ["DATABASE_URL"])
insp = inspect(engine)
print("Tables:", insp.get_table_names())

with engine.connect() as conn:
    result = conn.execute(text("SELECT typname FROM pg_type WHERE typname = 'mealtype'"))
    print("mealtype enum exists:", result.fetchone() is not None)
