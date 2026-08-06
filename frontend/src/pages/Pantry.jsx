import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createIngredient,
  deleteIngredient,
  getIngredients,
} from "../api/ingredients";
import { getSuggestions } from "../api/suggestions";
import { useAuth } from "../context/AuthContext";

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
    setSuggestions([]);
    try {
      const data = await getSuggestions();
      setSuggestions(data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setSuggestError(
        typeof detail === "string" ? detail : "Failed to get recipe suggestions."
      );
    } finally {
      setSuggesting(false);
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

        {(suggesting || suggestions.length > 0) && (
          <section className="space-y-4">
            <h2 className="text-lg font-medium text-slate-900">
              Recipe suggestions
            </h2>
            {suggesting ? (
              <p className="text-sm text-slate-500">Generating suggestions…</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {suggestions.map((recipe, index) => (
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
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
