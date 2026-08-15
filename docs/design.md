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
2. The website skips the request when the pantry is empty (helper message). If the API is called anyway with an empty pantry, it refuses.
3. The API asks Gemini for a small set of recipes in a fixed JSON shape (name, description, instructions, prep time, ingredients used).
4. The API cleans and parses the response, then sends it to the website.
5. The website shows each suggestion as a card.
6. If the AI key is missing, the call fails, or the response is garbage, the API returns an error and the UI shows a message instead of crashing.

The prompt tags pantry items that are expired or expiring within 3 days (same window as the pantry badge) and asks Gemini to prefer those when it reasonably can. It also favors shorter prep, simple steps, mostly on-hand ingredients, and honesty about missing items. A fully empty pantry never calls Gemini: the website disables Suggest recipes and shows “Add a few ingredients to get suggestions.” The API still refuses an empty pantry if called anyway. A very thin pantry (1–2 items) still generates, with an extra prompt note to keep ideas simple and honest.

## Saving a suggestion: matching by name

The AI only knows ingredient names from the prompt. It does not know your database IDs, and we should not ask it to invent them.

So when you save a suggestion as a recipe, the app matches each suggested name to a pantry item by name (capitalization and surrounding spaces ignored, plus simple singular/plural on the last word — onion/onions, tomato/tomatoes, berry/berries). Exact match wins if both exist. It still misses different phrases (tomato vs cherry tomatoes). When that happens, the recipe still saves and the user is told what was skipped. If nothing matches, the recipe is not created. See FR-8 to FR-10 in [requirements](./requirements.md).

When asking for suggestions, the API also lists the user’s already-saved recipe names and asks Gemini to avoid the same (or near-identical) dishes. The website may hide any leftover exact name matches and explain if the run was all duplicates.

Manual recipe creation already picks pantry items directly, so it does not need this name step.

## Known limits (today)

- No automatic retries yet when Gemini fails
- Recipe and meal-plan lists are not paginated (fine at current size); ingredients support skip/limit
- Name matching is case/space normalized, plus simple last-word singular/plural, not fuzzy or substring
- Pantry list order is client-side: expired, then expiring soon (soonest date first), then the rest in API order
- Quantity at 0 removes the row from the UI immediately and schedules a per-item delayed DELETE (~5s) with an Undo toast; Undo cancels only that item’s countdown. Explicit Delete stays immediate. Timers live outside the Pantry page so navigate-away still deletes. If DELETE is blocked because the item is still used in a recipe, the API returns a conflict, the row is restored, and the page names those recipes
- Deleting a pantry item still linked to a recipe is rejected (same idea as deleting a recipe still on a meal plan)
- Near-expiry / expired notices on the pantry list are frontend-only (calm per-row labels; calendar-day compare; 3-day near window; list sorted so those rows sit at the top). The suggestion prompt uses the same 3-day window on the backend (`NEAR_EXPIRY_DAYS = 3`) to tag items and bias recipes; cook-and-update is still on the [project plan](./project-plan.md)
- Meal plans do not yet flag a planned recipe when its linked pantry ingredients are expired or expiring (parked for the buffer week, after cook-and-update)
- Save-from-suggestion is in the UI; unmatched names still skip linking rather than fuzzy-matching
- Avoiding already-saved recipes is by name only (not ingredients or “similar dish” detection)

## Doc history

- 6 Aug 2026: First design notes aligned with the API and frontend.
- 7 Aug 2026: Documented save-from-suggestion name matching.
- 8 Aug 2026: Deleting a recipe still on a meal plan is rejected (API conflict; Recipes page explains next step).
- 9 Aug 2026: Trimmed name match; no recipe create when nothing matches; suggest path avoids already-saved names (exact match hide + prompt).
- 10 Aug 2026: Pantry add collects optional category/expiry; quantity edits via stepper (optimistic PUT). Finished/remove and quantity-at-0 still open.
- 11 Aug 2026: Quantity-at-0 auto-remove: optimistic list remove, Undo toast (display-only), per-id delayed DELETE in `pendingIngredientRemovals` (sessionStorage + rehydrate). No PUT to 0 before delete.
- 12 Aug 2026: Pantry list shows calm Expired / Expiring soon labels from client-side date compare (`NEAR_EXPIRY_DAYS = 3`); no API change.
- 13 Aug 2026: Suggestion prompt tags expired / expiring-soon items and prefers them when reasonable; rush / thin-pantry wording. Meal-plan expiry flags parked.
- 14 Aug 2026: Empty pantry: UI helper, no Gemini call. Delete ingredient blocked when used in a recipe (API conflict; Pantry explains next step; delayed DELETE restores the row).
- 15 Aug 2026: Pantry list sorts expired / expiring-soon to the top (client-side). Save matching adds simple last-word singular/plural.
