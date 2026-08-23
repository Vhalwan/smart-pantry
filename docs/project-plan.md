# Smart Pantry — Project Plan

## What we are aiming for

Smart Pantry should help someone who is short on time (or short on groceries) answer one question: what can I make with what I already have?

When this plan is done, using the app should feel light:

- Adding and removing food is quick. If you ate it, it is gone from the list in a tap or two.
- AI suggestions are actually cookable, with clear steps, even when the pantry is sparse.
- You can save a suggestion as a recipe from the suggestion itself.
- Expiry dates and categories do something useful, not just sit in unused fields.
- Nothing forces a big meal-prep workflow. Optional fields stay optional.

Success looks like this: open the app, fix the pantry, get a usable idea, save it if you want, cook it, and get on with your evening.

## How this product should feel

Rush-friendly. Few taps. Readable on a phone.

Okay with a thin pantry. Prefer recipes that use what is already there, and be honest when something is missing.

Not rigid. Category and expiry are optional. Meal plans help but are not required.

Useful rather than flashy. The interesting part is “use what is about to go bad, and keep the list honest after you cook,” not novelty for its own sake.

## Where things stand

Already working:

- Accounts and login
- Pantry list (name, quantity, unit, category, expiry)
- Optional category and expiry on the add-ingredient form
- Quick quantity adjust (− / + stepper, or type an exact value) without delete-and-readd
- Quantity at 0 auto-removes the row (Undo toast, then DELETE); row Delete stays immediate
- Clear message if you try to delete a pantry item that is still used in a recipe
- Pantry list ordered so expired and expiring-soon items sit at the top
- AI recipe suggestions from the current pantry (prefer soon-to-expire items; rush / thin-pantry prompt; empty pantry shows a helper instead of a generic error)
- Save a suggestion as a recipe from the suggestion card (name match including simple plurals; units must match too, or that line is skipped with a note)
- Cook this on a saved recipe (subtract pantry amounts; keep rows at 0 if they are still linked; Cooked + View pantry after a subtract)
- Manual recipes and meal plans
- Live site (frontend on Vercel, API on Render)
- Pantry page and suggestion cards usable on a phone (stacked list, tappable controls; 18 Aug)
- Suggest recipes: waking-up note on a slow call; plain-language error + Try again on failure (19 Aug)
- Empty pantry first-use: add a few ingredients, then Suggest (21 Aug)
- Ship week closed (22 Aug): live done-checklist passed; docs/README marked v1 complete; Recipes/Meal Plans phone layout skipped (already usable enough); meal plans left alone
- Unit aliases on save and cook (22 Aug) — cup/cups, tbsp/tablespoon, etc.; still no cup↔ml conversion
- Meal Plans: Ready / short / mismatch + Cook this for **today** only (22 Aug)

Still open:

- Nothing required for core v1. See design “Possibly in future” for optional stretch ideas (safe conversions, shopping gaps, week strip, etc.).

Category and expiry are collected and shown. Rows with an expiry date show a calm Expired or Expiring soon label when the date is past or within the next 3 days, and those rows sit at the top of the list. Suggestions tag those same items in the Gemini prompt and bias toward using them when it is reasonable. An empty pantry shows a helper instead of calling the model. Hitting quantity 0 on the pantry stepper removes the item after a short Undo window, unless the item is still used in a recipe — then it comes back with a named-recipe message. Cook this is different: it lowers quantities in one action and leaves a linked item at 0 instead of deleting it. After a subtract, Cook this stays Cooked on that card (with View pantry) so a second tap does not empty the list; leave and come back to cook it again. Pantry rows sitting at 0 after cook show they are still on a recipe. Save-from-suggestion matching covers simple last-word singular/plural as well as case, spaces, and the same unit (cup vs lbs is skipped, with a next step).

## Timeline (why not two full months)

Most of the foundation is already built. Stretching the calendar to two months would mostly invent polish weeks. The remaining work is a short chain of features.

Rough shape at about 3 hours a day:

| Work | About |
|------|--------|
| Save suggestion as recipe | Half a week |
| Living pantry (quantity edits, optional category and expiry) | One week |
| Expiry notices plus better “use it up” / rush prompts | One week |
| Cook and update the pantry | One week |
| Ship pass (clarity, errors, docs, final check) | One week |

That is about five focused weeks, with one optional buffer week if something slips. Target for core done: Sunday 6 September 2026. Buffer only through Sunday 13 September if needed.

Checkpoints are every Sunday. This first week is short (Thursday through Sunday). If you fall behind, drop polish and meal-plan tweaks before cutting save, expiry, or cook-and-update.

## Week by week

### Sunday 9 August 2026 (short week)

Get suggestions into the recipe list.

- [x] Save button on each suggestion
- [x] Match ingredient names to the pantry (ignore capitalization); tell the user what was skipped
- [x] Confirm the recipe shows up under Recipes
- [x] Update the user guide once it works

Done when: Pantry, Suggest, Save works without rebuilding the recipe by hand.

### Sunday 16 August 2026

