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
| FR-5 | A user can view, change, and delete only their own pantry items. |
| FR-6 | The app can generate recipe suggestions from the user’s current pantry using an AI model (Gemini). |
| FR-7 | Each suggestion includes a name, description, prep time, ingredients used (with quantity and unit), and step-by-step instructions. |
| FR-8 | A user can save an AI suggestion as a permanent recipe. |
| FR-9 | When saving a suggestion, the app matches each suggested ingredient to the pantry by name (capitalization and surrounding spaces ignored) and links the matching pantry item. |
| FR-10 | If a suggested ingredient cannot be matched, the recipe still saves with the matched ones, and the user is told what was skipped. If none match, the recipe is not saved and the user is told. |
| FR-11 | A user can view, create, update, and delete their own recipes. |
| FR-12 | A user can create, view, update, and delete meal plans that point at their saved recipes (a date plus breakfast, lunch, or dinner). |
| FR-13 | A user can adjust an ingredient’s quantity without deleting and re-adding it. |
| FR-14 | When an ingredient has an expiry date, the app can show a clear near-expiry or expired notice on the pantry. |
| FR-15 | When generating suggestions, the app may prefer recipes that use soon-to-expire items when those dates are available. |
| FR-16 | A user can mark that they cooked a recipe (or finished using listed ingredients) and have pantry quantities updated accordingly. |

FR-8 through FR-10 are in the UI (save from a suggestion card with name matching and a skip note). FR-13 through FR-16 are still required for the plan’s “done” bar and are tracked in the [project plan](./project-plan.md).

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
- Fuzzy matching beyond ignoring capitalization on exact names
- Heavy grocery-store integrations or a rigid weekly meal-prep product

## Doc history

| Date | Change |
|------|--------|
| 6 Aug 2026 | First version from project notes, matched to the current API and deploy shape. |
| 6 Aug 2026 | Added FR-13–FR-16 for quantity edits, expiry notices, use-it-up bias, and cook-and-update. Softened wording so non-technical readers can follow. Aligned with the project plan. |
| 7 Aug 2026 | Noted FR-8–FR-10 as shipped in the UI; FR-13–FR-16 still open. |
| 8 Aug 2026 | Clarified delete-recipe behavior with meal plans: conflict (not a silent failure) when a recipe is still planned. Recipes list search/polish is UX only. |
| 9 Aug 2026 | FR-9/FR-10: matching also trims spaces; if nothing matches, the recipe is not saved. Save UI: no double-save, View in Recipes after save. Suggestions avoid already-saved recipe names (exact name). |
