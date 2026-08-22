import { unitsMatch } from "./units";

export function formatQuantity(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return String(value ?? "");
  }
  return Number.isInteger(n) ? String(n) : String(n);
}

/** Local calendar date as YYYY-MM-DD (same idea as pantry expiry). */
export function localTodayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Preview whether cook would succeed, using the same rules as POST /recipes/{id}/cook
 * (id match + unit aliases; no amount conversion).
 */
export function assessCookReadiness(recipe, pantryById) {
  const lines = recipe?.ingredients ?? [];
  if (lines.length === 0) {
    return {
      status: "empty",
      label: "No ingredients to cook",
      canCook: false,
    };
  }

  const shortNames = [];
  const skipNames = [];

  for (const line of lines) {
    const item = pantryById.get(line.ingredient_id);
    if (!item) {
      skipNames.push(`Ingredient #${line.ingredient_id}`);
      continue;
    }
    if (!unitsMatch(line.unit, item.unit)) {
      skipNames.push(item.name);
      continue;
    }
    if (Number(item.quantity) < Number(line.quantity)) {
      shortNames.push(item.name);
    }
  }

  if (skipNames.length === 0 && shortNames.length === 0) {
    return { status: "ready", label: "Ready", canCook: true };
  }

  if (skipNames.length === 0) {
    return {
      status: "short",
      label: `Short on ${shortNames.join(", ")}`,
      canCook: true,
    };
  }

  const bits = [];
  if (shortNames.length > 0) {
    bits.push(`short on ${shortNames.join(", ")}`);
  }
  bits.push(`missing or unit mismatch: ${skipNames.join(", ")}`);
  return {
    status: "blocked",
    label: bits.join("; "),
    canCook: true,
  };
}

export function cookNoteFromResult(result) {
  const updated = result?.updated ?? [];
  const short = result?.short ?? [];
  const skipped = result?.skipped ?? [];
  const parts = [];

  if (updated.length + short.length > 0) {
    parts.push("Pantry updated.");
  } else if (skipped.length === 0) {
    parts.push("This recipe has no ingredients to subtract.");
  } else {
    parts.push("Pantry unchanged.");
  }

  for (const line of short) {
    parts.push(
      `Used ${formatQuantity(line.used)} ${line.unit} ${line.name}, recipe needed ${formatQuantity(line.needed)}.`,
    );
  }
  for (const line of skipped) {
    if (line.reason === "missing") {
      parts.push(`Skipped ${line.name} (no longer in pantry).`);
    } else if (line.reason === "unit_mismatch") {
      parts.push(
        `Skipped ${line.name} (recipe: ${line.recipe_unit}, pantry: ${line.pantry_unit}). Use the same unit on the pantry item if you want it subtracted next time.`,
      );
    } else {
      parts.push(`Skipped ${line.name}.`);
    }
  }

  return {
    text: parts.join(" "),
    warning: short.length > 0 || skipped.length > 0,
    subtracted: updated.length + short.length > 0,
  };
}
