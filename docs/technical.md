# Smart Pantry — Technical Documentation

This doc is for people working on the code: layout, API, payloads, and local run. Product intent is in [requirements](./requirements.md). Architecture choices are in [design](./design.md). How to use the live app is in the [user guide](./user-guide.md). Deadlines are in the [project plan](./project-plan.md).

## Project layout

```
backend/
  app/
    routes/          # auth, ingredients, recipes, suggestions, meal_plans
    models/          # SQLAlchemy models
    schemas/         # Pydantic request/response shapes
    auth.py          # password hashing and JWT helpers
    dependencies.py  # get_current_user
    main.py          # app entry, CORS, routers
  alembic/           # database migrations
frontend/
  src/
    pages/           # Pantry, Recipes, MealPlans, Login, Register
    api/             # thin fetch wrappers (+ pendingIngredientRemovals for delayed DELETE)
    context/         # AuthContext
docker-compose.yml   # api + db
```

## API (core)

Auth means a valid bearer token from login.

| Method | Path | Auth | What it does |
|--------|------|------|--------------|
| GET | `/health` | No | Health check |
| POST | `/auth/register` | No | Create account (JSON: email, password) |
| POST | `/auth/login` | No | Return JWT (form: username = email, password) |
| GET | `/ingredients/` | Yes | List pantry (optional skip, limit) |
| POST | `/ingredients/` | Yes | Add ingredient |
| GET | `/ingredients/{id}` | Yes | Get one |
| PUT | `/ingredients/{id}` | Yes | Partial update (`IngredientUpdate`; omit fields to leave them unchanged) |
| DELETE | `/ingredients/{id}` | Yes | Delete |
| GET | `/recipes/suggest` | Yes | AI suggestions for current pantry |
| GET | `/recipes/` | Yes | List recipes |
| POST | `/recipes/` | Yes | Create recipe |
| GET | `/recipes/{id}` | Yes | Get one |
| PUT | `/recipes/{id}` | Yes | Update recipe fields (not ingredient lines) |
| POST | `/recipes/{id}/cook` | Yes | Subtract this recipe’s linked pantry amounts (see below) |
| DELETE | `/recipes/{id}` | Yes | Delete (409 if the recipe is used in a meal plan) |
| GET | `/meal-plans/` | Yes | List meal plans |
| POST | `/meal-plans/` | Yes | Create |
| GET | `/meal-plans/week/{start_date}` | Yes | Week window from start_date |
| GET | `/meal-plans/{id}` | Yes | Get one |
| PUT | `/meal-plans/{id}` | Yes | Update |
| DELETE | `/meal-plans/{id}` | Yes | Delete |

Interactive docs: `http://localhost:8000/docs` when the API is running.

Mount the suggestions router before the recipes router so `/recipes/suggest` is not treated as an id.

## Payload shapes

Suggestion response (`GET /recipes/suggest`):

```json
[
  {
    "name": "string",
    "description": "string",
    "instructions": "string",
    "prep_time_minutes": 0,
    "ingredients_used": [
      { "name": "string", "quantity": "string", "unit": "string" }
    ]
  }
]
```

Create recipe (`POST /recipes/`):

```json
{
  "name": "string",
  "description": "string",
  "instructions": "string",
  "prep_time_minutes": 0,
  "ingredients": [
    { "ingredient_id": 1, "quantity": 2, "unit": "cup" }
  ]
}
```

