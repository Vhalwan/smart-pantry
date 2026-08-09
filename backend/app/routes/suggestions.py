import json
import os
import re
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from google import genai
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import get_current_user
from app.models.ingredient import Ingredient
from app.models.recipe import Recipe
from app.models.user import User

router = APIRouter(prefix="/recipes", tags=["suggestions"])


def _strip_json_fences(text: str) -> str:
    text = text.strip()
    fence_match = re.match(r"^```(?:json)?\s*\n?(.*?)\n?```\s*$", text, re.DOTALL | re.IGNORECASE)
    if fence_match:
        return fence_match.group(1).strip()
    return text


def _normalize_name(value: str) -> str:
    return (value or "").strip().lower()


@router.get("/suggest")
def suggest_recipes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[Any]:
    ingredients = (
        db.query(Ingredient)
        .filter(Ingredient.user_id == current_user.id)
        .all()
    )
    if not ingredients:
        raise HTTPException(
            status_code=400,
            detail="No ingredients found. Add ingredients to your pantry first.",
        )

    saved_recipes = (
        db.query(Recipe)
        .filter(Recipe.user_id == current_user.id)
        .all()
    )
    saved_names = [recipe.name for recipe in saved_recipes if recipe.name]
    saved_name_set = {_normalize_name(name) for name in saved_names}

    ingredient_list = "\n".join(
        f"- {ing.name}: {ing.quantity} {ing.unit}" for ing in ingredients
    )

    avoid_block = ""
    if saved_names:
        avoid_list = "\n".join(f"- {name}" for name in saved_names)
        avoid_block = (
            "\n\nThe user already saved these recipes. Do NOT suggest the same or "
            "near-identical dishes (ignore capitalization). Prefer different ideas:\n"
            f"{avoid_list}"
        )

    prompt = (
        "Suggest exactly 3 recipes using ONLY (or mostly) the ingredients listed below. "
        "Respond ONLY with valid JSON matching this shape, with no extra commentary:\n"
        '[{"name": str, "description": str, "instructions": str, '
        '"prep_time_minutes": int, '
        '"ingredients_used": [{"name": str, "quantity": str, "unit": str}]}]\n'
        "For each ingredient in ingredients_used, estimate a reasonable quantity and unit "
        "needed for the recipe. Prefer the same units already present in the pantry list "
        "where sensible."
        f"{avoid_block}\n\n"
        f"Available ingredients:\n{ingredient_list}"
    )

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=502,
            detail="Recipe suggestion service is misconfigured: GEMINI_API_KEY is missing.",
        )

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        raw_text = _strip_json_fences(response.text or "")
        suggestions = json.loads(raw_text)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to generate recipe suggestions: {exc}",
        ) from exc

    if not isinstance(suggestions, list):
        raise HTTPException(
            status_code=502,
            detail="Failed to generate recipe suggestions: unexpected response shape.",
        )

    # Soft filter: drop exact name matches the model ignored (case/whitespace).
    fresh = [
        recipe
        for recipe in suggestions
        if _normalize_name(recipe.get("name") if isinstance(recipe, dict) else "")
        not in saved_name_set
    ]
    return fresh if fresh else suggestions
