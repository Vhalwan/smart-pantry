import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { getIngredients } from "../api/ingredients";
import { getMealPlans } from "../api/mealPlans";
import { cookRecipe, getRecipes } from "../api/recipes";
import {
  assessCookReadiness,
  collectRecipeGaps,
  cookNoteFromResult,
  localTodayISO,
} from "../cookHelpers";
import {
  assessLinkedExpiry,
  getExpiryStatus,
  parseLocalDate,
} from "../expiryHelpers";
import { useAuth } from "../context/AuthContext";

const MEAL_ORDER = { breakfast: 0, lunch: 1, dinner: 2 };

function formatTodayLabel(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function expiryUrgencyRank(status) {
  if (status === "expired") return 0;
  if (status === "expiring_soon") return 1;
  return 2;
}

function ExpiryNotice({ status }) {
  if (status === "expired") {
    return <span className="badge-expired">Expired</span>;
  }
  if (status === "expiring_soon") {
    return <span className="badge-expiring">Expiring soon</span>;
  }
  return null;
}

function RecipeGroupSection({
  title,
  subtitle,
  entries,
  cookingId,
  cookedIds,
  cookNotes,
  onCook,
  pantryById,
}) {
  if (entries.length === 0) return null;

  return (
    <section className="card overflow-hidden">
      <div className="card-section-header">
        <h2 className="text-lg font-medium text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      <ul className="divide-y divide-slate-100">
        {entries.map(({ recipe, readiness }) => {
          const expiry = assessLinkedExpiry(recipe, pantryById);
          const cooked = cookedIds.has(recipe.id);
          const cooking = cookingId === recipe.id;
          const note = cookNotes[recipe.id];
          const hasLines = (recipe.ingredients ?? []).length > 0;

          return (
            <li
              key={recipe.id}
              className="space-y-3 px-4 py-4 text-slate-800 sm:px-6"
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <p className="text-base font-semibold text-slate-900">
                  {recipe.name}
                </p>
                {recipe.prep_time_minutes != null && (
                  <p className="text-sm text-slate-500">
                    {recipe.prep_time_minutes} min
                  </p>
                )}
              </div>
              {readiness.status !== "ready" && (
                <p className="text-sm text-amber-800">{readiness.label}</p>
              )}
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
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={cooking || cooked || !hasLines}
                  onClick={() => onCook(recipe)}
                  className="btn-primary"
                >
                  {cooking ? "Cooking…" : cooked ? "Cooked" : "Cook this"}
                </button>
                {cooked && (
                  <Link
                    to="/pantry"
                    className="inline-flex min-h-11 items-center text-sm font-medium text-slate-700 hover:text-slate-900"
                  >
                    View pantry
                  </Link>
                )}
              </div>
              {note && (
                <p
                  className={
                    note.warning
                      ? "text-sm text-amber-800"
                      : "text-sm text-slate-600"
                  }
                >
                  {note.text}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

async function fetchTonightData() {
  const [ingredientsData, recipesData, mealPlansData] = await Promise.all([
    getIngredients(),
    getRecipes(),
    getMealPlans(),
  ]);
  return { ingredientsData, recipesData, mealPlansData };
}

export default function Tonight() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [ingredients, setIngredients] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [mealPlans, setMealPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cookingPlanId, setCookingPlanId] = useState(null);
  const [cookedPlanIds, setCookedPlanIds] = useState(() => new Set());
  const [cookNotes, setCookNotes] = useState({});
  const [cookingRecipeId, setCookingRecipeId] = useState(null);
  const [cookedRecipeIds, setCookedRecipeIds] = useState(() => new Set());
  const [recipeCookNotes, setRecipeCookNotes] = useState({});

  const today = localTodayISO();

  const pantryById = useMemo(() => {
    const map = new Map();
    for (const item of ingredients) {
      map.set(item.id, item);
    }
    return map;
  }, [ingredients]);

  const useItUpItems = useMemo(() => {
    return ingredients
      .map((item, index) => ({
        item,
        index,
        status: getExpiryStatus(item.expiry_date),
      }))
      .filter(
        ({ status }) => status === "expired" || status === "expiring_soon",
      )
      .sort((a, b) => {
        const rankA = expiryUrgencyRank(a.status);
        const rankB = expiryUrgencyRank(b.status);
        if (rankA !== rankB) {
          return rankA - rankB;
        }
        const dateA = parseLocalDate(a.item.expiry_date);
        const dateB = parseLocalDate(b.item.expiry_date);
        if (dateA && dateB && dateA.getTime() !== dateB.getTime()) {
          return dateA.getTime() - dateB.getTime();
        }
        return a.index - b.index;
      })
      .map(({ item, status }) => ({ ...item, expiryStatus: status }));
  }, [ingredients]);

  const todayPlans = useMemo(() => {
    return mealPlans
      .filter((plan) => plan.planned_date === today)
      .sort((a, b) => {
        const aOrder = MEAL_ORDER[a.meal_type] ?? 9;
        const bOrder = MEAL_ORDER[b.meal_type] ?? 9;
        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }
        return String(a.recipe?.name ?? "").localeCompare(
          String(b.recipe?.name ?? ""),
        );
      });
  }, [mealPlans, today]);

  async function loadData() {
    setError("");
    setLoading(true);
    try {
      const { ingredientsData, recipesData, mealPlansData } =
        await fetchTonightData();
      setIngredients(ingredientsData);
      setRecipes(recipesData);
      setMealPlans(mealPlansData);
    } catch {
      setError("Couldn't load tonight's view. Try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadOnMount() {
      try {
        const { ingredientsData, recipesData, mealPlansData } =
          await fetchTonightData();
        if (cancelled) {
          return;
        }
        setIngredients(ingredientsData);
        setRecipes(recipesData);
        setMealPlans(mealPlansData);
      } catch {
        if (!cancelled) {
          setError("Couldn't load tonight's view. Try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadOnMount();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const recipeGroups = useMemo(() => {
    const ready = [];
    const short = [];
    const blocked = [];
    for (const recipe of recipes) {
      const r = assessCookReadiness(recipe, pantryById);
      const entry = { recipe, readiness: r };
      if (r.status === "ready") ready.push(entry);
      else if (r.status === "short") short.push(entry);
      else blocked.push(entry);
    }
    ready.sort((a, b) => {
      const aTime = a.recipe.prep_time_minutes ?? Infinity;
      const bTime = b.recipe.prep_time_minutes ?? Infinity;
      if (aTime !== bTime) return aTime - bTime;
      return (a.recipe.name ?? "").localeCompare(b.recipe.name ?? "");
    });
    short.sort((a, b) => (a.recipe.name ?? "").localeCompare(b.recipe.name ?? ""));
    blocked.sort((a, b) => (a.recipe.name ?? "").localeCompare(b.recipe.name ?? ""));
    return { ready, short, blocked };
  }, [recipes, pantryById]);

  const gaps = useMemo(() => {
    const gapRecipes = [
      ...recipeGroups.short.map(({ recipe }) => recipe),
      ...recipeGroups.blocked.map(({ recipe }) => recipe),
    ];
    return collectRecipeGaps(gapRecipes, pantryById);
  }, [recipeGroups, pantryById]);

  async function handleCookRecipe(recipe) {
    if (!(recipe.ingredients ?? []).length) return;
    setCookingRecipeId(recipe.id);
    setError("");
    setRecipeCookNotes((prev) => {
      const next = { ...prev };
      delete next[recipe.id];
      return next;
    });
    try {
      const result = await cookRecipe(recipe.id);
      const note = cookNoteFromResult(result);
      setRecipeCookNotes((prev) => ({ ...prev, [recipe.id]: note }));
      if (note.subtracted) {
        setCookedRecipeIds((prev) => new Set(prev).add(recipe.id));
      }
      const ingredientsData = await getIngredients();
      setIngredients(ingredientsData);
    } catch {
      setRecipeCookNotes((prev) => ({
        ...prev,
        [recipe.id]: {
          text: "Couldn't update the pantry. Try again.",
          warning: true,
          subtracted: false,
        },
      }));
    } finally {
      setCookingRecipeId(null);
    }
  }

  const nothingReady = recipeGroups.ready.length === 0 && recipeGroups.short.length === 0;

  const pantryEmpty = !loading && ingredients.length === 0;
  const hasRecipes = recipes.length > 0;

  return (
    <AppLayout title="Tonight" currentPath="/tonight" onLogout={handleLogout}>
      <p className="text-sm text-slate-600">
        {formatTodayLabel(today)} — what you can cook right now.
      </p>

      {error && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="alert-error">{error}</p>
          <button type="button" onClick={loadData} className="btn-secondary">
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading tonight's view…</p>
      ) : (
        <>
          {pantryEmpty && (
            <p className="alert-info">
              Your pantry is empty.{" "}
              <Link
                to="/pantry"
                className="font-medium text-emerald-800 underline"
              >
                Add a few ingredients
              </Link>
              , then Suggest recipes for ideas from what you have.
            </p>
          )}

          <section className="card overflow-hidden">
            <div className="card-section-header">
              <h2 className="text-lg font-medium text-slate-900">Use it up</h2>
              <p className="mt-1 text-sm text-slate-500">
                Expired or expiring within the next three days.
              </p>
            </div>
            {useItUpItems.length === 0 ? (
              <p className="px-4 py-5 text-sm text-slate-500 sm:px-6">
                Nothing expiring soon.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2 px-4 py-4 sm:px-6">
                {useItUpItems.map((item) => (
                  <li
                    key={item.id}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                  >
                    <span className="min-w-0 break-words font-medium">
                      {item.name}
                    </span>
                    <span className="text-slate-500">
                      {item.quantity} {item.unit}
                    </span>
                    <ExpiryNotice status={item.expiryStatus} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card overflow-hidden">
            <div className="card-section-header">
              <h2 className="text-lg font-medium text-slate-900">
                Today’s plan
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Meals you planned for today. Cook this updates the pantry the
                same way as on Meal Plans.
              </p>
            </div>
            {todayPlans.length === 0 ? (
              <p className="px-4 py-5 text-sm text-slate-500 sm:px-6">
                No meals planned for today.{" "}
                <Link
                  to="/meal-plans"
                  className="font-medium text-emerald-800 underline"
                >
                  Open Meal Plans
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {todayPlans.map((plan) => {
                  const readiness = assessCookReadiness(
                    plan.recipe,
                    pantryById,
                  );
                  const expiry = assessLinkedExpiry(plan.recipe, pantryById);
                  const cooked = cookedPlanIds.has(plan.id);
                  const cookNote = cookNotes[plan.id];
                  const cooking = cookingPlanId === plan.id;

                  return (
                    <li
                      key={plan.id}
                      className="space-y-3 px-4 py-4 text-slate-800 sm:px-6"
                    >
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <p className="text-base font-semibold text-slate-900">
                          {plan.recipe?.name ?? "—"}
                        </p>
                        <p className="capitalize text-sm text-slate-500">
                          {plan.meal_type}
                        </p>
                      </div>
                      <p
                        className={
                          readiness.status === "ready"
                            ? "text-sm text-slate-700"
                            : "text-sm text-amber-800"
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
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={
                            cooking || cooked || readiness.status === "empty"
                          }
                          onClick={() => handleCook(plan)}
                          className="btn-primary"
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
                            className="inline-flex min-h-11 items-center text-sm font-medium text-slate-700 hover:text-slate-900"
                          >
                            View pantry
                          </Link>
                        )}
                      </div>
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
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {hasRecipes && (
            <>
              <RecipeGroupSection
                title="Ready to cook"
                subtitle="Everything you need is in the pantry."
                entries={recipeGroups.ready}
                cookingId={cookingRecipeId}
                cookedIds={cookedRecipeIds}
                cookNotes={recipeCookNotes}
                onCook={handleCookRecipe}
                pantryById={pantryById}
              />
              <RecipeGroupSection
                title="Almost ready"
                subtitle="You can cook these but you'll run short on something."
                entries={recipeGroups.short}
                cookingId={cookingRecipeId}
                cookedIds={cookedRecipeIds}
                cookNotes={recipeCookNotes}
                onCook={handleCookRecipe}
                pantryById={pantryById}
              />
              <RecipeGroupSection
                title="Need attention"
                subtitle="Missing ingredients or unit mismatches."
                entries={recipeGroups.blocked}
                cookingId={cookingRecipeId}
                cookedIds={cookedRecipeIds}
                cookNotes={recipeCookNotes}
                onCook={handleCookRecipe}
                pantryById={pantryById}
              />
            </>
          )}

          {gaps.length > 0 && (
            <section className="card overflow-hidden">
              <div className="card-section-header">
                <h2 className="text-lg font-medium text-slate-900">
                  What’s missing
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  What would unblock recipes that are short or blocked. Add
                  these on{" "}
                  <Link
                    to="/pantry"
                    className="font-medium text-emerald-800 underline"
                  >
                    Pantry
                  </Link>{" "}
                  if you want to cook them tonight.
                </p>
              </div>
              <ul className="divide-y divide-slate-100">
                {gaps.map((gap) => (
                  <li
                    key={gap.text}
                    className="px-4 py-3 text-sm text-slate-800 sm:px-6"
                  >
                    {gap.text}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!pantryEmpty && !hasRecipes && (
            <p className="alert-info">
              No saved recipes yet.{" "}
              <Link
                to="/pantry"
                className="font-medium text-emerald-800 underline"
              >
                Get ideas on Pantry
              </Link>{" "}
              with Suggest recipes.
            </p>
          )}

          {hasRecipes && nothingReady && (
            <p className="alert-info">
              Nothing is ready to cook right now.{" "}
              <Link
                to="/pantry"
                className="font-medium text-emerald-800 underline"
              >
                Check your pantry
              </Link>{" "}
              and use Suggest recipes for ideas from what you have.
            </p>
          )}
        </>
      )}
    </AppLayout>
  );
}