Suggestions use ingredient names. Creating a recipe expects pantry ingredient ids. Name-to-id matching for save-from-suggestion belongs in the page or a helper, not in the thin `api/*.js` wrappers (case/space plus simple last-word singular/plural; exact match wins). A name match is only linked if units also match after trim/casefold **and aliases** (`cup`/`cups`, `tbsp`/`tablespoon`, … — same measure; `cup` vs `lbs` is still skipped, with a note). Saved lines store the pantry’s canonical unit. The pantry list is also sorted in the page: expired, then expiring soon, then the rest — GET `/ingredients/` order is unchanged. See [design](./design.md). The suggest endpoint also loads the user’s saved recipe names, asks Gemini to avoid them, and drops exact name matches when at least one fresh idea remains. It tags pantry lines that are expired or expiring within `NEAR_EXPIRY_DAYS` (3, calendar days, inclusive of today — same window as the pantry badge) and asks Gemini to prefer those when reasonable; items with no expiry date stay unmarked. The prompt also favors short prep, simple steps, mostly on-hand ingredients, and honesty about gaps; a pantry of 1–2 items gets an extra “keep it simple” note. An empty pantry returns 400 before Gemini is called (`Add a few ingredients to get suggestions.`). The Pantry page does not call Suggest when the list is empty: the button is disabled and the same helper is shown as a note, not a red error. Response JSON shape is unchanged. `getSuggestions()` sets a 90s axios timeout so a hung cold start or Gemini call fails visibly. After ~3s still waiting, the Pantry page swaps “Generating suggestions…” for a waking-up note. Timeout, network, 5xx, and other suggest failures map to plain-language copy (no status codes or API `detail`); empty-pantry 400 still maps to the helper. Try again re-runs the same `handleSuggest` path. No silent retry. Cook and other endpoints are unchanged in shape.

Cook (`POST /recipes/{id}/cook`) is one transaction on the current user’s recipe. It subtracts each `recipe_ingredients` line from the pantry row with that `ingredient_id` (not by name). Unit compare uses `app.units.units_match` (aliases). It clamps at 0 and does not delete. The three lists are mutually exclusive:

```json
{
  "recipe_id": 12,
  "recipe_name": "Fried rice",
  "updated": [
    {
      "ingredient_id": 4,
      "name": "egg",
      "unit": "pcs",
      "needed": 2.0,
      "used": 2.0,
      "previous_quantity": 6.0,
      "quantity": 4.0
    }
  ],
  "short": [
    {
      "ingredient_id": 2,
      "name": "rice",
      "unit": "cup",
      "needed": 2.0,
      "used": 1.0,
      "previous_quantity": 1.0,
      "quantity": 0.0
    }
  ],
  "skipped": [
    {
      "ingredient_id": 9,
      "name": "Ingredient #9",
      "reason": "missing",
      "recipe_unit": "tbsp",
      "pantry_unit": null
    },
    {
      "ingredient_id": 8,
      "name": "soy sauce",
      "reason": "unit_mismatch",
      "recipe_unit": "tbsp",
      "pantry_unit": "ml"
    }
  ]
}
```

`reason` is `missing` or `unit_mismatch`. A recipe with no ingredient lines returns 200 with empty arrays (the Recipes page disables Cook this and does not call the API). Unknown recipe: 404. Cook math stays in the route, not in a loop of frontend PUTs. The Recipes page shows a short card note (same tone as the save skip note) and refetches ingredients. After a response with any `updated` or `short` line, that card’s Cook this stays disabled as Cooked and shows View pantry (`/pantry`) until the page remounts. An all-`skipped` result does not lock the button. Cook does not use `pendingIngredientRemovals`. The Pantry page shows a calm note on rows whose quantity is 0 (cook leftovers; the stepper still removes at 0 instead of leaving a 0 row). Meal Plans reuse the same cook endpoint for rows whose `planned_date` is today (local calendar day); readiness is computed client-side in `cookHelpers.js` with the same alias rules. Future meal-plan rows have no Cook this.

Create meal plan (`POST /meal-plans/`):

```json
{
  "planned_date": "2026-08-06",
  "meal_type": "dinner",
  "recipe_id": 1
}
```

`meal_type` is `breakfast`, `lunch`, or `dinner`.

## Notable errors

| Situation | Status | Detail (typical) |
|-----------|--------|------------------|
| Delete a recipe that still appears in a meal plan | 409 | `Cannot delete recipe: it is referenced by a meal plan` |
| Delete an ingredient still used in a recipe | 409 | `Can't delete {name} — it's used in {recipe names}. Remove it from those recipes first.` |
| Suggest with an empty pantry | 400 | `Add a few ingredients to get suggestions.` |

