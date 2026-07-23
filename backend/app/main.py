from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db import engine, Base
import app.models  # registers Ingredient, Recipe, RecipeIngredient, MealPlan with Base
from app.routes import auth, ingredients, meal_plans, recipes, suggestions

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

app.include_router(auth.router)
app.include_router(ingredients.router)
app.include_router(suggestions.router)  # before recipes so /suggest is not captured by /{id}
app.include_router(recipes.router)
app.include_router(meal_plans.router)


@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Smart Pantry API is running"}
