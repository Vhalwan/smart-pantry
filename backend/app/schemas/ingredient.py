from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class IngredientCreate(BaseModel):
    name: str
    quantity: float
    unit: str
    category: Optional[str] = None
    expiry_date: Optional[date] = None


class IngredientUpdate(BaseModel):
    name: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    category: Optional[str] = None
    expiry_date: Optional[date] = None


class IngredientResponse(BaseModel):
    id: int
    name: str
    quantity: float
    unit: str
    category: Optional[str] = None
    expiry_date: Optional[date] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
