# app/models/budget.py
from sqlalchemy import Column, Integer, Float, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy import CheckConstraint
from app.db import Base

class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    month = Column(Integer, nullable=False)   # 1-12
    year = Column(Integer, nullable=False)    # e.g. 2026
    monthly_limit = Column(Float, nullable=False)

    category = relationship("Category", back_populates="budgets")

    __table_args__ = (
        UniqueConstraint("category_id", "month", "year", name="uq_category_month_year"),
        CheckConstraint("month >= 1 AND month <= 12", name="ck_valid_month"),
    )