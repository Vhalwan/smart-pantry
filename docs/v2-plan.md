# Smart Pantry — v2 Plan (Tonight)

## Why v2

v1 answers: *“What can I make with what I already have?”*

It does that well — pantry, AI suggestions, save, cook, expiry bias, meal plans. The loop is complete.

v2 answers the next question, without changing the product’s purpose:

> *“It’s dinner time — what should I make **right now**, and what’s stopping me if I can’t?”*

Today that answer is split across four tabs. You have to mentally combine expiring items on Pantry, readiness on each recipe card, today’s row on Meal Plans, and fresh ideas from Suggest. v2 puts the **decision** in one place.

**v2 in one line:** v1 is discovery and honesty; v2 is the decision layer.

v1 stays shipped and frozen unless a v2 change needs a small fix. See [project plan](./project-plan.md) for what v1 delivered.

## What we are aiming for

When v2 is done, opening the app should feel like this:

1. Land on **Tonight** and immediately see what you can cook without hunting.
2. Expiring pantry items are visible next to recipes that use them.
3. Today’s meal plan (if any) is prominent, with the same Cook this behavior as v1.
4. Saved recipes are grouped: **Ready**, **Short on…**, and **Blocked** (missing or unit mismatch).
5. If nothing works, one clear path: fix the pantry or **Suggest recipes**.
6. Optional: a short **gaps** list — *“To make Fried Rice you need 1 more cup rice”* — so blockers are actionable, not buried in per-card notes.

Success looks like: open app → pick one dish → cook → done. No tab-hopping.

## How the Tonight page should work

### Route and nav

- New page at `/tonight` (working title **Tonight**; “Make now” is fine in copy if it reads better on mobile).
- Add **Tonight** to the main nav in `AppLayout.jsx`, ideally **first** (before Pantry).
- Optional stretch (buffer week): after login, redirect to `/tonight` instead of `/pantry`. Default stays Pantry until the page is proven.

### Data (no new API for core v2)

Reuse existing endpoints only:

| Data | Source | Already used by |
|------|--------|-----------------|
| Pantry | `GET /ingredients/` | Pantry, Recipes, Meal Plans |
| Saved recipes | `GET /recipes/` | Recipes |
| Meal plans | `GET /meal-plans/` (filter client-side to today) | Meal Plans |

Reuse existing helpers:

| Helper | File | Use on Tonight |
|--------|------|----------------|
| Cook readiness | `cookHelpers.js` → `assessCookReadiness` | Group recipes; Cook this |
| Expiry status | `expiryHelpers.js` → `getExpiryStatus`, `assessLinkedExpiry` | Use-it-up strip; flags on recipe rows |
| Today’s date | `cookHelpers.js` → `localTodayISO` | Filter meal plans |
| Cook result notes | `cookHelpers.js` → `cookNoteFromResult` | After Cook this (same as Recipes) |

Cook this still calls `POST /recipes/{id}/cook` — same rules as v1 (aliases, clamp at 0, Cooked lock, View pantry).

### Page sections (top to bottom)

1. **Use it up** — Pantry items that are expired or expiring within 3 days (`NEAR_EXPIRY_DAYS`, same as v1). Calm pill badges, same tone as Pantry. If none, hide the section or show a one-line “Nothing expiring soon.”

2. **Today’s plan** — Meal plans where `planned_date` is today (local calendar). Each row: recipe name, meal type, readiness label, expiry flags on linked ingredients, **Cook this** when v1 would allow it. Empty state: “No meals planned for today” with a link to Meal Plans.

3. **Ready to cook** — Saved recipes where `assessCookReadiness` returns `ready`. Show name, prep time if set, and Cook this. Sort by prep time ascending when available, else name.

4. **Almost ready** — Recipes with status `short` (can cook but will run short). Show the readiness label. Cook this still enabled (same as v1).

5. **Need attention** — Recipes with status `blocked` (missing ingredient or unit mismatch). Show the readiness label. Cook this stays available per v1 rules, but the section sets expectations.

6. **Get ideas** — If Ready + Almost ready are empty, or as a footer CTA: button/link to Pantry with focus on Suggest, or embed a short “Run Suggest on Pantry” message. Do not duplicate the full suggestion UI on Tonight in v2 unless time allows; linking is enough.

### Gaps list (week 2)

A small aggregated block (above or below recipe groups):

- Walk all recipes in **Short** and **Blocked**.
- For each line that is short, missing, or unit-mismatched, emit a plain row: recipe name + what’s wrong + amount/unit when known.
- Deduplicate identical rows. No persistence, no shopping-cart checkbox — just a readable list.
- This is the lightweight version of “shopping / gaps” from the v1 design doc’s future list, not a full grocery app.

### Empty and edge states

| Situation | What Tonight shows |
|-----------|-------------------|
| Empty pantry | Same first-use tone as Pantry: add ingredients, then Suggest. Link to Pantry. |
| Pantry has items, no saved recipes | Use-it-up strip if applicable; “Get ideas” CTA to Pantry → Suggest. |
| Recipes exist, none ready | Show Need attention + Almost ready; gaps list if week 2 shipped. |
| Loading | Simple loading copy on the whole page (parallel fetch pantry + recipes + meal plans). |
| Partial fetch failure | Inline error per section or one page-level message + retry; do not crash. |

### Out of scope for v2

Same spirit as v1 — park unless Tonight proves you need them:

- New backend routes or database tables
- Full shopping list with checkboxes, store aisles, or persistence
- Safe unit conversion (cup ↔ ml)
- Photo scan, shared pantries, grocery integrations
- Duplicating Suggest cards on Tonight (link to Pantry instead)
- Cook this on suggestion cards or future meal plans (unchanged from v1)
- Dedicated phone pass on old Recipes / Meal Plans pages (unless a bug blocks Tonight)

