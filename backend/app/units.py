"""Kitchen unit aliases. Same measure only — no cup↔ml or g↔cup conversion."""

UNIT_ALIASES = {
    "g": "g",
    "gram": "g",
    "grams": "g",
    "kg": "kg",
    "kilogram": "kg",
    "kilograms": "kg",
    "ml": "ml",
    "milliliter": "ml",
    "milliliters": "ml",
    "millilitre": "ml",
    "millilitres": "ml",
    "cup": "cup",
    "cups": "cup",
    "tbsp": "tbsp",
    "tablespoon": "tbsp",
    "tablespoons": "tbsp",
    "tsp": "tsp",
    "teaspoon": "tsp",
    "teaspoons": "tsp",
    "pcs": "pcs",
    "pc": "pcs",
    "piece": "pcs",
    "pieces": "pcs",
    "lb": "lb",
    "lbs": "lb",
    "pound": "lb",
    "pounds": "lb",
    "oz": "oz",
    "ounce": "oz",
    "ounces": "oz",
    "can": "can",
    "cans": "can",
    "clove": "clove",
    "cloves": "clove",
}


def canonical_unit(unit: str | None) -> str:
    trimmed = (unit or "").strip()
    if not trimmed:
        return ""
    return UNIT_ALIASES.get(trimmed.casefold(), trimmed)


def units_match(left: str | None, right: str | None) -> bool:
    a = canonical_unit(left).casefold()
    b = canonical_unit(right).casefold()
    return bool(a) and bool(b) and a == b
