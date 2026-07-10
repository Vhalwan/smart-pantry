# app/models/category.py
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.db import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)

    transactions = relationship("Transaction", back_populates="category")
    budget = relationship("Budget", back_populates="category", uselist=False)