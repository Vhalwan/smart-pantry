from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.dependencies import get_current_user
from app.models.ingredient import Ingredient
from app.models.recipe import Recipe
from app.models.recipe_ingredient import RecipeIngredient
from app.models.user import User
from app.schemas.recipe import (
    CookRecipeResponse,
    CookShortLine,
    CookSkippedLine,
    CookUpdatedLine,
    RecipeCreate,
    RecipeResponse,
    RecipeUpdate,
)
from app.units import units_match

router = APIRouter(prefix="/recipes", tags=["recipes"])


def _missing_name(ingredient_id: int) -> str:
    return f"Ingredient #{ingredient_id}"


@router.post("/", response_model=RecipeResponse, status_code=201)
def create_recipe(
    recipe: RecipeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    recipe_data = recipe.model_dump(exclude={"ingredients"})
    db_recipe = Recipe(**recipe_data, user_id=current_user.id)
    db.add(db_recipe)
    db.flush()

    for ingredient in recipe.ingredients:
        db_ingredient = RecipeIngredient(
            recipe_id=db_recipe.id,
            **ingredient.model_dump(),
        )
        db.add(db_ingredient)

    db.commit()
    db.refresh(db_recipe)

    return (
        db.query(Recipe)
        .options(joinedload(Recipe.ingredients))
        .filter(Recipe.id == db_recipe.id)
        .first()
    )


@router.get("/", response_model=List[RecipeResponse])
def get_recipes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Recipe)
        .options(joinedload(Recipe.ingredients))
        .filter(Recipe.user_id == current_user.id)
        .all()
    )


@router.post("/{id}/cook", response_model=CookRecipeResponse)
def cook_recipe(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Subtract this recipe's linked pantry amounts. Rows that hit 0 stay at 0."""
    recipe = (
        db.query(Recipe)
        .options(joinedload(Recipe.ingredients))
        .filter(Recipe.id == id)
        .filter(Recipe.user_id == current_user.id)
        .first()
    )
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    lines = list(recipe.ingredients or [])
    updated: List[CookUpdatedLine] = []
    short: List[CookShortLine] = []
    skipped: List[CookSkippedLine] = []

    if not lines:
        return CookRecipeResponse(
            recipe_id=recipe.id,
            recipe_name=recipe.name,
            updated=[],
            short=[],
            skipped=[],
        )

    line_ids = {line.ingredient_id for line in lines}
    pantry_items = (
        db.query(Ingredient)
        .filter(Ingredient.id.in_(line_ids))
        .filter(Ingredient.user_id == current_user.id)
        .all()
    )
    pantry_by_id = {item.id: item for item in pantry_items}

    for line in lines:
        pantry_item = pantry_by_id.get(line.ingredient_id)
        if pantry_item is None:
            skipped.append(
                CookSkippedLine(
                    ingredient_id=line.ingredient_id,
                    name=_missing_name(line.ingredient_id),
                    reason="missing",
                    recipe_unit=line.unit,
                )
            )
            continue

        if not units_match(line.unit, pantry_item.unit):
            skipped.append(
                CookSkippedLine(
                    ingredient_id=pantry_item.id,
                    name=pantry_item.name,
                    reason="unit_mismatch",
                    recipe_unit=line.unit,
                    pantry_unit=pantry_item.unit,
                )
            )
            continue

        needed = float(line.quantity)
        previous = float(pantry_item.quantity)
        used = min(previous, needed)
        pantry_item.quantity = max(0.0, previous - needed)
        new_quantity = float(pantry_item.quantity)

        if used < needed:
            short.append(
                CookShortLine(
                    ingredient_id=pantry_item.id,
                    name=pantry_item.name,
                    unit=pantry_item.unit,
                    needed=needed,
                    used=used,
                    previous_quantity=previous,
                    quantity=new_quantity,
                )
            )
        else:
            updated.append(
                CookUpdatedLine(
                    ingredient_id=pantry_item.id,
                    name=pantry_item.name,
                    unit=pantry_item.unit,
                    needed=needed,
                    used=used,
                    previous_quantity=previous,
                    quantity=new_quantity,
                )
            )

    db.commit()

    return CookRecipeResponse(
        recipe_id=recipe.id,
        recipe_name=recipe.name,
        updated=updated,
        short=short,
        skipped=skipped,
    )


@router.get("/{id}", response_model=RecipeResponse)
def get_recipe(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    recipe = (
        db.query(Recipe)
        .options(joinedload(Recipe.ingredients))
        .filter(Recipe.id == id)
        .filter(Recipe.user_id == current_user.id)
        .first()
    )
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe


@router.put("/{id}", response_model=RecipeResponse)
def update_recipe(
    id: int,
    recipe: RecipeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_recipe = (
        db.query(Recipe)
        .options(joinedload(Recipe.ingredients))
        .filter(Recipe.id == id)
        .filter(Recipe.user_id == current_user.id)
        .first()
    )
    if not db_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    update_data = recipe.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_recipe, key, value)

    db.commit()
    db.refresh(db_recipe)
    return db_recipe


@router.delete("/{id}", status_code=204)
def delete_recipe(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_recipe = (
        db.query(Recipe)
        .filter(Recipe.id == id)
        .filter(Recipe.user_id == current_user.id)
        .first()
    )
    if not db_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    db.query(RecipeIngredient).filter(RecipeIngredient.recipe_id == id).delete()
    db.delete(db_recipe)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Cannot delete recipe: it is referenced by a meal plan",
        )
