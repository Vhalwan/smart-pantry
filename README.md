# Smart Pantry

Web app for tracking pantry ingredients, generating AI recipe suggestions (Gemini), saving recipes, and planning meals.

**Stack:** React (Vite) · FastAPI · PostgreSQL · Docker Compose

## Documentation

| Document | Audience | Contents |
|----------|----------|----------|
| [Requirements](docs/requirements.md) | Product / stakeholders | Functional & non-functional requirements |
| [Architecture & Design](docs/design.md) | Engineers / interview prep | Architecture, data model, AI flow, ingredient-matching tradeoff |
| [Technical](docs/technical.md) | Developers | API reference, layout, env vars, conventions |
| [User Guide](docs/user-guide.md) | End users | Setup and how-to |

## Quick start

```bash
# Configure secrets (see docs/technical.md §6)
cp .env.example .env

# API + database
docker compose up --build

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

- API: http://localhost:8000 · Swagger: http://localhost:8000/docs  
- Frontend: http://localhost:5173  

More detail: [User Guide](docs/user-guide.md) · [Technical docs](docs/technical.md).
