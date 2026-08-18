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

So when you save a suggestion as a recipe, the app matches each suggested name to a pantry item by name (capitalization and surrounding spaces ignored, plus simple singular/plural on the last word — onion/onions, tomato/tomatoes, berry/berries). Exact match wins if both exist. It still misses different phrases (tomato vs cherry tomatoes). Units must also match after trim and case (`cup` vs `lbs` is not converted). A name match with a different unit is skipped, not linked, and the note says so plus what to do (use the same unit on the pantry item, then save again). When names or units do not match, the recipe still saves with the linked lines. If nothing can be linked, the recipe is not created. See FR-8 to FR-10 in [requirements](./requirements.md).

When asking for suggestions, the API also lists the user’s already-saved recipe names and asks Gemini to avoid the same (or near-identical) dishes. The website may hide any leftover exact name matches and explain if the run was all duplicates.

Manual recipe creation already picks pantry items directly, so it does not need this name step. The add form fills the unit from the pantry item so Cook this can subtract later.

## Cooking a saved recipe

Cook this lives on saved recipe cards only (not suggestion cards, not meal plans). A suggestion is names until you save it; a meal plan is “I meant to eat this,” including on a future date, so subtracting the pantry there would be too early.

The API subtracts each linked line from the pantry by `ingredient_id`. Quantities never go negative. If the pantry has less than the recipe needs, it uses what is there and reports the shortfall. If the pantry row is gone, or units do not match, that line is skipped and named. Rows that hit 0 stay in the pantry at 0 — they are still on the recipe, so delete would be refused. The pantry stepper’s Undo / delayed DELETE path is unchanged and is not used for cook.

The Recipes page shows a short confirmation (Pantry updated, plus skipped or short lines). After any line is subtracted, Cook this on that card stays Cooked until you leave the page (same idea as Saved on a suggestion). View pantry sits next to it. If every line was skipped, the button stays enabled so you can fix units and try again.

Pantry rows at quantity 0 (the cook leftover, not the stepper’s delayed delete) show a calm note that they are still on a recipe.

## Known limits (today)

- No automatic retries yet when Gemini fails
- Recipe and meal-plan lists are not paginated (fine at current size); ingredients support skip/limit
- Name matching is case/space normalized, plus simple last-word singular/plural, not fuzzy or substring
- Pantry list order is client-side: expired, then expiring soon (soonest date first), then the rest in API order
- Quantity at 0 **on the pantry stepper** removes the row from the UI immediately and schedules a per-item delayed DELETE (~5s) with an Undo toast; Undo cancels only that item’s countdown. Explicit Delete stays immediate. Timers live outside the Pantry page so navigate-away still deletes. If DELETE is blocked because the item is still used in a recipe, the API returns a conflict, the row is restored, and the page names those recipes. Cook this is a separate path: it PUTs remaining quantity (including 0) and keeps the row. Those leftover 0 rows show a calm “still on a recipe” note on Pantry.
- Deleting a pantry item still linked to a recipe is rejected (same idea as deleting a recipe still on a meal plan)
- Near-expiry / expired notices on the pantry list are frontend-only (calm per-row labels; calendar-day compare; 3-day near window; list sorted so those rows sit at the top). The suggestion prompt uses the same 3-day window on the backend (`NEAR_EXPIRY_DAYS = 3`) to tag items and bias recipes
- Meal plans do not flag a planned recipe when its linked pantry ingredients are expired or expiring (parked for the buffer week). Cook this is not on meal-plan rows (parked: only if the plan date is today, still via the recipe cook endpoint)
- Save-from-suggestion is in the UI; unmatched names still skip linking rather than fuzzy-matching. Unit mismatches skip linking too (no conversion)
- Cook this does not convert units and does not delete pantry rows that hit 0 while they are still on a recipe. The Cooked lock is UI-only for that page visit; the API still accepts another cook after remount.
- Avoiding already-saved recipes is by name only (not ingredients or “similar dish” detection)
- Phone layout is done for Pantry and suggestion cards (stacked list, tappable controls). Recipes and Meal Plans have not had that pass yet.

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
- 16 Aug 2026: Cook this on saved recipes (subtract by id, clamp 0, keep linked rows, honest skip/short notes). Save matching requires matching units. No cook on suggestions or meal plans.
- 17 Aug 2026: Cook this locks after a subtract (Cooked + View pantry). Quantity-0 pantry rows note they were left by cook because they are still linked.
- 18 Aug 2026: Pantry and suggestion cards usable on a phone-sized screen (layout only). Recipes / Meal Plans phone layout still open.
