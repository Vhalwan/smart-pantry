from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.dependencies import get_current_user
from app.models.recipe import Recipe
from app.models.recipe_ingredient import RecipeIngredient
from app.models.user import User
from app.schemas.recipe import RecipeCreate, RecipeResponse, RecipeUpdate

router = APIRouter(prefix="/recipes", tags=["recipes"])


@router.post("/", response_model=RecipeResponse, status_code=201)
def create_recipe(
    recipe: RecipeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    recipe_data = recipe.model_dump(exclude={"ingredients"})
    db_recipe = Recipe(**recipe_data)
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
    return db.query(Recipe).options(joinedload(Recipe.ingredients)).all()


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
    db_recipe = db.query(Recipe).filter(Recipe.id == id).first()
    if not db_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    db.query(RecipeIngredient).filter(RecipeIngredient.recipe_id == id).delete()
    db.delete(db_recipe)
    db.commit()
