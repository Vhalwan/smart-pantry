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

/** Prefer the shared spelling when the value is already a known unit. */
export function canonicalUnit(value) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return "";
  }
  const match = COMMON_UNITS.find(
    (unit) => unit.toLowerCase() === trimmed.toLowerCase(),
  );
  return match ?? trimmed;
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
