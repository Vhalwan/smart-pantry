from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db import engine, Base
import app.models  # registers Ingredient, Recipe, RecipeIngredient, MealPlan with Base

# Creates all tables in PostgreSQL on startup if they don't exist yet
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Smart Pantry",
    description="API for managing pantry ingredients, recipes, and meal plans",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React/Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Smart Pantry API is running"}
