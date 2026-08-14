from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import get_current_user
from app.models.ingredient import Ingredient
from app.models.recipe import Recipe
from app.models.recipe_ingredient import RecipeIngredient
from app.models.user import User
from app.schemas.ingredient import IngredientCreate, IngredientResponse, IngredientUpdate

router = APIRouter(prefix="/ingredients", tags=["ingredients"])


@router.post("/", response_model=IngredientResponse, status_code=201)
def create_ingredient(
    ingredient: IngredientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_ingredient = Ingredient(**ingredient.model_dump(), user_id=current_user.id)
    db.add(db_ingredient)
    db.commit()
    db.refresh(db_ingredient)
    return db_ingredient


@router.get("/", response_model=List[IngredientResponse])
def get_ingredients(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Ingredient)
        .filter(Ingredient.user_id == current_user.id)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{id}", response_model=IngredientResponse)
def get_ingredient(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ingredient = (
        db.query(Ingredient)
        .filter(Ingredient.id == id)
        .filter(Ingredient.user_id == current_user.id)
        .first()
    )
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    return ingredient


@router.put("/{id}", response_model=IngredientResponse)
def update_ingredient(
    id: int,
    ingredient: IngredientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_ingredient = (
        db.query(Ingredient)
        .filter(Ingredient.id == id)
        .filter(Ingredient.user_id == current_user.id)
        .first()
    )
    if not db_ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")

    update_data = ingredient.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_ingredient, key, value)

    db.commit()
    db.refresh(db_ingredient)
    return db_ingredient


@router.delete("/{id}", status_code=204)
def delete_ingredient(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_ingredient = (
        db.query(Ingredient)
        .filter(Ingredient.id == id)
        .filter(Ingredient.user_id == current_user.id)
        .first()
    )
    if not db_ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")

    used_in = (
        db.query(Recipe.name)
        .join(RecipeIngredient, RecipeIngredient.recipe_id == Recipe.id)
        .filter(RecipeIngredient.ingredient_id == db_ingredient.id)
        .filter(Recipe.user_id == current_user.id)
        .distinct()
        .all()
    )
    recipe_names = [name for (name,) in used_in if name]
    if recipe_names:
        listed = ", ".join(recipe_names)
        raise HTTPException(
            status_code=409,
            detail=(
                f"Can't delete {db_ingredient.name} — it's used in {listed}. "
                "Remove it from those recipes first."
            ),
        )

    db.delete(db_ingredient)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=(
                f"Can't delete {db_ingredient.name} — it's still used in a recipe. "
                "Remove it from those recipes first."
            ),
        ) from exc
