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
from app.models.user import User

router = APIRouter(prefix="/recipes", tags=["suggestions"])


def _strip_json_fences(text: str) -> str:
    text = text.strip()
    fence_match = re.match(r"^```(?:json)?\s*\n?(.*?)\n?```\s*$", text, re.DOTALL | re.IGNORECASE)
    if fence_match:
        return fence_match.group(1).strip()
    return text


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

    ingredient_list = "\n".join(
        f"- {ing.name}: {ing.quantity} {ing.unit}" for ing in ingredients
    )

    prompt = (
        "Suggest exactly 3 recipes using ONLY (or mostly) the ingredients listed below. "
        "Respond ONLY with valid JSON matching this shape, with no extra commentary:\n"
        '[{"name": str, "description": str, "instructions": str, '
        '"prep_time_minutes": int, "ingredients_used": [str]}]\n\n'
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

    return suggestions
