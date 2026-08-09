import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createIngredient,
  deleteIngredient,
  getIngredients,
} from "../api/ingredients";
import { createRecipe, getRecipes } from "../api/recipes";
import { getSuggestions } from "../api/suggestions";
import { useAuth } from "../context/AuthContext";

function normalizeName(value) {
  return (value ?? "").trim().toLowerCase();
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
  const [submitting, setSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState("");
  const [suggestNote, setSuggestNote] = useState("");
  const [savingIndex, setSavingIndex] = useState(null);
  const [savedIndexes, setSavedIndexes] = useState(() => new Set());
  const [saveNotes, setSaveNotes] = useState({});

  async function loadIngredients() {
    setError("");
    try {
      const data = await getIngredients();
      setIngredients(data);
    } catch {
      setError("Failed to load ingredients.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIngredients();
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
      });
      setName("");
      setQuantity("");
      setUnit("");
      await loadIngredients();
    } catch {
      setError("Failed to add ingredient.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    setError("");
    try {
      await deleteIngredient(id);
      await loadIngredients();
    } catch {
      setError("Failed to delete ingredient.");
    }
  }

  async function handleSuggest() {
    setSuggesting(true);
    setSuggestError("");
    setSuggestNote("");
    setSuggestions([]);
    setSaveNotes({});
    setSavedIndexes(new Set());
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
      const detail = err.response?.data?.detail;
      setSuggestError(
        typeof detail === "string" ? detail : "Failed to get recipe suggestions."
      );
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
    for (const used of recipe.ingredients_used ?? []) {
      const usedName = normalizeName(used.name);
      const pantryItem = ingredients.find(
        (item) => normalizeName(item.name) === usedName,
      );
      if (pantryItem) {
        const qty = Number(used.quantity);
        matched.push({
          ingredient_id: pantryItem.id,
          quantity: Number.isFinite(qty) ? qty : 0,
          unit: used.unit,
        });
      } else {
        unmatched.push(used.name?.trim() || used.name);
      }
    }

    if (matched.length === 0) {
      setSaveNotes((prev) => ({
        ...prev,
        [index]:
          unmatched.length > 0
            ? `Nothing matched your pantry, so this wasn't saved. Skipped: ${unmatched.join(", ")}`
            : "Nothing matched your pantry, so this wasn't saved.",
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
      if (unmatched.length > 0) {
        setSaveNotes((prev) => ({
          ...prev,
          [index]: `Saved, but couldn't match: ${unmatched.join(", ")}`,
        }));
      } else {
        setSaveNotes((prev) => ({
          ...prev,
          [index]: "Saved to Recipes.",
        }));
      }
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
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-semibold text-slate-900">My Pantry</h1>
            <nav className="flex gap-4 text-sm">
              <Link
                to="/pantry"
                className="font-medium text-slate-900"
              >
                Pantry
              </Link>
              <Link
                to="/recipes"
                className="text-slate-600 hover:text-slate-900"
              >
                Recipes
              </Link>
              <Link
                to="/meal-plans"
                className="text-slate-600 hover:text-slate-900"
              >
                Meal Plans
              </Link>
            </nav>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSuggest}
            disabled={suggesting}
            className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-60"
          >
            {suggesting ? "Suggesting…" : "Suggest recipes"}
          </button>
        </div>

        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-medium text-slate-900 mb-4">
            Add ingredient
          </h2>
          <form
            onSubmit={handleAdd}
            className="grid grid-cols-1 sm:grid-cols-4 gap-3"
          >
            <input
              type="text"
              required
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            <input
              type="number"
              required
              min="0"
              step="any"
              placeholder="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            <input
              type="text"
              required
              placeholder="Unit (g, ml, pcs)"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-slate-900 text-white py-2 font-medium hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? "Adding…" : "Add"}
            </button>
          </form>
        </section>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-medium text-slate-900">Ingredients</h2>
          </div>

          {loading ? (
            <p className="px-6 py-8 text-slate-500 text-sm">Loading…</p>
          ) : ingredients.length === 0 ? (
            <p className="px-6 py-8 text-slate-500 text-sm">
              No ingredients yet. Add one above.
            </p>
          ) : (
            <div className="overflow-x-auto">
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
                  {ingredients.map((item) => (
                    <tr key={item.id} className="text-slate-800">
                      <td className="px-6 py-3">{item.name}</td>
                      <td className="px-6 py-3">{item.quantity}</td>
                      <td className="px-6 py-3">{item.unit}</td>
                      <td className="px-6 py-3">{item.category ?? "—"}</td>
                      <td className="px-6 py-3">{item.expiry_date ?? "—"}</td>
                      <td className="px-6 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-700 font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {suggestError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {suggestError}
          </p>
        )}

        {suggestNote && !suggesting && (
          <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            {suggestNote}
          </p>
        )}

        {(suggesting || suggestions.length > 0) && (
          <section className="space-y-4">
            <h2 className="text-lg font-medium text-slate-900">
              Recipe suggestions
            </h2>
            {suggesting ? (
              <p className="text-sm text-slate-500">Generating suggestions…</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {suggestions.map((recipe, index) => {
                  const isSaved = savedIndexes.has(index);
                  const note = saveNotes[index];
                  const noteIsWarning =
                    typeof note === "string" &&
                    (note.startsWith("Nothing matched") ||
                      note.includes("couldn't match"));

                  return (
                  <article
                    key={`${recipe.name}-${index}`}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3"
                  >
                    <h3 className="text-base font-semibold text-slate-900">
                      {recipe.name}
                    </h3>
                    <p className="text-sm text-slate-600">{recipe.description}</p>
                    <p className="text-sm text-slate-500">
                      Prep time: {recipe.prep_time_minutes} min
                    </p>
                    <div>
                      <p className="text-sm font-medium text-slate-800 mb-1">
                        Ingredients used
                      </p>
                      <ul className="list-disc list-inside text-sm text-slate-600 space-y-0.5">
                        {(recipe.ingredients_used ?? []).map((ing) => (
                          <li key={ing.name}>
                            {`${ing.quantity} ${ing.unit} ${ing.name}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {recipe.instructions && (
                      <div>
                        <p className="text-sm font-medium text-slate-800 mb-1">
                          Instructions
                        </p>
                        <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans">
                          {recipe.instructions}
                        </pre>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleSaveSuggestion(recipe, index)}
                        disabled={savingIndex === index || isSaved}
                        className="rounded-lg bg-slate-900 text-white px-3 py-1.5 text-sm font-medium hover:bg-slate-800 disabled:opacity-60"
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
                          className="text-sm font-medium text-slate-700 hover:text-slate-900"
                        >
                          View in Recipes
                        </Link>
                      )}
                    </div>
                    {note && (
                      <p
                        className={
                          noteIsWarning
                            ? "text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2"
                            : "text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
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
    </div>
  );
}
