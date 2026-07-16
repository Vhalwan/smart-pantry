from datetime import date, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.dependencies import get_current_user
from app.models.meal_plan import MealPlan
from app.models.recipe import Recipe
from app.models.user import User
from app.schemas.meal_plan import MealPlanCreate, MealPlanResponse, MealPlanUpdate

router = APIRouter(prefix="/meal-plans", tags=["meal-plans"])


def _meal_plan_query(db: Session):
    return db.query(MealPlan).options(
        joinedload(MealPlan.recipe).joinedload(Recipe.ingredients)
    )


@router.post("/", response_model=MealPlanResponse, status_code=201)
def create_meal_plan(
    meal_plan: MealPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    recipe = db.query(Recipe).filter(Recipe.id == meal_plan.recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    db_meal_plan = MealPlan(**meal_plan.model_dump())
    db.add(db_meal_plan)
    db.commit()
    db.refresh(db_meal_plan)

    return (
        _meal_plan_query(db)
        .filter(MealPlan.id == db_meal_plan.id)
        .first()
    )


@router.get("/", response_model=List[MealPlanResponse])
def get_meal_plans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _meal_plan_query(db).all()


@router.get("/week/{start_date}", response_model=List[MealPlanResponse])
def get_meal_plans_for_week(
    start_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    end_date = start_date + timedelta(days=6)
    return (
        _meal_plan_query(db)
        .filter(MealPlan.planned_date >= start_date, MealPlan.planned_date <= end_date)
        .all()
    )


@router.get("/{id}", response_model=MealPlanResponse)
def get_meal_plan(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meal_plan = _meal_plan_query(db).filter(MealPlan.id == id).first()
    if not meal_plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    return meal_plan


@router.put("/{id}", response_model=MealPlanResponse)
def update_meal_plan(
    id: int,
    meal_plan: MealPlanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_meal_plan = _meal_plan_query(db).filter(MealPlan.id == id).first()
    if not db_meal_plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")

    update_data = meal_plan.model_dump(exclude_unset=True)
    if "recipe_id" in update_data:
        recipe = db.query(Recipe).filter(Recipe.id == update_data["recipe_id"]).first()
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")

    for key, value in update_data.items():
        setattr(db_meal_plan, key, value)

    db.commit()

    return _meal_plan_query(db).filter(MealPlan.id == id).first()


@router.delete("/{id}", status_code=204)
def delete_meal_plan(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_meal_plan = db.query(MealPlan).filter(MealPlan.id == id).first()
    if not db_meal_plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")

    db.delete(db_meal_plan)
    db.commit()
