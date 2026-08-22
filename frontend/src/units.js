/** Common kitchen units for pantry and recipe forms. No conversion between them. */
export const COMMON_UNITS = [
  "g",
  "kg",
  "ml",
  "cup",
  "tbsp",
  "tsp",
  "pcs",
  "lb",
  "oz",
  "can",
  "clove",
];

/**
 * Map common spellings / plurals to a COMMON_UNITS value.
 * Same measure only — does not convert cup ↔ ml or g ↔ cup.
 */
const UNIT_ALIASES = {
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  ml: "ml",
  milliliter: "ml",
  milliliters: "ml",
  millilitre: "ml",
  millilitres: "ml",
  cup: "cup",
  cups: "cup",
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  pcs: "pcs",
  pc: "pcs",
  piece: "pcs",
  pieces: "pcs",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  can: "can",
  cans: "can",
  clove: "clove",
  cloves: "clove",
};

/** Prefer the shared spelling when the value is a known unit or alias. */
export function canonicalUnit(value) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return "";
  }
  const alias = UNIT_ALIASES[trimmed.toLowerCase()];
  if (alias) {
    return alias;
  }
  const match = COMMON_UNITS.find(
    (unit) => unit.toLowerCase() === trimmed.toLowerCase(),
  );
  return match ?? trimmed;
}

/** True when both sides mean the same unit after alias + case/trim. */
export function unitsMatch(left, right) {
  const a = canonicalUnit(left);
  const b = canonicalUnit(right);
  return Boolean(a) && Boolean(b) && a.toLowerCase() === b.toLowerCase();
}

/**
 * Options for a unit <select>. Includes a leftover custom value so older
 * free-text pantry rows still appear and can be kept until the user changes them.
 */
export function unitSelectOptions(currentUnit) {
  const options = [...COMMON_UNITS];
  const canonical = canonicalUnit(currentUnit);
  if (
    canonical &&
    !options.some((unit) => unit.toLowerCase() === canonical.toLowerCase())
  ) {
    options.push(canonical);
  }
  return options;
}
