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
    api/             # thin fetch wrappers
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
| PUT | `/ingredients/{id}` | Yes | Update |
| DELETE | `/ingredients/{id}` | Yes | Delete |
| GET | `/recipes/suggest` | Yes | AI suggestions for current pantry |
| GET | `/recipes/` | Yes | List recipes |
| POST | `/recipes/` | Yes | Create recipe |
| GET | `/recipes/{id}` | Yes | Get one |
| PUT | `/recipes/{id}` | Yes | Update recipe fields (not ingredient lines) |
| DELETE | `/recipes/{id}` | Yes | Delete |
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

Suggestions use ingredient names. Creating a recipe expects pantry ingredient ids. Name-to-id matching for save-from-suggestion belongs in the page or a helper, not in the thin `api/*.js` wrappers. See [design](./design.md).

Create meal plan (`POST /meal-plans/`):

```json
{
  "planned_date": "2026-08-06",
  "meal_type": "dinner",
  "recipe_id": 1
}
```

`meal_type` is `breakfast`, `lunch`, or `dinner`.

## Conventions

- Route handlers should say what they do, whether auth is required, and how errors look when that is not obvious.
- Pydantic schemas are the source of truth for shapes. Avoid comments that duplicate and drift.
- Frontend `api/*.js` files stay thin. Matching logic and similar behavior live in the page or a dedicated helper.

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

Set `VITE_API_URL` if the frontend should not use `http://localhost:8000`.

## Environment variables

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
| `VITE_API_URL` | Frontend | Optional API base URL |
| `PORT` | API | Bind port in the container (Compose uses 8000) |

On Render, bind the HTTP server to `0.0.0.0` and the platform `$PORT`. Local disk is ephemeral there; keep real data in Postgres.