The Recipes page shows a clearer inline message for the recipe 409. The Pantry page shows the ingredient 409 (and maps the empty-pantry 400 to the same helper text). An empty list also shows a first-use note: add a few ingredients, then Suggest recipes. Suggest failures other than that 400 use a mapped message plus Try again (same primary button as Suggest recipes). Other delete failures keep a generic fallback.

## Conventions

- Route handlers should say what they do, whether auth is required, and how errors look when that is not obvious.
- Pydantic schemas are the source of truth for shapes. Avoid comments that duplicate and drift.
- Frontend `api/*.js` files stay thin. Matching logic and similar behavior live in the page or a dedicated helper. Shared pantry/recipe units live in `frontend/src/units.js` (`COMMON_UNITS`, aliases via `canonicalUnit` / `unitsMatch`); add forms use a required `<select>`, not free text. Older custom units can still appear as an extra option until changed. Backend cook uses the same alias table in `app/units.py`. Pantry quantity edits use `updateIngredient(id, { quantity })` against the partial PUT above. Cook uses `cookRecipe(id)` → `POST /recipes/{id}/cook` (Recipes and today’s Meal Plans). Suggest uses `getSuggestions()` → `GET /recipes/suggest` with a 90s timeout; loading copy, error mapping, and Try again live in `Pantry.jsx`. Cook readiness preview lives in `frontend/src/cookHelpers.js`.
- Quantity → 0 on the **Pantry stepper** does **not** PUT 0. The Pantry page removes the row optimistically and calls `schedulePendingRemoval` in `pendingIngredientRemovals.js`. After ~5s with no Undo, that module calls `DELETE /ingredients/{id}`. Each id has its own timer; the Undo toast is display-only (most recent zeroed item) and never cancels another id’s countdown. Deadlines are kept in `sessionStorage` and rehydrated on app boot / tab focus so navigate-away still deletes. Explicit row Delete stays an immediate `deleteIngredient` with no toast. A 409 (ingredient still used in a recipe) is treated as a permanent failure: no silent retry; emit `delete-failed` so the Pantry page can restore the row and show the API message.
- **Cook this** does PUT remaining quantity, including `0`, and keeps the row. Linked ingredients cannot be deleted (same 409), so cook must not schedule delayed DELETE. No per-ingredient undo toast for cook.
- Pantry-list expiry status is computed only in the Pantry page: parse `YYYY-MM-DD` as a local calendar date, compare to today with UTC day numbers (time-of-day and DST safe), and show Expired / Expiring soon when past or within `NEAR_EXPIRY_DAYS` (3). The suggest route uses the same 3-day idea on the backend (`NEAR_EXPIRY_DAYS` in `suggestions.py`, `date.today()` vs `expiry_date`) to tag prompt lines; there is still no dedicated expiry API field or meal-plan flag.
- Pantry phone layout (Tailwind, `Pantry.jsx` only): below `md`, the ingredients list is stacked cards instead of the 6-column table; suggestion cards stay one column until `md:grid-cols-3`. Main controls on that page (stepper +/−, Delete, Save recipe, Undo, Suggest recipes, Add, Try again) use ~44px tap targets on small screens; the Undo toast is inset from the viewport edges and the page adds bottom padding while it is visible. Same handlers and APIs as desktop. Recipes and Meal Plans did not get a dedicated phone pass (ship week closed 22 Aug; left as-is).

## Running locally

You need Docker, Node.js, and a `.env` at the repo root (see below).

```bash
# API + Postgres
docker compose up --build

# Frontend (second terminal)
cd frontend
npm install
npm run dev
```

| Service | URL |
|---------|-----|
| Backend | http://localhost:8000 |
| Swagger | http://localhost:8000/docs |
| Frontend | http://localhost:5173 |

Copy `frontend/.env.example` to `frontend/.env.local` (or `.env`) and keep `VITE_API_URL=http://localhost:8000` for local work. Restart Vite after changing env files. If this points at your Render URL, local logins will hit production (and fail for accounts that only exist in local Postgres).

