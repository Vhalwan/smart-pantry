# Smart Pantry

Web app for tracking pantry ingredients, generating AI recipe suggestions (Gemini), saving recipes, and planning meals.

**v1 is complete** (August 2026): pantry → suggest → save → cook, with expiry awareness and meal plans. Live app: [smart-pantry-hazel.vercel.app](https://smart-pantry-hazel.vercel.app/login). See the [project plan](docs/project-plan.md) for what shipped and what stayed out of scope.

**v2 (in progress):** [Tonight](docs/v2-plan.md) — one screen for “what should I cook right now?” Nav + Use it up + today’s plan shipped 2 Sep; recipe groups shipped 3 Sep; gaps list (**What’s missing**) shipped 6 Sep.

**Stack:** React (Vite) · FastAPI · PostgreSQL · Docker Compose

## Documentation

| Document | Audience | Contents |
|----------|----------|----------|
| [Requirements](docs/requirements.md) | Product / stakeholders | Functional & non-functional requirements |
| [Architecture & Design](docs/design.md) | Engineers / interview prep | Architecture, data model, AI flow, ingredient-matching tradeoff |
| [Technical](docs/technical.md) | Developers | API reference, layout, env vars, conventions |
| [User Guide](docs/user-guide.md) | End users | Setup and how-to |
| [v2 Plan — Tonight](docs/v2-plan.md) | Product / developers | v2 scope, timeline, requirements |

## Quick start

```bash
# Configure secrets (see docs/technical.md)
cp .env.example .env

# Frontend API URL (localhost for local work — not the Render URL)
cp frontend/.env.example frontend/.env.local

# API + database
docker compose up --build

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

- API: http://localhost:8000 · Swagger: http://localhost:8000/docs  
- Frontend: http://localhost:5173  
- Keep `VITE_API_URL=http://localhost:8000` in `frontend/.env.local`; restart Vite after changing it.

More detail: [User Guide](docs/user-guide.md) · [Technical docs](docs/technical.md).
