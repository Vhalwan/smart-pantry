from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db import Base


class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    instructions = Column(Text, nullable=True)
    prep_time_minutes = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # A recipe has many ingredient lines and can appear in many meal plans
    ingredients = relationship("RecipeIngredient", back_populates="recipe")
    meal_plans = relationship("MealPlan", back_populates="recipe")
