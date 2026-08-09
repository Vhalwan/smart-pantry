# Smart Pantry — Design

## Overview

Smart Pantry has three main pieces: a React website (built with Vite), a FastAPI backend, and a PostgreSQL database. The API and database run together with Docker Compose. The website can run locally or be hosted on its own (for example on Vercel). Recipe ideas come from Google’s Gemini model, called by the backend.

```
  Website (React)  -- login token + HTTP --  API (FastAPI + Gemini)
                                                   |
                                              Database (PostgreSQL)
```

If you only need “what should the product do?”, see [requirements](./requirements.md). If you need endpoints and local setup, see [technical](./technical.md). Schedule lives in the [project plan](./project-plan.md).

## Why these tools

FastAPI gives a clear HTTP API and typed request/response models. PostgreSQL fits the related data (users, pantry items, recipes, meal plans). React and Vite are a straightforward way to build the screens. Docker Compose keeps the API and database easy to recreate. Gemini turns a pantry list into recipe text in a structured form we can parse.

## Data (plain picture)

Each user owns:

- Ingredients: name, quantity, unit, and optional category and expiry date
- Recipes: name, description, instructions, prep time, plus links to pantry ingredients with amounts
- Meal plans: a date, meal type (breakfast, lunch, or dinner), and a saved recipe

Recipes do not store ingredients as loose free text alone. They link back to pantry items so amounts stay structured and stay tied to what the user actually tracks.

Meal plans point at saved recipes. Deleting a recipe that is still on a meal plan is rejected until that plan entry is removed (the API returns a conflict; the Recipes page explains what to do).

If a user account is deleted, their pantry, recipes, and meal plans go with it.

## Login flow (short version)

1. Register with email and password. The password is stored hashed, not as plain text.
2. Log in. The server checks the password and returns a token.
3. The website keeps that token and sends it on later requests.
4. The API checks the token and only returns that user’s data.

## How suggestions work

1. The website asks the API for suggestions.
2. The API loads the user’s current pantry. If it is empty, it refuses the request.
3. The API asks Gemini for a small set of recipes in a fixed JSON shape (name, description, instructions, prep time, ingredients used).
4. The API cleans and parses the response, then sends it to the website.
5. The website shows each suggestion as a card.
6. If the AI key is missing, the call fails, or the response is garbage, the API returns an error and the UI shows a message instead of crashing.

As the product catches up to the plan, the prompt should also lean on soon-to-expire items and favor recipes that work for someone with little time and a thin pantry.

## Saving a suggestion: matching by name

The AI only knows ingredient names from the prompt. It does not know your database IDs, and we should not ask it to invent them.

So when you save a suggestion as a recipe, the app matches each suggested name to a pantry item by name (capitalization and surrounding spaces ignored). That can miss close variants (onion vs onions). When that happens, the recipe still saves and the user is told what was skipped. If nothing matches, the recipe is not created. See FR-8 to FR-10 in [requirements](./requirements.md).

When asking for suggestions, the API also lists the user’s already-saved recipe names and asks Gemini to avoid the same (or near-identical) dishes. The website may hide any leftover exact name matches and explain if the run was all duplicates.

Manual recipe creation already picks pantry items directly, so it does not need this name step.

## Known limits (today)

- No automatic retries yet when Gemini fails
- Recipe and meal-plan lists are not paginated (fine at current size); ingredients support skip/limit
- Name matching is exact after normalizing case and trimming spaces, not fuzzy
- Expiry notices and cook-and-update are on the [project plan](./project-plan.md) and not shipped yet
- Save-from-suggestion is in the UI; unmatched names still skip linking rather than fuzzy-matching
- Avoiding already-saved recipes is by name only (not ingredients or “similar dish” detection)

## Doc history

- 6 Aug 2026: First design notes aligned with the API and frontend.
- 7 Aug 2026: Documented save-from-suggestion name matching.
- 8 Aug 2026: Deleting a recipe still on a meal plan is rejected (API conflict; Recipes page explains next step).
- 9 Aug 2026: Trimmed name match; no recipe create when nothing matches; suggest path avoids already-saved names (exact match hide + prompt).
