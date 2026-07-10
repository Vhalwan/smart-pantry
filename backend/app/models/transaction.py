from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.db import Base

class TransactionType(str, enum.Enum):
    income = "income"
    expense = "expense"

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float, nullable=False)
    type = Column(Enum(TransactionType), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)  # changed
    description = Column(String, nullable=True)
    date = Column(Date, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    category = relationship("Category", back_populates="transactions")  # new