## Environment variables

Root `.env.example` covers Compose/API. Frontend uses `frontend/.env.example`.

| Variable | Where | Purpose |
|----------|-------|---------|
| `DATABASE_URL` | API | Postgres URL (host `db` inside Compose) |
| `POSTGRES_USER` | db | Postgres user |
| `POSTGRES_PASSWORD` | db | Postgres password |
| `POSTGRES_DB` | db | Database name |
| `JWT_SECRET_KEY` | API | Sign/verify login tokens |
| `JWT_ALGORITHM` | API | e.g. HS256 |
| `JWT_EXPIRE_MINUTES` | API | Token lifetime in minutes |
| `GEMINI_API_KEY` | API | AI suggestions |
| `VITE_API_URL` | Frontend | API base URL (`http://localhost:8000` locally; Render URL on Vercel) |
| `PORT` | API | Bind port in the container (Compose uses 8000) |

On Render, bind the HTTP server to `0.0.0.0` and the platform `$PORT`. Local disk is ephemeral there; keep real data in Postgres.

## Doc history

- 6 Aug 2026: First technical overview (stack, routes, deploy notes).
- 8 Aug 2026: Documented DELETE `/recipes/{id}` 409 when the recipe is referenced by a meal plan; Notable errors table; env examples for `VITE_API_URL`.
- 9 Aug 2026: Suggest endpoint loads saved recipe names, asks Gemini to avoid them, and drops exact name matches when a fresh idea remains.
- 10 Aug 2026: Noted PUT `/ingredients/{id}` as partial update; frontend `updateIngredient` for quantity stepper.
- 11 Aug 2026: Documented quantity-at-0 delayed DELETE via `pendingIngredientRemovals` (per-id timers, Undo toast, sessionStorage rehydrate); no PUT to 0.
- 12 Aug 2026: Documented client-side near-expiry / expired labels on the Pantry list (`NEAR_EXPIRY_DAYS = 3`, calendar-day compare).
- 13 Aug 2026: Suggest prompt tags expired / expiring-soon items (`NEAR_EXPIRY_DAYS = 3` in `suggestions.py`), bias + rush / thin-pantry wording; empty pantry still 400. No meal-plan expiry flags.
- 14 Aug 2026: Empty-pantry Suggest 400 detail + UI helper (no Gemini call). DELETE `/ingredients/{id}` 409 when the item is still on a recipe; Pantry shows the message; delayed DELETE does not retry a 409.
- 15 Aug 2026: Pantry page sorts expired / expiring-soon for display; save-from-suggestion matching adds last-word singular/plural. No API change.
- 16 Aug 2026: `POST /recipes/{id}/cook` (subtract by id, clamp 0, keep rows, `updated` / `short` / `skipped`). Recipes page Cook this. Save-from-suggestion also requires matching units. Cook does not use delayed DELETE.
- 17 Aug 2026: Recipes UI locks Cook this after a subtract and links to Pantry. Pantry shows a quantity-0 cook leftover note. No API change.
- 18 Aug 2026: Pantry + suggestion-card phone layout (stacked ingredient cards below `md`, larger tap targets, wrapping toast). No API or behavior change. Recipes / Meal Plans layout unchanged.
- 19 Aug 2026: Suggest UI — 90s timeout on `getSuggestions`, delayed waking-up note, mapped errors, Try again (no silent retry). Suggest JSON and Gemini prompt unchanged.
- 21 Aug 2026: Empty-pantry first-use copy on the Pantry page (no API change). Unit add fields are required selects from `frontend/src/units.js` (Pantry + Recipes).
- 22 Aug 2026: Ship week closed; README / plan mark v1 complete. No API change.
- 22 Aug 2026 (later): Unit aliases (`app/units.py` + `frontend/src/units.js`) for cook and save matching. Meal Plans today readiness + Cook this (same cook endpoint). `cookHelpers.js` shared notes/readiness.
