from pydantic import BaseModel
from datetime import date, datetime
from app.models.transaction import TransactionType
from typing import Optional

# What the user sends when CREATING a transaction
class TransactionCreate(BaseModel):
    amount: float
    type: TransactionType
    category: str
    description: Optional[str] = None
    date: date

# What the user sends when UPDATING a transaction
class TransactionUpdate(BaseModel):
    amount: Optional[float] = None
    type: Optional[TransactionType] = None
    category: Optional[str] = None
    description: Optional[str] = None
    date: Optional[date] = None

# What your API sends BACK to the user (includes id and created_at)
class TransactionResponse(BaseModel):
    id: int
    amount: float
    type: TransactionType
    category: str
    description: Optional[str] = None
    date: date
    created_at: datetime

    class Config:
        from_attributes = True  # lets Pydantic read SQLAlchemy model objects