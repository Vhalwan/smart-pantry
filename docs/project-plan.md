# Smart Pantry — Project Plan

## What we are aiming for

Smart Pantry should help someone who is short on time (or short on groceries) answer one question: what can I make with what I already have?

When this plan is done, using the app should feel light:

- Adding and removing food is quick. If you ate it, it is gone from the list in a tap or two.
- AI suggestions are actually cookable, with clear steps, even when the pantry is sparse.
- You can save a suggestion as a recipe from the suggestion itself.
- Expiry dates and categories do something useful, not just sit in unused fields.
- Nothing forces a big meal-prep workflow. Optional fields stay optional.

Success looks like this: open the app, fix the pantry, get a usable idea, save it if you want, and get on with your evening.

## How this product should feel

Rush-friendly. Few taps. Readable on a phone.

Okay with a thin pantry. Prefer recipes that use what is already there, and be honest when something is missing.

Not rigid. Category and expiry are optional. Meal plans help but are not required.

Useful rather than flashy. The interesting part is “use what is about to go bad, and keep the list honest after you cook,” not novelty for its own sake.

## Where things stand

Already working:

- Accounts and login
- Pantry list (name, quantity, unit)
- AI recipe suggestions from the current pantry
- Save a suggestion as a recipe from the suggestion card (name match + skip note)
- Manual recipes and meal plans
- Live site (frontend on Vercel, API on Render)

Still open:

- Collecting category and expiry when adding food, and using them
- Near-expiry notices
- Easy quantity changes and a simple “I cooked this” update so the pantry stays true
- Prompting the AI more clearly for rushed cooks with few ingredients

Category and expiry already exist in the database and show as columns, but the add form does not collect them yet and nothing alerts on expiry.

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

- [ ] Optional category and expiry on add
- [ ] Quick quantity adjust without delete-and-readd
- [ ] Clear remove / finished action
- [ ] Show category and expiry in the list in a way that is actually useful

Done when: updating the pantry after a meal takes about a minute.

### Sunday 23 August 2026

Make expiry matter, and make suggestions better for rushed cooks.

- [ ] Calm near-expiry notice (and expired items) on the pantry
- [ ] Tell the AI which items are expiring soon and ask it to prefer those
- [ ] Prompt for short prep when possible, clear steps, mostly on-hand ingredients, honest gaps, reliable response shape
- [ ] Helpful message when the pantry is empty or very thin

Done when: setting an expiry changes what you notice and what you tend to get suggested.

### Sunday 30 August 2026

Close the loop after cooking.

- [ ] “I cooked this” (or similar) from a saved recipe, and from a suggestion if it fits cleanly
- [ ] Lower quantities or remove items that hit zero
- [ ] Refresh the pantry so the next suggestion run is accurate

Done when: you do not have to delete every ingredient by hand after dinner.

### Sunday 6 September 2026 (core done)

Ship what you meant to build. This is not another feature week.

- [ ] Pantry and suggestion cards readable on a phone, with clear main actions
- [ ] Clearer errors when the API is waking up or the AI call fails, plus a way to try again
- [ ] Clear next steps when the pantry is empty or a save skips ingredients
- [ ] Leave meal plans alone unless a small bug blocks basic use
- [ ] Bring the user guide (and other docs if behavior changed) in line with what shipped
- [ ] Run the “done” checklist below on the live app; fix blockers only
- [ ] Short note in the README that v1 is complete

### Buffer: Sunday 13 September 2026

Only if the 6 September checklist failed, or one small stretch is clearly worth it (better name matching, shopping hints, category filter, AI retries). If you already passed on the 6th, stop.

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
