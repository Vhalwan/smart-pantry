from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from pathlib import Path
from dotenv import load_dotenv

# Repo root .env (works when running from backend/ or inside Docker)
_repo_root = Path(__file__).resolve().parents[2]
load_dotenv(_repo_root / ".env")


def _normalize_database_url(url: str | None) -> str | None:
    if not url:
        return url
    # Neon (and some hosts) use postgres://; SQLAlchemy expects postgresql://
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    return url


DATABASE_URL = _normalize_database_url(os.getenv("DATABASE_URL"))

# The engine is the actual connection to the database
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

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