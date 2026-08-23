import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createIngredient,
  deleteIngredient,
  getIngredients,
  updateIngredient,
} from "../api/ingredients";
import {
  cancelPendingRemoval,
  flushOverduePendingRemovals,
  getPendingRemovalIds,
  schedulePendingRemoval,
  subscribePendingRemovals,
} from "../api/pendingIngredientRemovals";
import { createRecipe, getRecipes } from "../api/recipes";
import { getSuggestions } from "../api/suggestions";
import { useAuth } from "../context/AuthContext";
import {
  getExpiryStatus,
  parseLocalDate,
} from "../expiryHelpers";
import { COMMON_UNITS, canonicalUnit, unitsMatch } from "../units";

const UNDO_TOAST_MS = 5000;
const EMPTY_PANTRY_SUGGEST_MESSAGE =
  "Add a few ingredients to get suggestions.";
const EMPTY_PANTRY_NEXT_STEP =
  "Your pantry is empty. Add a few ingredients below (name, how much, and a unit). Then tap Suggest recipes for ideas from what you have.";
const SUGGEST_SLOW_MS = 3000;
const SUGGEST_LOADING_MESSAGE = "Generating suggestions…";
const SUGGEST_WAKING_MESSAGE =
  "The recipe service is waking up. This can take a few seconds.";
const SUGGEST_FAIL_MESSAGE =
  "Couldn't get recipe ideas right now. Try again in a moment.";
const SUGGEST_TIMEOUT_MESSAGE =
  "Recipe ideas are taking too long. The service may be waking up — try again in a moment.";
const SUGGEST_NETWORK_MESSAGE =
  "Couldn't reach the recipe service. Check your connection and try again.";

function normalizeName(value) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Last-word singular/plural variants only — not fuzzy / substring matching. */
function lastWordInflections(word) {
  const variants = new Set([word]);
  if (word.length < 3) {
    return variants;
  }
  if (word.endsWith("ies") && word.length > 4) {
    variants.add(word.slice(0, -3) + "y");
  } else if (word.endsWith("y") && !/[aeiou]y$/.test(word)) {
    variants.add(word.slice(0, -1) + "ies");
  }
  if (word.endsWith("oes") && word.length > 4) {
    variants.add(word.slice(0, -2));
  } else if (word.endsWith("o")) {
    variants.add(`${word}es`);
  }
  if (/(?:ch|sh|ss|x|z)es$/.test(word) && word.length > 4) {
    variants.add(word.slice(0, -2));
  } else if (/(?:ch|sh|ss|x|z)$/.test(word)) {
    variants.add(`${word}es`);
  }
  if (word.endsWith("s") && !word.endsWith("ss") && !word.endsWith("us")) {
    variants.add(word.slice(0, -1));
  } else if (!word.endsWith("s")) {
    variants.add(`${word}s`);
  }
  return variants;
}

function namesMatch(left, right) {
  const a = normalizeName(left);
  const b = normalizeName(right);
  if (!a || !b) {
    return false;
  }
  if (a === b) {
    return true;
  }
  const aParts = a.split(" ");
  const bParts = b.split(" ");
  if (aParts.slice(0, -1).join(" ") !== bParts.slice(0, -1).join(" ")) {
    return false;
  }
  return lastWordInflections(aParts[aParts.length - 1]).has(
    bParts[bParts.length - 1],
  );
}

function findPantryMatch(items, usedName) {
  const used = normalizeName(usedName);
  const exact = items.find((item) => normalizeName(item.name) === used);
  if (exact) {
    return exact;
  }
  return items.find((item) => namesMatch(item.name, usedName));
}

function describeUnitSkip(item) {
  const suggestionUnit = item.suggestionUnit?.trim() || "—";
  const pantryUnit = item.pantryUnit?.trim() || "—";
  return `${item.name} (suggestion: ${suggestionUnit}, pantry: ${pantryUnit})`;
}

