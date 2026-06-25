from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# The engine is the actual connection to the database
engine = create_engine(DATABASE_URL)

# Each request gets its own session (like a temporary workspace)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class that all our models will inherit from
Base = declarative_base()

# This is a "dependency" - FastAPI will call this to get a DB session
# and automatically close it when the request is done
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()