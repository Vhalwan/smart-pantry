import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getIngredients } from "../api/ingredients";
import { createMealPlan, deleteMealPlan, getMealPlans } from "../api/mealPlans";
import { cookRecipe, getRecipes } from "../api/recipes";
import {
  assessCookReadiness,
  cookNoteFromResult,
  localTodayISO,
} from "../cookHelpers";
import { assessLinkedExpiry } from "../expiryHelpers";
import { useAuth } from "../context/AuthContext";

export default function MealPlans() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [mealPlans, setMealPlans] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recipeId, setRecipeId] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [mealType, setMealType] = useState("breakfast");
  const [submitting, setSubmitting] = useState(false);
  const [cookingPlanId, setCookingPlanId] = useState(null);
  const [cookedPlanIds, setCookedPlanIds] = useState(() => new Set());
  const [cookNotes, setCookNotes] = useState({});

  const today = localTodayISO();

  const pantryById = useMemo(() => {
    const map = new Map();
    for (const item of ingredients) {
      map.set(item.id, item);
    }
    return map;
  }, [ingredients]);

  const sortedPlans = useMemo(() => {
    return [...mealPlans].sort((a, b) => {
      const aToday = a.planned_date === today ? 0 : 1;
      const bToday = b.planned_date === today ? 0 : 1;
      if (aToday !== bToday) {
        return aToday - bToday;
      }
      return String(a.planned_date).localeCompare(String(b.planned_date));
    });
  }, [mealPlans, today]);

  async function loadData() {
    setError("");
    try {
      const [mealPlansData, recipesData, ingredientsData] = await Promise.all([
        getMealPlans(),
        getRecipes(),
        getIngredients(),
      ]);
      setMealPlans(mealPlansData);
      setRecipes(recipesData);
      setIngredients(ingredientsData);
    } catch {
      setError("Failed to load meal plans.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await createMealPlan({
        recipe_id: Number(recipeId),
        planned_date: plannedDate,
        meal_type: mealType,
      });
      setRecipeId("");
      setPlannedDate("");
      setMealType("breakfast");
      await loadData();
    } catch {
      setError("Failed to add meal plan.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    setError("");
    try {
      await deleteMealPlan(id);
      await loadData();
    } catch {
      setError("Failed to delete meal plan.");
    }
  }

  async function handleCook(plan) {
    const recipe = plan.recipe;
    if (!recipe?.id) {
      return;
    }
    setCookingPlanId(plan.id);
    setError("");
    setCookNotes((prev) => {
      const next = { ...prev };
      delete next[plan.id];
      return next;
    });
    try {
      const result = await cookRecipe(recipe.id);
      const note = cookNoteFromResult(result);
      setCookNotes((prev) => ({
        ...prev,
        [plan.id]: note,
      }));
      if (note.subtracted) {
        setCookedPlanIds((prev) => new Set(prev).add(plan.id));
      }
      const ingredientsData = await getIngredients();
      setIngredients(ingredientsData);
    } catch {
      setCookNotes((prev) => ({
        ...prev,
        [plan.id]: {
          text: "Couldn't update the pantry. Try again.",
          warning: true,
          subtracted: false,
        },
      }));
    } finally {
      setCookingPlanId(null);
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
            <h1 className="text-xl font-semibold text-slate-900">Meal Plans</h1>
            <nav className="flex gap-4 text-sm">
              <Link
                to="/pantry"
                className="text-slate-600 hover:text-slate-900"
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
                className="font-medium text-slate-900"
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
            Add meal plan
          </h2>
          <form
            onSubmit={handleAdd}
            className="grid grid-cols-1 sm:grid-cols-4 gap-3"
          >
            <select
              required
              value={recipeId}
              onChange={(e) => setRecipeId(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="">Select recipe</option>
              {recipes.map((recipe) => (
                <option key={recipe.id} value={recipe.id}>
                  {recipe.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              required
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            <select
              required
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
            </select>
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
            <h2 className="text-lg font-medium text-slate-900">Meal plans</h2>
            <p className="mt-1 text-sm text-slate-500">
              Each plan shows pantry readiness and expiry flags on linked
              ingredients. Cook this is only for today.
            </p>
          </div>

          {loading ? (
            <p className="px-6 py-8 text-slate-500 text-sm">Loading…</p>
          ) : sortedPlans.length === 0 ? (
            <p className="px-6 py-8 text-slate-500 text-sm">
              No meal plans yet. Add one above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Meal</th>
                    <th className="px-6 py-3 font-medium">Recipe</th>
                    <th className="px-6 py-3 font-medium">Check</th>
                    <th className="px-6 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedPlans.map((plan) => {
                    const isToday = plan.planned_date === today;
                    const readiness = assessCookReadiness(
                      plan.recipe,
                      pantryById,
                    );
                    const expiry = assessLinkedExpiry(plan.recipe, pantryById);
                    const cooked = cookedPlanIds.has(plan.id);
                    const cookNote = cookNotes[plan.id];
                    const cooking = cookingPlanId === plan.id;

                    return (
                      <tr key={plan.id} className="text-slate-800 align-top">
                        <td className="px-6 py-3 whitespace-nowrap">
                          {plan.planned_date}
                          {isToday && (
                            <span className="ml-2 text-xs font-medium text-slate-500">
                              Today
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 capitalize">{plan.meal_type}</td>
                        <td className="px-6 py-3">
                          {plan.recipe?.name ?? "—"}
                        </td>
                        <td className="px-6 py-3 min-w-[12rem]">
                          <div className="space-y-2">
                            <p
                              className={
                                readiness.status === "ready"
                                  ? "text-slate-700"
                                  : "text-amber-800"
                              }
                            >
                              {readiness.label}
                            </p>
                            {expiry.expired.length > 0 && (
                              <p className="text-sm text-stone-500">
                                Expired: {expiry.expired.join(", ")}
                              </p>
                            )}
                            {expiry.expiringSoon.length > 0 && (
                              <p className="text-sm text-amber-700/80">
                                Expiring soon: {expiry.expiringSoon.join(", ")}
                              </p>
                            )}
                            {isToday && (
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  disabled={
                                    cooking ||
                                    cooked ||
                                    readiness.status === "empty"
                                  }
                                  onClick={() => handleCook(plan)}
                                  className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 min-h-11"
                                >
                                  {cooking
                                    ? "Cooking…"
                                    : cooked
                                      ? "Cooked"
                                      : "Cook this"}
                                </button>
                                {cooked && (
                                  <Link
                                    to="/pantry"
                                    className="text-sm font-medium text-slate-700 hover:text-slate-900"
                                  >
                                    View pantry
                                  </Link>
                                )}
                              </div>
                            )}
                            {cookNote && (
                              <p
                                className={
                                  cookNote.warning
                                    ? "text-sm text-amber-800"
                                    : "text-sm text-slate-600"
                                }
                              >
                                {cookNote.text}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleDelete(plan.id)}
                            className="text-red-600 hover:text-red-700 font-medium min-h-11 px-2"
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
          )}
        </section>
      </main>
    </div>
  );
}