## Requirements (v2)

| ID | Requirement |
|----|-------------|
| V2-1 | A logged-in user can open a **Tonight** page from the main nav. |
| V2-2 | The page shows pantry items that are expired or expiring within 3 days (same rules as Pantry). |
| V2-3 | The page shows today’s meal plans with the same readiness, expiry flags, and Cook this behavior as Meal Plans (today only). |
| V2-4 | Saved recipes are grouped into Ready, Almost ready (short), and Need attention (blocked), using the same readiness rules as Recipes and Meal Plans. |
| V2-5 | Cook this on Tonight uses `POST /recipes/{id}/cook` and matches v1 UI behavior (notes, Cooked lock, View pantry, refetch pantry). |
| V2-6 | When nothing is ready to cook, the page offers a clear path to Pantry / Suggest recipes. |
| V2-7 | The page is usable on a phone (stacked sections, ~44px tap targets on primary actions). |
| V2-8 | An aggregated **gaps** list names what blocks or shortfalls recipes (week 2). |

## Timeline

Rough shape at about 3 hours a day — same pace as v1.

| Work | About |
|------|--------|
| Tonight page shell + data fetch + nav | Half a week |
| Sections: use-it-up, today’s plan, recipe groups, Cook this | One week |
| Gaps list + empty states + errors | Half a week |
| Docs, user guide, live smoke test | Half a week |

**Target:** core v2 done by **Sunday 14 September 2026**. Optional buffer through **Sunday 21 September** (post-login redirect, “recipes using expiring items” filter, inline polish).

Checkpoints every Sunday. If behind, drop gaps list or post-login redirect before cutting recipe groups or Cook this.

## Week by week

### Week 1 — Sunday 7 September 2026

Ship the Tonight page with real data and cook actions.

- [x] Add `/tonight` route and **Tonight** nav item (first in nav) (2 Sep)
- [x] New `Tonight.jsx` page inside `AppLayout` (2 Sep)
- [x] Parallel load: ingredients, recipes, meal plans (2 Sep)
- [x] **Use it up** section from pantry + `getExpiryStatus` (2 Sep)
- [x] **Today’s plan** section (filter `localTodayISO`, reuse readiness + expiry + Cook this patterns from `MealPlans.jsx`) (2 Sep)
- [ ] **Ready / Almost ready / Need attention** recipe groups via `assessCookReadiness`
- [x] Cook this wired per recipe row (share logic with Recipes where practical — extract a small component or hook if it avoids copy-paste)
- [x] **Get ideas** empty/ thin state with link to Pantry (2 Sep; 3 Sep — nothing-ready CTA added)
- [x] Mobile layout: stacked sections, tappable Cook this / links (2 Sep for shipped sections)

**Done when:** You can open Tonight, see grouped recipes and today’s plan, cook a ready recipe, and land on View pantry — without opening Recipes or Meal Plans.

**2 Sep:** First implementation day after the 31 Aug plan. Shell (route, nav, parallel fetch) plus the first two sections: Use it up and Today’s plan with Cook this. Recipe groups still next.

### Week 2 — Sunday 14 September 2026

Make blockers actionable and close the docs loop.

- [ ] **Gaps** aggregated list from short/blocked recipes (V2-8)
- [ ] Highlight recipes that use expiring pantry items (client-side: recipe linked ids ∩ expiring pantry ids) — optional badge on cards in Ready / Almost ready
- [ ] Loading and error handling (failed fetch → message + retry)
- [ ] Update [user guide](./user-guide.md) with a Tonight section
- [ ] Update [technical](./technical.md) with route, file layout, no new API note
- [ ] Short note in [README](../README.md) that v2 is in progress or complete
- [ ] Run the v2 done checklist below on the live app; fix blockers only

**Done when:** Blockers are visible in one gaps list, docs match behavior, and the live Tonight flow passes the checklist.

### Buffer — Sunday 21 September 2026

Only if week 2 finished early or one stretch is clearly worth it:

- [ ] Post-login redirect to `/tonight` (toggle or permanent — decide after dogfooding)
- [ ] “Uses expiring items” sort boost within Ready group
- [ ] Extract shared `RecipeCookRow` / `MealPlanTodayRow` components if Tonight and old pages drifted

## v2 done checklist

A test account should be able to:

1. Open **Tonight** from the nav and see today’s date context.
2. See expiring pantry items when dates are set (same 3-day window as Pantry).
3. See today’s meal plan with readiness and Cook this (if a plan exists for today).
4. See saved recipes split into Ready vs Short vs Blocked.
5. Cook a ready recipe from Tonight and see the pantry update (Cooked + View pantry).
6. When nothing is ready, follow the CTA to Pantry and get suggestions.
7. Use the page on a phone without horizontal scroll on main actions.
8. (Week 2) Read a gaps list that names missing or short ingredients for blocked recipes.

## Sunday check-in

Same habit as v1:

1. Tick what you finished.
2. Ask: does Tonight actually pick dinner faster than tab-hopping?
3. If behind, cut gaps or redirect before cutting recipe groups.

## Doc history

| Date | Change |
|------|--------|
| 31 Aug 2026 | First v2 plan: Tonight decision page, 2-week timeline, requirements V2-1–V2-8. |
| 2 Sep 2026 | Week 1 day 1: `/tonight` route, Tonight first in nav, parallel fetch, Use it up, Today’s plan + Cook this. Recipe groups still open. |
| 3 Sep 2026 | Week 1 day 2: Ready / Almost ready / Need attention recipe groups, Cook this per recipe row, nothing-ready CTA. Week 1 complete. |
