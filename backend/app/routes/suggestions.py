import json
import os
import re
from datetime import date
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from google import genai
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import get_current_user
from app.models.ingredient import Ingredient
from app.models.recipe import Recipe
from app.models.user import User

router = APIRouter(prefix="/recipes", tags=["suggestions"])

# Same 3-day near-expiry window as the pantry badge (calendar days, inclusive of today).
NEAR_EXPIRY_DAYS = 3
THIN_PANTRY_MAX_ITEMS = 2


def _strip_json_fences(text: str) -> str:
    text = text.strip()
    fence_match = re.match(r"^```(?:json)?\s*\n?(.*?)\n?```\s*$", text, re.DOTALL | re.IGNORECASE)
    if fence_match:
        return fence_match.group(1).strip()
    return text


def _normalize_name(value: str) -> str:
    return (value or "").strip().lower()


def _expiry_label(expiry_date: Optional[date], today: date) -> Optional[str]:
    """Return EXPIRED / EXPIRING SOON, matching the pantry badge window."""
    if expiry_date is None:
        return None
    days_until = (expiry_date - today).days
    if days_until < 0:
        return f"EXPIRED on {expiry_date.isoformat()}"
    if days_until <= NEAR_EXPIRY_DAYS:
        return f"EXPIRING SOON — {expiry_date.isoformat()}"
    return None


def _format_ingredient_line(ing: Ingredient, today: date) -> str:
    line = f"- {ing.name}: {ing.quantity} {ing.unit}"
    label = _expiry_label(ing.expiry_date, today)
    if label:
        return f"{line} [{label}]"
    return line


def _build_suggestion_prompt(
    ingredients: List[Ingredient],
    saved_names: List[str],
    today: Optional[date] = None,
) -> str:
    today = today or date.today()
    pantry_lines = [_format_ingredient_line(ing, today) for ing in ingredients]
    ingredient_list = "\n".join(pantry_lines)
    has_urgent = any(_expiry_label(ing.expiry_date, today) for ing in ingredients)

    avoid_block = ""
    if saved_names:
        avoid_list = "\n".join(f"- {name}" for name in saved_names)
        avoid_block = (
            "\n\nThe user already saved these recipes. Do NOT suggest the same or "
            "near-identical dishes (ignore capitalization). Prefer different ideas:\n"
            f"{avoid_list}"
        )

    expiry_block = ""
    if has_urgent:
        expiry_block = (
            "\n\nSome ingredients are marked [EXPIRED ...] or [EXPIRING SOON ...] "
            f"(expired already, or expiring within {NEAR_EXPIRY_DAYS} days including today). "
            "Unmarked items have no expiry date or are not due soon. "
            "Prefer recipes that use the expiring or expired ingredients when you reasonably can. "
            "Do not force every suggestion to use them if that would make a worse or impractical recipe."
        )

    thin_block = ""
    if len(ingredients) <= THIN_PANTRY_MAX_ITEMS:
        thin_block = (
            f"\n\nNote: the pantry currently lists only {len(ingredients)} item(s). "
            "Keep suggestions extremely simple and honest about what can actually be made."
        )

    return (
        "Suggest exactly 3 recipes using ONLY (or mostly) the ingredients listed below.\n\n"
        "The cook is often in a rush and may have a thin pantry, not a fully stocked kitchen. "
        "Favor shorter prep time when reasonable, clear simple steps, and recipes that mostly "
        "use what is already on hand. Do not assume unlisted staples (oil, salt, spices, and so on) "
        "are available. If a recipe still needs an ingredient the user likely does not have, say so "
        "honestly in the description or instructions rather than silently assuming a well-stocked pantry.\n\n"
        "If few ingredients are available, it is OK to suggest a very simple recipe or to be upfront "
        "in the description that the pantry is limited. Do not fabricate an elaborate dish the user "
        "cannot actually make."
        f"{expiry_block}"
        "\n\nRespond ONLY with valid JSON matching this shape, with no extra commentary:\n"
        '[{"name": str, "description": str, "instructions": str, '
        '"prep_time_minutes": int, '
        '"ingredients_used": [{"name": str, "quantity": str, "unit": str}]}]\n'
        "For each ingredient in ingredients_used, estimate a reasonable quantity and unit "
        "needed for the recipe. Prefer the same units already present in the pantry list "
        "where sensible."
        f"{avoid_block}\n\n"
        f"Available ingredients:\n{ingredient_list}"
        f"{thin_block}"
    )


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
            detail="Add a few ingredients to get suggestions.",
        )

    saved_recipes = (
        db.query(Recipe)
        .filter(Recipe.user_id == current_user.id)
        .all()
    )
    saved_names = [recipe.name for recipe in saved_recipes if recipe.name]
    saved_name_set = {_normalize_name(name) for name in saved_names}

    prompt = _build_suggestion_prompt(ingredients, saved_names)

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