Make the pantry easy to keep honest.

- [x] Optional category and expiry on add (Day 1, 10 Aug)
- [x] Quick quantity adjust without delete-and-readd (Day 1, 10 Aug)
- [x] Clear remove / finished at quantity 0 (Day 2, 11 Aug) — Undo toast, then delayed DELETE; row Delete stays immediate
- [x] Show category and expiry in the list (already in the table; form wiring completed the pair)

Done when: updating the pantry after a meal takes about a minute.

### Sunday 23 August 2026

Make expiry matter, and make suggestions better for rushed cooks.

- [x] Calm near-expiry notice (and expired items) on the pantry (Day 1, 12 Aug) — per-row labels; client-side; 3-day near window
- [x] Tell the AI which items are expiring soon and ask it to prefer those (Day 2, 13 Aug) — same 3-day window; bias, not a hard requirement
- [x] Prompt for short prep when possible, clear steps, mostly on-hand ingredients, honest gaps, reliable response shape (Day 2, 13 Aug)
- [x] Thin pantry: prompt tells Gemini a 1–2 item list is OK to keep simple / honest; empty pantry: Suggest is disabled with “Add a few ingredients to get suggestions” (no Gemini call; API still 400 if called anyway) (Day 3, 14 Aug)

Done when: setting an expiry changes what you notice and what you tend to get suggested.

### Sunday 30 August 2026

Close the loop after cooking.

- [x] “I cooked this” from a saved recipe (16 Aug) — not from suggestion cards or meal plans (does not fit cleanly)
- [x] Lower quantities; rows that hit zero stay at 0 when they are still on the recipe (no delayed DELETE / Undo toast for cook)
- [x] Refresh the pantry after cook so the next suggestion run is accurate
- [x] After a successful subtract, Cook this stays Cooked on that card (no double-tap); View pantry link (17 Aug)
- [x] Pantry rows at 0 after cook show a calm “still on a recipe” note (17 Aug)

Done when: you do not have to delete every ingredient by hand after dinner.

### Sunday 6 September 2026 (core done)

Ship what you meant to build. This is not another feature week.

- [x] Pantry and suggestion cards readable on a phone, with clear main actions (18 Aug) — stacked ingredient cards below `md`; larger tap targets; Undo toast inset. Recipes / Meal Plans not in this pass.
- [x] Clearer errors when the API is waking up or the AI call fails, plus a way to try again (19 Aug) — delayed waking-up note; mapped errors; Try again; 90s timeout; no silent retry
- [x] Clear next steps when the pantry is empty or a save skips ingredients (21 Aug) — first-use add-then-Suggest note; save skip notes already named the next step (16 Aug)
- [x] Leave meal plans alone unless a small bug blocks basic use (22 Aug) — no meal-plan bugs blocking basic use; dedicated Recipes/Meal Plans phone pass skipped (already usable)
- [x] Bring the user guide (and other docs if behavior changed) in line with what shipped (22 Aug)
- [x] Run the “done” checklist below on the live app; fix blockers only (22 Aug) — passed
- [x] Short note in the README that v1 is complete (22 Aug)

Core v1 done early (22 Aug), ahead of the 6 September checkpoint.

### Buffer: Sunday 13 September 2026

Only if the done checklist had failed, or one small stretch is clearly worth it (better name matching, shopping hints, category filter, AI retries, optional “similar to a saved recipe” badge for near-dupes, meal-plan expiry flags — see below). Checklist passed 22 Aug — stop unless you deliberately want a stretch item.

Parked (13 Aug 2026): meal-plan expiry flags — **shipped as stretch 23 Aug 2026** (see below).

Shipped (22 Aug 2026): Cook this on meal-plan rows when the plan date is **today** (same `POST /recipes/{id}/cook`). Future plans stay plans-only for cook. Cook on suggestion cards remains out.

Shipped (23 Aug 2026, stretch): Meal Plans show Ready / short / mismatch on every plan, plus Expired / Expiring soon names for linked pantry ingredients (same 3-day window as pantry). Cook this still today-only.

## Possibly in future

- Safe amount conversions within a family (tsp↔tbsp, g↔kg) — not cup↔g
- Shopping / gaps list; remembered default unit; category filter
- Week strip UI; “Plan this” from a recipe; expiring-item chips on Suggest

## In scope / out of scope

In for this version: fast pantry edits, expiry awareness, better suggestions, save from suggestion, cook-and-update, keep meal plans usable, document the happy path.

Out for now: photo scanning, shared household pantries, grocery store integrations, perfect fuzzy name matching, a heavy meal-prep system.

If a new idea does not help “what do I cook tonight with this?”, park it.

## Done checklist (6 September 2026)

A test account should be able to:

1. Register, log in, and see what to do next on an empty pantry.
2. Add a few ingredients quickly (category and expiry optional).
3. See a near-expiry warning when a date is soon.
4. Get suggestions that mostly use what is on hand, with usable steps.
5. Save a suggestion as a recipe in one action and find it under Recipes.
6. Mark food used or cook a recipe and see the pantry update.
7. Fix mistakes easily without being stuck in a required workflow.
8. Survive a failed suggestion call without the app falling over.

