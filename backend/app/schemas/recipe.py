from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class RecipeIngredientCreate(BaseModel):
    ingredient_id: int
    quantity: float
    unit: str


class RecipeIngredientResponse(BaseModel):
    id: int
    ingredient_id: int
    quantity: float
    unit: str

    model_config = ConfigDict(from_attributes=True)


class RecipeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    prep_time_minutes: Optional[int] = None
    ingredients: List[RecipeIngredientCreate]


class RecipeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    prep_time_minutes: Optional[int] = None


class RecipeResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    prep_time_minutes: Optional[int] = None
    created_at: datetime
    ingredients: List[RecipeIngredientResponse]

    model_config = ConfigDict(from_attributes=True)
