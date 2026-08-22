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
5. The website shows each suggestion as a card. While waiting, it shows “Generating suggestions…”. After a few seconds with no response, that note switches to “The recipe service is waking up. This can take a few seconds.” (cold start on the live API, or a slow Gemini call).
6. If the AI key is missing, the call fails, times out, or the response is garbage, the API returns an error (or the website gives up after ~90 seconds). The UI shows a plain-language message and a Try again button — not raw API text or status codes. Retry is only when the user taps Try again (or Suggest recipes again); there is no silent auto-retry. Empty pantry stays the helper note, not that error path.

The prompt tags pantry items that are expired or expiring within 3 days (same window as the pantry badge) and asks Gemini to prefer those when it reasonably can. It also favors shorter prep, simple steps, mostly on-hand ingredients, and honesty about missing items. A fully empty pantry never calls Gemini: the website shows a first-use note (add a few ingredients, then Suggest recipes), disables Suggest recipes, and shows “Add a few ingredients to get suggestions.” The API still refuses an empty pantry if called anyway. A very thin pantry (1–2 items) still generates, with an extra prompt note to keep ideas simple and honest.

## Saving a suggestion: matching by name

The AI only knows ingredient names from the prompt. It does not know your database IDs, and we should not ask it to invent them.

So when you save a suggestion as a recipe, the app matches each suggested name to a pantry item by name (capitalization and surrounding spaces ignored, plus simple singular/plural on the last word — onion/onions, tomato/tomatoes, berry/berries). Exact match wins if both exist. It still misses different phrases (tomato vs cherry tomatoes). Units must also match after trim, case, and **aliases** (`cup`/`cups`, `tbsp`/`tablespoon`, `lb`/`lbs`, and similar — same measure, different spelling). The app does **not** convert different measures (`cup` vs `ml`). A name match with a different unit family is skipped, not linked, and the note says so plus what to do. When names or units do not match, the recipe still saves with the linked lines. If nothing can be linked, the recipe is not created. See FR-8 to FR-10 in [requirements](./requirements.md).

When asking for suggestions, the API also lists the user’s already-saved recipe names and asks Gemini to avoid the same (or near-identical) dishes. The website may hide any leftover exact name matches and explain if the run was all duplicates.

Manual recipe creation already picks pantry items directly, so it does not need this name step. The add form fills the unit from the pantry item (canonical spelling from the shared common-unit list) so Cook this can subtract later. Pantry and recipe unit fields are required selects of those common measures; free-text nonsense is not allowed on new rows.

## Cooking a saved recipe

Cook this lives on saved recipe cards and on **today’s** meal-plan rows (not suggestion cards, not future meal plans). A suggestion is names until you save it; a future meal plan is “I meant to eat this later,” so subtracting the pantry there would be too early.

The API subtracts each linked line from the pantry by `ingredient_id`. Quantities never go negative. If the pantry has less than the recipe needs, it uses what is there and reports the shortfall. If the pantry row is gone, or units do not match, that line is skipped and named. Rows that hit 0 stay in the pantry at 0 — they are still on the recipe, so delete would be refused. The pantry stepper’s Undo / delayed DELETE path is unchanged and is not used for cook.

The Recipes page shows a short confirmation (Pantry updated, plus skipped or short lines). After any line is subtracted, Cook this on that card stays Cooked until you leave the page (same idea as Saved on a suggestion). View pantry sits next to it. If every line was skipped, the button stays enabled so you can fix units and try again.

On Meal Plans, rows dated today show a pantry readiness note (Ready / Short on… / missing or unit mismatch) using the same id + alias rules as cook, plus Cook this (same API). Future dates show no cook control. After a subtract, that plan row locks to Cooked with View pantry for the rest of the visit.

Pantry rows at quantity 0 (the cook leftover, not the stepper’s delayed delete) show a calm note that they are still on a recipe.

## Known limits (today)

- No silent auto-retry when Gemini or the API fails; the user taps Try again (same request, same page)
- Recipe and meal-plan lists are not paginated (fine at current size); ingredients support skip/limit
- Name matching is case/space normalized, plus simple last-word singular/plural, not fuzzy or substring
- Unit matching uses aliases for the same measure (`cups`↔`cup`); there is still no amount conversion between different measures
- Pantry list order is client-side: expired, then expiring soon (soonest date first), then the rest in API order
- Quantity at 0 **on the pantry stepper** removes the row from the UI immediately and schedules a per-item delayed DELETE (~5s) with an Undo toast; Undo cancels only that item’s countdown. Explicit Delete stays immediate. Timers live outside the Pantry page so navigate-away still deletes. If DELETE is blocked because the item is still used in a recipe, the API returns a conflict, the row is restored, and the page names those recipes. Cook this is a separate path: it PUTs remaining quantity (including 0) and keeps the row. Those leftover 0 rows show a calm “still on a recipe” note on Pantry.
- Deleting a pantry item still linked to a recipe is rejected (same idea as deleting a recipe still on a meal plan)
- Near-expiry / expired notices on the pantry list are frontend-only (calm per-row labels; calendar-day compare; 3-day near window; list sorted so those rows sit at the top). The suggestion prompt uses the same 3-day window on the backend (`NEAR_EXPIRY_DAYS = 3`) to tag items and bias recipes
- Meal plans do not flag expiry on linked ingredients (parked). Cook this on meal plans is only for **today’s** date (future plans stay plans-only)
- Save-from-suggestion is in the UI; unmatched names still skip linking rather than fuzzy-matching. Unit family mismatches skip linking too (no conversion)
- Cook this does not convert units across families and does not delete pantry rows that hit 0 while they are still on a recipe. The Cooked lock is UI-only for that page visit; the API still accepts another cook after remount.
- Avoiding already-saved recipes is by name only (not ingredients or “similar dish” detection)
- Phone layout is done for Pantry and suggestion cards (stacked list, tappable controls). Recipes and Meal Plans did not get a dedicated pass; they were left as-is after ship-week review (usable enough on a phone).

## Possibly in future

Ideas that fit the product but are not built yet:

- Safe amount conversions within a unit family only (e.g. tsp↔tbsp, g↔kg) — still no cup↔g without density data
- Meal-plan expiry / low-stock flags on planned recipes
- Simple shopping / gaps list after suggest or on a recipe
- Default or remembered unit on pantry add; category filter on Pantry
- Week strip UI using the existing week meal-plan API
- “Plan this” from a recipe card (tonight / tomorrow)
- Suggest UI chips for “use these expiring items first”

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
- 19 Aug 2026: Suggest loading/error UI: waking-up note after a few seconds; plain-language failure + Try again (primary button). No auto-retry; suggestion logic unchanged.
- 21 Aug 2026: Empty pantry first-use note on the Pantry page (add, then Suggest). Save skip notes already included a next step. Unit fields are required selects of common kitchen measures (`frontend/src/units.js`).
- 22 Aug 2026: Ship week closed; core v1 complete. Recipes / Meal Plans phone layout left as-is (no dedicated pass).
- 22 Aug 2026 (later): Unit aliases on save/cook (`app/units.py`, `frontend/src/units.js`). Meal Plans: readiness + Cook this for today only. Possibly-in-future list added.
