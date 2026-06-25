from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db import engine, Base
from app.routes import transactions

# This creates all tables in PostgreSQL automatically on startup
# It looks at all your models and creates the tables if they don't exist yet
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Personal Finance Tracker",
    description="API for tracking personal finances",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React/Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register our transaction routes
# All transaction routes will be under /transactions
app.include_router(transactions.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Finance Tracker API is running"}