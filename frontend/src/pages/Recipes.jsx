import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getIngredients } from "../api/ingredients";
import { createRecipe, deleteRecipe, getRecipes } from "../api/recipes";
import { useAuth } from "../context/AuthContext";

const emptyIngredientLine = () => ({
  ingredient_id: "",
  quantity: "",
  unit: "",
});

function RecipeCard({ recipe, ingredientName, onDelete }) {
  const [showInstructions, setShowInstructions] = useState(false);
  const hasInstructions = Boolean(recipe.instructions?.trim());

  return (
    <article className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <h3 className="text-base font-semibold text-slate-900">
            {recipe.name}
          </h3>
          {recipe.description && (
            <p className="text-sm text-slate-600">{recipe.description}</p>
          )}
          <p className="text-sm text-slate-500">
            Prep time:{" "}
            {recipe.prep_time_minutes != null
              ? `${recipe.prep_time_minutes} min`
              : "—"}
          </p>
          <div>
            <p className="text-sm font-medium text-slate-800 mb-1">
              Ingredients
            </p>
            <ul className="list-disc list-inside text-sm text-slate-600 space-y-0.5">
              {(recipe.ingredients ?? []).map((line) => (
                <li key={line.id}>
                  {ingredientName(line.ingredient_id)} — {line.quantity}{" "}
                  {line.unit}
                </li>
              ))}
            </ul>
          </div>
          {hasInstructions && (
            <div>
              <button
                type="button"
                onClick={() => setShowInstructions((open) => !open)}
                className="text-sm font-medium text-slate-700 hover:text-slate-900"
              >
                {showInstructions ? "Hide instructions" : "View instructions"}
              </button>
              {showInstructions && (
                <pre className="mt-2 text-sm text-slate-600 whitespace-pre-wrap font-sans rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                  {recipe.instructions}
                </pre>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDelete(recipe.id)}
          className="text-red-600 hover:text-red-700 font-medium text-sm shrink-0"
        >
          Delete
        </button>
      </div>
    </article>
  );
}

export default function Recipes() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [prepTimeMinutes, setPrepTimeMinutes] = useState("");
  const [ingredientLines, setIngredientLines] = useState([
    emptyIngredientLine(),
  ]);
  const [submitting, setSubmitting] = useState(false);

  const filteredRecipes = recipes.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  async function loadData() {
    setError("");
    try {
      const [recipesData, ingredientsData] = await Promise.all([
        getRecipes(),
        getIngredients(),
      ]);
      setRecipes(recipesData);
      setIngredients(ingredientsData);
    } catch {
      setError("Failed to load recipes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function ingredientName(id) {
    const match = ingredients.find((item) => item.id === id);
    return match?.name ?? `Ingredient #${id}`;
  }

  function updateIngredientLine(index, field, value) {
    setIngredientLines((lines) =>
      lines.map((line, i) =>
        i === index ? { ...line, [field]: value } : line,
      ),
    );
  }

  function addIngredientLine() {
    setIngredientLines((lines) => [...lines, emptyIngredientLine()]);
  }

  function removeIngredientLine(index) {
    setIngredientLines((lines) =>
      lines.length === 1
        ? lines
        : lines.filter((_, i) => i !== index),
    );
  }

  async function handleAdd(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await createRecipe({
        name,
        description: description || null,
        instructions: instructions || null,
        prep_time_minutes: prepTimeMinutes
          ? Number(prepTimeMinutes)
          : null,
        ingredients: ingredientLines.map((line) => ({
          ingredient_id: Number(line.ingredient_id),
          quantity: Number(line.quantity),
          unit: line.unit,
        })),
      });
      setName("");
      setDescription("");
      setInstructions("");
      setPrepTimeMinutes("");
      setIngredientLines([emptyIngredientLine()]);
      await loadData();
    } catch {
      setError("Failed to add recipe.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    setError("");
    try {
      await deleteRecipe(id);
      await loadData();
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      const detailText = typeof detail === "string" ? detail : "";
      const blockedByMealPlan =
        status === 409 ||
        /meal\s*plan|foreign\s*key|integrity/i.test(detailText);

      setError(
        blockedByMealPlan
          ? "Can't delete — this recipe is used in a meal plan. Remove it from the meal plan first."
          : "Failed to delete recipe.",
      );
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
            <h1 className="text-xl font-semibold text-slate-900">Recipes</h1>
            <nav className="flex gap-4 text-sm">
              <Link
                to="/pantry"
                className="text-slate-600 hover:text-slate-900"
              >
                Pantry
              </Link>
              <Link
                to="/recipes"
                className="font-medium text-slate-900"
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
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-medium text-slate-900 mb-4">
            Add recipe
          </h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                min="0"
                placeholder="Prep time (minutes)"
                value={prepTimeMinutes}
                onChange={(e) => setPrepTimeMinutes(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <textarea
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            <textarea
              placeholder="Instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-700">
                Ingredients
              </h3>
              {ingredientLines.map((line, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 sm:grid-cols-4 gap-3"
                >
                  <select
                    required
                    value={line.ingredient_id}
                    onChange={(e) =>
                      updateIngredientLine(
                        index,
                        "ingredient_id",
                        e.target.value,
                      )
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    <option value="">Select ingredient</option>
                    {ingredients.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    placeholder="Quantity"
                    value={line.quantity}
                    onChange={(e) =>
                      updateIngredientLine(index, "quantity", e.target.value)
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Unit"
                    value={line.unit}
                    onChange={(e) =>
                      updateIngredientLine(index, "unit", e.target.value)
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => removeIngredientLine(index)}
                    disabled={ingredientLines.length === 1}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addIngredientLine}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Add another ingredient line
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-slate-900 text-white px-4 py-2 font-medium hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? "Adding…" : "Add recipe"}
            </button>
          </form>
        </section>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-900">Your recipes</h2>

          {!loading && (
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          )}

          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : recipes.length === 0 ? (
            <p className="text-sm text-slate-500">
              No recipes yet. Add one above.
            </p>
          ) : filteredRecipes.length === 0 ? (
            <p className="text-sm text-slate-500">
              No recipes match your search
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  ingredientName={ingredientName}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