function saveNoteFromMatch({ unmatched, unitMismatches, saved }) {
  const unitHint =
    "Use the same unit on the pantry item as the suggestion if you want it linked next time (cup and cups count as the same; the app does not convert cup to ml).";
  const nameHint =
    "Rename the pantry item to match the suggestion, or add the missing item, then save again.";

  if (!saved) {
    const parts = ["Nothing matched your pantry, so this wasn't saved."];
    if (unmatched.length > 0) {
      parts.push(`No name match: ${unmatched.join(", ")}.`);
      parts.push(nameHint);
    }
    if (unitMismatches.length > 0) {
      parts.push(`Skipped ${unitMismatches.map(describeUnitSkip).join(", ")}.`);
      parts.push(unitHint);
    }
    return parts.join(" ");
  }

  if (unmatched.length === 0 && unitMismatches.length === 0) {
    return "Saved to Recipes.";
  }

  const clauses = [];
  if (unmatched.length > 0) {
    clauses.push(`couldn't match ${unmatched.join(", ")}`);
  }
  if (unitMismatches.length > 0) {
    clauses.push(`skipped ${unitMismatches.map(describeUnitSkip).join(", ")}`);
  }
  let text = `Saved, but ${clauses.join("; ")}.`;
  if (unmatched.length > 0) {
    text += ` ${nameHint}`;
  }
  if (unitMismatches.length > 0) {
    text += ` ${unitHint}`;
  }
  return text;
}

function apiErrorMessage(err, fallback) {
  const detail = err?.response?.data?.detail;
  return typeof detail === "string" ? detail : fallback;
}

function isEmptyPantrySuggestError(err) {
  const detail = err?.response?.data?.detail;
  return (
    err?.response?.status === 400 &&
    typeof detail === "string" &&
    (/no ingredients/i.test(detail) || /add a few ingredients/i.test(detail))
  );
}

/** Plain-language copy only — never status codes or API/Gemini detail. */
function suggestFailureMessage(err) {
  if (err?.code === "ECONNABORTED") {
    return SUGGEST_TIMEOUT_MESSAGE;
  }
  if (!err?.response) {
    return SUGGEST_NETWORK_MESSAGE;
  }
  return SUGGEST_FAIL_MESSAGE;
}

function expiryUrgencyRank(status) {
  if (status === "expired") {
    return 0;
  }
  if (status === "expiring_soon") {
    return 1;
  }
  return 2;
}

function sortIngredientsForDisplay(items) {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const statusA = getExpiryStatus(a.item.expiry_date);
      const statusB = getExpiryStatus(b.item.expiry_date);
      const rankA = expiryUrgencyRank(statusA);
      const rankB = expiryUrgencyRank(statusB);
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      if (rankA < 2) {
        const dateA = parseLocalDate(a.item.expiry_date);
        const dateB = parseLocalDate(b.item.expiry_date);
        if (dateA && dateB && dateA.getTime() !== dateB.getTime()) {
          return dateA.getTime() - dateB.getTime();
        }
      }
      return a.index - b.index;
    })
    .map(({ item }) => item);
}

function ExpiryNotice({ status }) {
  if (status === "expired") {
    return (
      <span className="ml-1.5 text-xs font-normal text-stone-500">
        Expired
      </span>
    );
  }
  if (status === "expiring_soon") {
    return (
      <span className="ml-1.5 text-xs font-normal text-amber-700/80">
        Expiring soon
      </span>
    );
  }
  return null;
}

function UndoToast({ name, onUndo }) {
  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-lg bg-slate-900 px-4 py-3 text-base text-white shadow-lg sm:left-1/2 sm:right-auto sm:w-auto sm:max-w-[min(28rem,calc(100vw-2rem))] sm:-translate-x-1/2"
    >
      <p className="min-w-0 break-words">Removed {name}</p>
      <button
        type="button"
        onClick={onUndo}
        className="inline-flex h-11 shrink-0 items-center justify-center rounded-md px-3 font-medium underline underline-offset-2 hover:text-slate-200"
      >
        Undo
      </button>
    </div>
  );
}

