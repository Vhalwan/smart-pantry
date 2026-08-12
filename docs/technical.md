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

Suggestions use ingredient names. Creating a recipe expects pantry ingredient ids. Name-to-id matching for save-from-suggestion belongs in the page or a helper, not in the thin `api/*.js` wrappers. See [design](./design.md). The suggest endpoint also loads the user’s saved recipe names, asks Gemini to avoid them, and drops exact name matches when at least one fresh idea remains.

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

The Recipes page shows a clearer inline message for that 409. Other delete failures keep a generic fallback.

## Conventions

- Route handlers should say what they do, whether auth is required, and how errors look when that is not obvious.
- Pydantic schemas are the source of truth for shapes. Avoid comments that duplicate and drift.
- Frontend `api/*.js` files stay thin. Matching logic and similar behavior live in the page or a dedicated helper. Pantry quantity edits use `updateIngredient(id, { quantity })` against the partial PUT above.
- Quantity → 0 does **not** PUT 0. The Pantry page removes the row optimistically and calls `schedulePendingRemoval` in `pendingIngredientRemovals.js`. After ~5s with no Undo, that module calls `DELETE /ingredients/{id}`. Each id has its own timer; the Undo toast is display-only (most recent zeroed item) and never cancels another id’s countdown. Deadlines are kept in `sessionStorage` and rehydrated on app boot / tab focus so navigate-away still deletes. Explicit row Delete stays an immediate `deleteIngredient` with no toast.
- Expiry status is computed only in the Pantry page: parse `YYYY-MM-DD` as a local calendar date, compare to today with UTC day numbers (time-of-day and DST safe), and show Expired / Expiring soon when past or within `NEAR_EXPIRY_DAYS` (3). No backend field or endpoint for this.

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
