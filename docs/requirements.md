# Smart Pantry — Requirements

## Purpose

Smart Pantry is a web app for tracking what you have in the kitchen, getting AI recipe ideas from that list, saving ideas as recipes, and optionally planning meals.

This document says what the product must do. It does not say how to build it. For schedule and priorities, see the [project plan](./project-plan.md). For how the system is put together, see [design](./design.md).

The product is aimed at people who are short on time or ingredients and need a usable answer quickly, without a rigid meal-prep process.

## What users must be able to do

IDs (FR-1, and so on) are for tracking. The statements are written in plain language.

| ID | Requirement |
|----|-------------|
| FR-1 | A person can create an account with an email and password. |
| FR-2 | A registered user can log in and get a session token so the app knows who they are. |
| FR-3 | Requests for personal data are rejected if the user is not logged in. |
| FR-4 | A user can add an ingredient with name, quantity, and unit. Category and expiry date are optional. |
| FR-5 | A user can view, change, and delete only their own pantry items. Deleting an item still used in a recipe is refused, and the user is told which recipes. |
| FR-6 | The app can generate recipe suggestions from the user’s current pantry using an AI model (Gemini). |
| FR-7 | Each suggestion includes a name, description, prep time, ingredients used (with quantity and unit), and step-by-step instructions. |
| FR-8 | A user can save an AI suggestion as a permanent recipe. |
| FR-9 | When saving a suggestion, the app matches each suggested ingredient to the pantry by name (capitalization and surrounding spaces ignored, and simple singular/plural on the last word) and links the matching pantry item. |
| FR-10 | If a suggested ingredient cannot be matched, the recipe still saves with the matched ones, and the user is told what was skipped. If none match, the recipe is not saved and the user is told. |
| FR-11 | A user can view, create, update, and delete their own recipes. |
| FR-12 | A user can create, view, update, and delete meal plans that point at their saved recipes (a date plus breakfast, lunch, or dinner). |
| FR-13 | A user can adjust an ingredient’s quantity without deleting and re-adding it. |
| FR-14 | When an ingredient has an expiry date, the app can show a clear near-expiry or expired notice on the pantry. |
| FR-15 | When generating suggestions, the app may prefer recipes that use soon-to-expire items when those dates are available. |
| FR-16 | A user can mark that they cooked a recipe (or finished using listed ingredients) and have pantry quantities updated accordingly. |

FR-8 through FR-10 are in the UI (save from a suggestion card with name matching and a skip note; matching also covers simple last-word singular/plural). FR-4’s optional category and expiry are collected on the Pantry add form and shown in the list. FR-5: delete is refused with a named-recipe message when the item is still linked to a recipe (including after quantity hits 0). FR-13 is in the UI (quantity stepper / direct edit via partial PUT). Quantity at 0 auto-removes the item after a short Undo window (delayed DELETE); the explicit Delete control remains immediate. FR-14 is in the UI (calm per-row Expired / Expiring soon labels next to the expiry date; client-side calendar-day compare, 3-day near window; those rows sort to the top of the list). FR-15 is in the suggestion prompt (backend tags the same 3-day / expired window and asks Gemini to prefer those items when it reasonably can; also rush-friendly / thin-pantry wording). An empty pantry does not call the model; the UI tells the user to add a few ingredients. FR-16 is still required for the plan’s “done” bar and is tracked in the [project plan](./project-plan.md).

## Quality and safety expectations

| ID | Expectation |
|----|-------------|
| NFR-1 | Protected API access uses the login token. |
| NFR-2 | Users cannot read or change another user’s ingredients, recipes, or meal plans. |
| NFR-3 | Recipe suggestions should come back in a time that feels interactive (aim under about 10 seconds, limited by the external AI service). |
| NFR-4 | The API and database can be run together with Docker Compose. The React frontend runs separately (local or hosted). |
| NFR-5 | User data is stored in PostgreSQL, not only in memory. |
| NFR-6 | If suggestion generation fails or returns bad data, the UI shows an inline error instead of crashing. |

## Not in this version

These are intentionally out for now:

- Free-text “quick add” parsing of grocery notes
- Photo-based pantry scanning
- Shared pantries for multiple people
- Fuzzy matching beyond case, trim, and simple singular/plural on the last word
- Heavy grocery-store integrations or a rigid weekly meal-prep product
- Flagging a meal-plan entry when its recipe’s linked pantry ingredients are expired or expiring soon (parked; see the project plan buffer week)

## Doc history

| Date | Change |
|------|--------|
| 6 Aug 2026 | First version from project notes, matched to the current API and deploy shape. |
| 6 Aug 2026 | Added FR-13–FR-16 for quantity edits, expiry notices, use-it-up bias, and cook-and-update. Softened wording so non-technical readers can follow. Aligned with the project plan. |
| 7 Aug 2026 | Noted FR-8–FR-10 as shipped in the UI; FR-13–FR-16 still open. |
| 8 Aug 2026 | Clarified delete-recipe behavior with meal plans: conflict (not a silent failure) when a recipe is still planned. Recipes list search/polish is UX only. |
| 9 Aug 2026 | FR-9/FR-10: matching also trims spaces; if nothing matches, the recipe is not saved. Save UI: no double-save, View in Recipes after save. Suggestions avoid already-saved recipe names (exact name). |
| 10 Aug 2026 | FR-4 category/expiry on add form + list display confirmed; FR-13 quantity adjust shipped (stepper / type, clamp at 0). FR-14–FR-16 still open; remove/finished still pending. |
| 11 Aug 2026 | Quantity at 0: optimistic remove + Undo toast + delayed DELETE (per item). Explicit Delete unchanged. Week 2 pantry remove/finished (at-zero) shipped; FR-14–FR-16 still open. |
| 12 Aug 2026 | FR-14 shipped: calm Expired / Expiring soon labels on pantry rows (frontend-only, date-only compare, 3-day near window). FR-15–FR-16 still open. |
| 13 Aug 2026 | FR-15 shipped: suggestion prompt tags expired / expiring-soon items (same 3-day window) and prefers them when reasonable; rush / thin-pantry prompt wording. FR-16 still open. Meal-plan expiry flags parked (not a requirement this version). |
| 14 Aug 2026 | Empty-pantry Suggest helper (no Gemini call). FR-5: delete ingredient refused with recipe names when still used in a recipe. FR-16 still open. |
| 15 Aug 2026 | FR-14: pantry list sorts expired, then expiring soon, to the top. FR-9: simple last-word singular/plural on save. FR-16 still open. |