function QuantityStepper({ quantity, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(quantity));

  function commitDraft() {
    setEditing(false);
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(String(quantity));
      return;
    }
    const next = Math.max(0, parsed);
    setDraft(String(next));
    if (next !== quantity) {
      onChange(next);
    }
  }

  if (editing) {
    return (
      <input
        type="number"
        min="0"
        step="any"
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            setDraft(String(quantity));
            setEditing(false);
          }
        }}
        className="h-11 w-20 rounded border border-slate-300 px-2 text-center text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 md:h-8 md:w-16 md:px-1.5 md:text-sm"
      />
    );
  }

  return (
    <div className="inline-flex items-center gap-2 md:gap-1">
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => onChange(Math.max(0, quantity - 1))}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded border border-slate-300 text-lg text-slate-700 hover:bg-slate-50 md:h-7 md:w-7 md:text-sm"
      >
        −
      </button>
      <button
        type="button"
        aria-label="Edit quantity"
        onClick={() => {
          setDraft(String(quantity));
          setEditing(true);
        }}
        className="inline-flex min-h-11 min-w-[2.75rem] items-center justify-center rounded px-2 py-1 text-center text-base tabular-nums text-slate-800 hover:bg-slate-50 md:min-h-0 md:min-w-[2.5rem] md:px-1 md:py-0.5 md:text-sm"
      >
        {quantity}
      </button>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => onChange(quantity + 1)}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded border border-slate-300 text-lg text-slate-700 hover:bg-slate-50 md:h-7 md:w-7 md:text-sm"
      >
        +
      </button>
    </div>
  );
}