## Sunday check-in

Spend a few minutes each Sunday:

1. Tick what you finished (move at most one leftover item).
2. Ask: does this still help someone in a rush with few ingredients?
3. If behind, cut polish before the core loop.

## Doc history

- 6 Aug 2026: First plan used a longer two-month calendar.
- 6 Aug 2026: Shortened to about five weeks plus one buffer, because the foundation already exists. Core end 6 Sep, buffer 13 Sep.
- 6 Aug 2026: Rewrote for clearer language and alignment with the other docs.
- 7 Aug 2026: Marked save-from-suggestion week complete (Save on suggestion cards, name matching, Recipes list, user guide).
- 8 Aug 2026: Recipes polish — client-side title search, card layout/spacing pass, clearer error when delete is blocked by a meal plan (API 409 + UI message). Documented in technical, design, and user guide.
- 9 Aug 2026: Save-loop polish (four items): (1) no double-save on the same suggestion card until Suggest runs again, (2) View in Recipes link after a successful save, (3) trim spaces when matching ingredient names, (4) do not create a recipe when nothing matches — show a clear note instead. Also: suggestions ask the model to avoid already-saved recipe names and hide leftover exact name matches.
- 10 Aug 2026: Week 2 Day 1 — optional category and expiry on the add form (list columns were already there); quantity stepper with click-to-type, optimistic PUT, clamp at 0. One Week 2 item left: clear remove / finished (and quantity-at-0 behavior).
- 11 Aug 2026: Week 2 Day 2 — quantity at 0 removes the row optimistically with a 5s Undo toast; each item has its own delayed DELETE (survives navigate-away / refresh via module store + sessionStorage). Explicit Delete unchanged. Week 2 pantry checklist complete; next focus is Week 3 expiry / suggestions.
- 12 Aug 2026: Week 3 Day 1 — calm Expired / Expiring soon labels on pantry rows (frontend-only calendar-day compare; `NEAR_EXPIRY_DAYS = 3`). Suggestion bias / prompt work still open.
- 13 Aug 2026: Week 3 Day 2 — suggestion prompt tags expired / expiring-soon pantry items (backend `NEAR_EXPIRY_DAYS = 3`, same window as the badge), biases toward using them, and favors rush-friendly / thin-pantry recipes. Empty pantry still 400. Parked: meal-plan expiry flags (buffer / after Week 4 cook-and-update).
- 14 Aug 2026: Week 3 Day 3 — empty-pantry Suggest helper (“Add a few ingredients to get suggestions”; button disabled, no Gemini call). Delete ingredient blocked when still used in a recipe (API 409 + recipe names; UI message; delayed zero-quantity DELETE restores the row instead of retrying). Week 3 checklist complete.
- 15 Aug 2026: Ahead-of-schedule polish (Week 3 still done 14 Aug; checkpoints unchanged). Pantry list sorts expired / expiring-soon to the top. Save matching: simple last-word singular/plural. Week 4 cook-and-update still next.
- 16 Aug 2026: Week 4 cook-and-update (checkpoint still 30 Aug). Cook this on saved recipe cards; `POST /recipes/{id}/cook` subtracts by ingredient id, clamps at 0, keeps linked rows; skip/short notes; no cook on suggestions or meal plans. Save matching also requires the same unit (case/trim) or that line is skipped with a next-step note. Add-ingredient unit hints; add-recipe prefills pantry unit.
- 17 Aug 2026: Week 4 close — Cook this locks to Cooked after a subtract (retry stays available if every line was skipped); View pantry after cook; pantry quantity-0 rows note that Cook this left them because they are still on a recipe.
- 18 Aug 2026: Ship-week start — Pantry + suggestion-card phone layout only (no behavior/API change). Remaining ship items: API/AI errors, Recipes/Meal Plans layout, docs/README, live done-checklist.
- 19 Aug 2026: Ship-week item 2 — Suggest loading/error UI (waking-up note, mapped copy, Try again, 90s timeout). No silent retry; Gemini/cook logic unchanged. Remaining: Recipes/Meal Plans layout, README v1 note, live done-checklist.
- 21 Aug 2026: Ship-week — empty pantry first-use (add a few ingredients, then Suggest). Save skip next-steps were already in the UI. Unit add fields locked to a common-measure select (Pantry + Recipes). Remaining: Recipes/Meal Plans layout, docs/README check, live done-checklist.
- 22 Aug 2026: Ship week closed early. Live done-checklist passed; README v1 note; docs aligned. Recipes/Meal Plans dedicated phone pass skipped (already usable); meal plans left alone. Core v1 complete; buffer week optional only.
- 22 Aug 2026 (later): Unit aliases; Meal Plans today readiness + Cook this. Possibly-in-future list in design/plan.
- 23 Aug 2026: Stretch — Meal Plans expiry / low-stock flags (readiness on every plan; Expired / Expiring soon names; Cook this still today-only).