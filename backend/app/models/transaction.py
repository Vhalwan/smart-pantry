from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
import enum
from app.db import Base

# This is an enum - it restricts transaction type to only these two values
class TransactionType(str, enum.Enum):
    income = "income"
    expense = "expense"

# Each class here = one table in PostgreSQL
# Each Column = one column in that table
class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)  # auto-incrementing ID
    amount = Column(Float, nullable=False)               # how much money
    type = Column(Enum(TransactionType), nullable=False) # income or expense
    category = Column(String, nullable=False)            # e.g. "Food", "Rent"
    description = Column(String, nullable=True)          # optional note
    date = Column(Date, nullable=False)                  # when it happened
    created_at = Column(DateTime, server_default=func.now())  # auto timestamp