export default function Pantry() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestSlow, setSuggestSlow] = useState(false);
  const [suggestError, setSuggestError] = useState("");
  const [suggestNote, setSuggestNote] = useState("");
  const [savingIndex, setSavingIndex] = useState(null);
  const [savedIndexes, setSavedIndexes] = useState(() => new Set());
  const [saveNotes, setSaveNotes] = useState({});
  // Toast is display-only: which id was most recently zeroed. It never owns
  // delete timers — those live in pendingIngredientRemovals keyed by id.
  const [undoToast, setUndoToast] = useState(null);
  const displayedIngredients = useMemo(
    () => sortIngredientsForDisplay(ingredients),
    [ingredients],
  );

  async function loadIngredients() {
    setError("");
    try {
      const data = await getIngredients();
      const pendingIds = getPendingRemovalIds();
      setIngredients(data.filter((item) => !pendingIds.has(Number(item.id))));
    } catch {
      setError("Failed to load ingredients.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIngredients();
    flushOverduePendingRemovals();
  }, []);

  useEffect(() => {
    if (!suggesting) {
      setSuggestSlow(false);
      return undefined;
    }
    const timerId = setTimeout(() => setSuggestSlow(true), SUGGEST_SLOW_MS);
    return () => clearTimeout(timerId);
  }, [suggesting]);

  // Cosmetic toast dismiss only — must NOT cancel any pending DELETE.
  // When undoToast changes (A → B), React clears A's dismiss timer; B gets
  // a new one. A's delete countdown in the store is untouched.
  useEffect(() => {
    if (!undoToast) {
      return undefined;
    }
    const toastId = undoToast.id;
    const timerId = setTimeout(() => {
      setUndoToast((current) => (current?.id === toastId ? null : current));
    }, UNDO_TOAST_MS);
    return () => clearTimeout(timerId);
  }, [undoToast]);

  useEffect(() => {
    return subscribePendingRemovals((event) => {
      if (event.type === "deleted") {
        setUndoToast((current) =>
          current?.id === event.id ? null : current,
        );
      }
      if (event.type === "delete-failed") {
        setUndoToast((current) =>
          current?.id === event.id ? null : current,
        );
        setIngredients((prev) => {
          if (prev.some((item) => Number(item.id) === Number(event.id))) {
            return prev;
          }
          const next = [...prev];
          const index = Math.min(event.index ?? next.length, next.length);
          next.splice(index, 0, event.item);
          return next;
        });
        setError(event.message || "Failed to delete ingredient.");
      }
    });
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await createIngredient({
        name,
        quantity: Number(quantity),
        unit,
        category: category || null,
        expiry_date: expiryDate || null,
      });
      setName("");
      setQuantity("");
      setUnit("");
      setCategory("");
      setExpiryDate("");
      await loadIngredients();
    } catch {
      setError("Failed to add ingredient.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    setError("");
    cancelPendingRemoval(id);
    if (undoToast?.id === Number(id)) {
      setUndoToast(null);
    }
    try {
      await deleteIngredient(id);
      await loadIngredients();
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to delete ingredient."));
    }
  }

  function handleUndoRemoval(id) {
    // Undo ONLY the toast ingredient — cancel that id's countdown alone.
    const pending = cancelPendingRemoval(id);
    if (!pending) {
      return;
    }
    setUndoToast((current) => (current?.id === Number(id) ? null : current));
    setIngredients((prev) => {
      if (prev.some((item) => Number(item.id) === Number(id))) {
        return prev;
      }
      const next = [...prev];
      const index = Math.min(pending.index, next.length);
      next.splice(index, 0, pending.item);
      return next;
    });
  }

  function scheduleRemovalAfterZero(previous, index) {
    setIngredients((prev) =>
      prev.filter((item) => Number(item.id) !== Number(previous.id)),
    );
    // Replace visible toast only. Does not cancel other ids' countdowns.
    setUndoToast({ id: Number(previous.id), name: previous.name });
    schedulePendingRemoval(previous, {
      index,
      delayMs: UNDO_TOAST_MS,
    });
  }

  async function handleQuantityChange(id, nextQuantity) {
    const clamped = Math.max(0, nextQuantity);
    const index = ingredients.findIndex(
      (item) => Number(item.id) === Number(id),
    );
    const previous = index >= 0 ? ingredients[index] : null;
    if (!previous || previous.quantity === clamped) {
      return;
    }

    setError("");

    if (clamped === 0) {
      scheduleRemovalAfterZero(previous, index);
      return;
    }

    setIngredients((prev) =>
      prev.map((item) =>
        Number(item.id) === Number(id) ? { ...item, quantity: clamped } : item,
      ),
    );

    try {
      await updateIngredient(id, { quantity: clamped });
    } catch {
      setIngredients((prev) =>
        prev.map((item) =>
          Number(item.id) === Number(id)
            ? { ...item, quantity: previous.quantity }
            : item,
        ),
      );
      setError("Failed to update quantity.");
    }
  }

  async function handleSuggest() {
    setSuggestError("");
    setSuggestNote("");
    setSuggestions([]);
    setSaveNotes({});
    setSavedIndexes(new Set());
    if (ingredients.length === 0) {
      setSuggestNote(EMPTY_PANTRY_SUGGEST_MESSAGE);
      return;
    }
    setSuggesting(true);
    try {
      const [data, recipes] = await Promise.all([
        getSuggestions(),
        getRecipes().catch(() => []),
      ]);
      const savedNames = new Set(
        (recipes ?? []).map((recipe) => normalizeName(recipe.name)).filter(Boolean),
      );
      const fresh = (Array.isArray(data) ? data : []).filter(
        (recipe) => !savedNames.has(normalizeName(recipe.name)),
      );
      const dropped = (Array.isArray(data) ? data : []).length - fresh.length;
      setSuggestions(fresh);
      if (fresh.length === 0 && dropped > 0) {
        setSuggestNote(
          "Those ideas match recipes you already saved. Add a couple of ingredients, or try Suggest again for something new.",
        );
      } else if (dropped > 0) {
        setSuggestNote(
          `Hid ${dropped} idea${dropped === 1 ? "" : "s"} you already have under Recipes.`,
        );
      }
    } catch (err) {
      if (isEmptyPantrySuggestError(err)) {
        setSuggestNote(EMPTY_PANTRY_SUGGEST_MESSAGE);
      } else {
        setSuggestError(suggestFailureMessage(err));
      }
    } finally {
      setSuggesting(false);
    }
  }

  async function handleSaveSuggestion(recipe, index) {
    if (savedIndexes.has(index)) {
      return;
    }

    setSavingIndex(index);
    setError("");
    setSaveNotes((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });

    const matched = [];
    const unmatched = [];
    const unitMismatches = [];
    for (const used of recipe.ingredients_used ?? []) {
      const pantryItem = findPantryMatch(ingredients, used.name);
      if (!pantryItem) {
        unmatched.push(used.name?.trim() || used.name);
        continue;
      }
      if (!unitsMatch(used.unit, pantryItem.unit)) {
        unitMismatches.push({
          name: used.name?.trim() || pantryItem.name,
          suggestionUnit: used.unit,
          pantryUnit: pantryItem.unit,
        });
        continue;
      }
      const qty = Number(used.quantity);
      matched.push({
        ingredient_id: pantryItem.id,
        quantity: Number.isFinite(qty) ? qty : 0,
        unit: canonicalUnit(pantryItem.unit) || used.unit,
      });
    }

    if (matched.length === 0) {
      setSaveNotes((prev) => ({
        ...prev,
        [index]: saveNoteFromMatch({
          unmatched,
          unitMismatches,
          saved: false,
        }),
      }));
      setSavingIndex(null);
      return;
    }

    try {
      await createRecipe({
        name: recipe.name,
        description: recipe.description || null,
        instructions: recipe.instructions || null,
        prep_time_minutes: recipe.prep_time_minutes ?? null,
        ingredients: matched,
      });
      setSavedIndexes((prev) => new Set(prev).add(index));
      setSaveNotes((prev) => ({
        ...prev,
        [index]: saveNoteFromMatch({
          unmatched,
          unitMismatches,
          saved: true,
        }),
      }));
    } catch {
      setError("Failed to save recipe.");
    } finally {
      setSavingIndex(null);
    }
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen min-w-0 bg-slate-100">
      <header className="bg-white border-b border-slate-200">
        <div className="mx-auto flex max-w-5xl min-w-0 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-4">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
            <h1 className="text-xl font-semibold text-slate-900">My Pantry</h1>
            <nav className="flex flex-wrap items-center gap-1 text-base sm:gap-2 sm:text-sm">
              <Link
                to="/pantry"
                className="inline-flex min-h-11 items-center px-2 font-medium text-slate-900"
              >
                Pantry
              </Link>
              <Link
                to="/recipes"
                className="inline-flex min-h-11 items-center px-2 text-slate-600 hover:text-slate-900"
              >
                Recipes
              </Link>
              <Link
                to="/meal-plans"
                className="inline-flex min-h-11 items-center px-2 text-slate-600 hover:text-slate-900"
              >
                Meal Plans
              </Link>
            </nav>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
          >
            Logout
          </button>
        </div>
      </header>

      <main className={`mx-auto max-w-5xl min-w-0 space-y-6 px-4 py-6 sm:py-8 ${undoToast ? "pb-28" : ""}`}>
        {!loading && ingredients.length === 0 && (
          <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            {EMPTY_PANTRY_NEXT_STEP}
          </p>
        )}
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <button
            type="button"
            onClick={handleSuggest}
            disabled={suggesting || (!loading && ingredients.length === 0)}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-base font-medium text-white hover:bg-slate-800 disabled:opacity-60 sm:w-auto sm:text-sm"
          >
            {suggesting ? "Suggesting…" : "Suggest recipes"}
          </button>
          {!loading && ingredients.length === 0 && (
            <p className="text-sm text-slate-500 sm:text-right">
              {EMPTY_PANTRY_SUGGEST_MESSAGE}
            </p>
          )}
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="mb-4 text-lg font-medium text-slate-900">
            Add ingredient
          </h2>
          <form
            onSubmit={handleAdd}
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            <input
              type="text"
              required
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-h-11 min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            <input
              type="number"
              required
              min="0"
              step="any"
              placeholder="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="min-h-11 min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            <select
              required
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="min-h-11 min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="">Select unit</option>
              {COMMON_UNITS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="min-h-11 min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="">Select category (optional)</option>
              <option value="Produce">Produce</option>
              <option value="Meat">Meat</option>
              <option value="Dairy">Dairy</option>
              <option value="Grains">Grains</option>
              <option value="Pantry Staples">Pantry Staples</option>
              <option value="Other">Other</option>
            </select>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="min-h-11 min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-900 py-2 text-base font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? "Adding…" : "Add"}
            </button>
          </form>
        </section>

        {error && (
          <p className="break-words rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
            <h2 className="text-lg font-medium text-slate-900">Ingredients</h2>
          </div>

          {loading ? (
            <p className="px-4 py-8 text-sm text-slate-500 sm:px-6">Loading…</p>
          ) : ingredients.length === 0 ? (
            <p className="px-4 py-8 text-sm text-slate-500 sm:px-6">
              Nothing listed yet. Use Add ingredient above, then Suggest recipes.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-slate-100 md:hidden">
                {displayedIngredients.map((item) => {
                  const expiryStatus = getExpiryStatus(item.expiry_date);
                  return (
                    <li
                      key={item.id}
                      className="space-y-3 px-4 py-4 text-slate-800"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 break-words text-base font-medium">
                          {item.name}
                          <ExpiryNotice status={expiryStatus} />
                        </p>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg px-3 font-medium text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <QuantityStepper
                          quantity={item.quantity}
                          onChange={(next) =>
                            handleQuantityChange(item.id, next)
                          }
                        />
                        <span className="text-sm text-slate-600">
                          {item.unit}
                        </span>
                      </div>
                      {Number(item.quantity) === 0 && (
                        <p className="text-sm text-slate-500">
                          Still on a recipe — Cook this left this at 0.
                        </p>
                      )}
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-slate-600">
                        <div className="min-w-0">
                          <dt className="text-slate-500">Category</dt>
                          <dd className="break-words">{item.category ?? "—"}</dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="text-slate-500">Expiry</dt>
                          <dd className="break-words">
                            {item.expiry_date != null && item.expiry_date !== ""
                              ? item.expiry_date
                              : "—"}
                          </dd>
                        </div>
                      </dl>
                    </li>
                  );
                })}
              </ul>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-6 py-3 font-medium">Name</th>
                      <th className="px-6 py-3 font-medium">Quantity</th>
                      <th className="px-6 py-3 font-medium">Unit</th>
                      <th className="px-6 py-3 font-medium">Category</th>
                      <th className="px-6 py-3 font-medium">Expiry</th>
                      <th className="px-6 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedIngredients.map((item) => {
                      const expiryStatus = getExpiryStatus(item.expiry_date);
                      return (
                        <tr key={item.id} className="text-slate-800">
                          <td className="px-6 py-3">{item.name}</td>
                          <td className="px-6 py-3">
                            <QuantityStepper
                              quantity={item.quantity}
                              onChange={(next) =>
                                handleQuantityChange(item.id, next)
                              }
                            />
                            {Number(item.quantity) === 0 && (
                              <p className="mt-1 text-xs text-slate-500">
                                Still on a recipe — Cook this left this at 0.
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-3">{item.unit}</td>
                          <td className="px-6 py-3">{item.category ?? "—"}</td>
                          <td className="px-6 py-3">
                            {item.expiry_date != null && item.expiry_date !== ""
                              ? item.expiry_date
                              : "—"}
                            <ExpiryNotice status={expiryStatus} />
                          </td>
                          <td className="px-6 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              className="inline-flex min-h-8 items-center rounded-lg px-2 py-1 font-medium text-red-600 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {suggestError && !suggesting && (
          <div className="flex flex-col gap-3 rounded-lg border border-red-100 bg-red-50 px-3 py-3 text-sm text-red-600 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <p className="min-w-0 break-words">{suggestError}</p>
            <button
              type="button"
              onClick={handleSuggest}
              className="inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-base font-medium text-white hover:bg-slate-800 sm:w-auto sm:text-sm"
            >
              Try again
            </button>
          </div>
        )}

        {suggestNote && !suggesting && (
          <p className="break-words rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {suggestNote}
          </p>
        )}

        {(suggesting || suggestions.length > 0) && (
          <section className="space-y-4">
            <h2 className="text-lg font-medium text-slate-900">
              Recipe suggestions
            </h2>
            {suggesting ? (
              <p className="break-words rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {suggestSlow ? SUGGEST_WAKING_MESSAGE : SUGGEST_LOADING_MESSAGE}
              </p>
            ) : (
              <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
                {suggestions.map((recipe, index) => {
                  const isSaved = savedIndexes.has(index);
                  const note = saveNotes[index];
                  const noteIsWarning =
                    typeof note === "string" &&
                    (/^nothing matched/i.test(note) ||
                      /couldn't match/i.test(note) ||
                      /skipped /i.test(note));

                  return (
                  <article
                    key={`${recipe.name}-${index}`}
                    className="min-w-0 space-y-3 break-words rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                  >
                    <h3 className="text-lg font-semibold text-slate-900 md:text-base">
                      {recipe.name}
                    </h3>
                    <p className="text-base text-slate-600 md:text-sm">{recipe.description}</p>
                    <p className="text-sm text-slate-500">
                      Prep time: {recipe.prep_time_minutes} min
                    </p>
                    <div>
                      <p className="mb-1 text-sm font-medium text-slate-800">
                        Ingredients used
                      </p>
                      <ul className="list-inside list-disc space-y-1 text-base text-slate-600 md:text-sm">
                        {(recipe.ingredients_used ?? []).map((ing) => (
                          <li key={ing.name} className="break-words">
                            {`${ing.quantity} ${ing.unit} ${ing.name}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {recipe.instructions && (
                      <div className="min-w-0">
                        <p className="mb-1 text-sm font-medium text-slate-800">
                          Instructions
                        </p>
                        <pre className="whitespace-pre-wrap break-words font-sans text-base text-slate-600 md:text-sm">
                          {recipe.instructions}
                        </pre>
                      </div>
                    )}
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                      <button
                        type="button"
                        onClick={() => handleSaveSuggestion(recipe, index)}
                        disabled={savingIndex === index || isSaved}
                        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-base font-medium text-white hover:bg-slate-800 disabled:opacity-60 sm:w-auto sm:text-sm"
                      >
                        {savingIndex === index
                          ? "Saving..."
                          : isSaved
                            ? "Saved"
                            : "Save recipe"}
                      </button>
                      {isSaved && (
                        <Link
                          to="/recipes"
                          className="inline-flex min-h-11 items-center justify-center px-1 text-base font-medium text-slate-700 hover:text-slate-900 sm:text-sm"
                        >
                          View in Recipes
                        </Link>
                      )}
                    </div>
                    {note && (
                      <p
                        className={
                          noteIsWarning
                            ? "break-words rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-700"
                            : "break-words rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                        }
                      >
                        {note}
                      </p>
                    )}
                  </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>

      {undoToast && (
        <UndoToast
          name={undoToast.name}
          onUndo={() => handleUndoRemoval(undoToast.id)}
        />
      )}
    </div>
  );
}
