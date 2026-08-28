# Smart Pantry — User Guide

## What this is

Smart Pantry is for nights when you do not want to think hard about dinner. You keep a list of what is in your kitchen, ask for recipe ideas based on that list, and save the ones you like. You can also put saved recipes on a simple meal plan.

It works best when you only have a few things left and need something you can actually cook.

## Related docs

- [Project plan](./project-plan.md) — goals and weekly deadlines
- [Requirements](./requirements.md) — what the product is supposed to do
- [Design](./design.md) — how the pieces fit together
- [Technical](./technical.md) — setup and API details for developers

## Getting started

Live app: [https://smart-pantry-hazel.vercel.app/login](https://smart-pantry-hazel.vercel.app/login)

You do not need to open the backend URL yourself. The website talks to it for you.

1. Open the live app (or run it on your computer using the steps in the technical doc).
2. Create an account with an email and password.
3. Log in. You should land on your Pantry page. If the list is empty, you will see a short note: add a few ingredients (name, how much, and a unit), then tap Suggest recipes.

One thing to know about the live site: the backend runs on a free hosting plan, so it sometimes sleeps. The first request after a quiet stretch can take half a minute or so. That is normal.

## Your pantry

On the Pantry page, add what you have: a name, how much, and a unit from the list (for example flour, 2, cup). Category and expiry date are optional. Items show up in your list with those fields when you set them. On a phone, the list stacks as cards instead of a wide table, and the main buttons (add, quantity − / +, delete, suggest, save) are sized for tapping. Unit is a required choice from common kitchen measures (g, ml, cup, tbsp, pcs, can, and so on) — not free text.

If you set an expiry date, the list may show a small note next to it: Expired when the date is in the past, or Expiring soon when it falls within the next three days (including today). Items without an expiry date look the same as before. Expired items sit at the top of the list, then expiring-soon, then everything else (soonest date first within those groups).

To change how much you have without deleting the row, use the − / + buttons next to the quantity, or click the number and type an exact value. Quantity will not go below zero.

When quantity hits zero (via the stepper or by typing 0), the item leaves the list right away and you get a short toast: Removed {name} · Undo. If you do nothing for about five seconds, the item is deleted for good. Click Undo in that window to put it back at its previous quantity. The Delete button on the row still removes an item immediately, with no toast.

If that item is still used in a saved recipe, it cannot be deleted yet. You will see a message that names those recipes. Remove it from the recipes first, then delete it from the pantry. If you hit zero on an item that is still in a recipe, the row comes back with that same message instead of disappearing for good.

## Recipe suggestions

1. On the Pantry page, click Suggest recipes.
2. The app looks at what you currently have and returns a few ideas. Each one usually includes a name, short description, prep time, ingredients with amounts, and steps. If something is expired or expiring within the next three days, the ideas tend to use those items when they reasonably can. Suggestions are aimed at a rushed cook with a possibly thin pantry: shorter prep when it makes sense, simple steps, mostly what you already listed, and a note in the recipe if something extra is still needed.
3. If the ideas are thin, try adding a couple of staples. Suggestions only know about what is in your pantry right now. A very short list can still return a simple idea (or an honest note that there is not much to work with). If the pantry is empty, Suggest recipes stays disabled. You will see a first-use note on the page (add a few ingredients, then Suggest) and “Add a few ingredients to get suggestions.” next to the button. The app also tries not to repeat recipes you already saved (by name). If everything it comes back with is already under Recipes, you will see a short note instead of duplicate cards.
4. While it thinks, you will see “Generating suggestions…”. If that sits for a few seconds (often the first try after the live site has been idle), it changes to a note that the recipe service is waking up and can take a few seconds. If it still fails, you get a short error and a Try again button — tap that to run the same request. The rest of the pantry still works.

## Saving recipes

### Write one yourself

Go to Recipes, create a recipe with a name, and pick ingredients from your pantry. The unit is filled from that pantry item so Cook this can subtract it later — keep it the same as the pantry row. You can add description, instructions, and prep time if you want. Use the search box at the top of your list to filter by recipe name as you type. Delete anything you no longer need — if that recipe is still on a meal plan, the app will tell you to remove it from the plan first.

On each saved recipe card, if there are instructions, use View instructions to expand them (and Hide instructions to collapse). Recipes without instructions omit that control.

### Save an AI suggestion

On a suggestion card, tap Save recipe (full-width on a phone). The app matches ingredient names to your pantry (ignoring capitalization and extra spaces, and simple singular/plural on the last word — tomato and tomatoes, berry and berries) and creates a normal recipe you can find under Recipes. The unit has to match too (cup and lbs do not count as the same; the app does not convert). After a successful save, the button stays on Saved and you can open View in Recipes. Clicking Save again on that card does nothing until you run Suggest recipes again.

If some names do not match, or the name matches but the unit does not, the recipe still saves with the linked ones and you get a note — for example Saved, but skipped rice (suggestion: cup, pantry: lbs), plus a reminder to use the same unit on the pantry item if you want it linked next time. Simple spelling differences count as the same unit (cup / cups, tbsp / tablespoon, lb / lbs). The app does not convert different measures (cup to ml). If nothing can be linked, the recipe is not saved and you get a clear note instead.

## After you cook

On a saved recipe card, click Cook this. The app subtracts that recipe’s linked amounts from your pantry. If you did not have enough of something, it uses what you had (never below zero) and tells you. If an item is missing or the units do not match, that line is skipped and named; the rest still updates. After a successful subtract, the button stays on Cooked so a second tap does not take the pantry down twice; use View pantry to see the new amounts. If every line was skipped (for example a unit mismatch), Cook this stays available so you can fix the pantry and try again.

Items that hit zero stay on the pantry list at 0 while they are still used in the recipe (they cannot be deleted until you take them off the recipe). Those rows show a short note: Still on a recipe — Cook this left this at 0. There is no Undo toast for this action — if you used a different amount, change the quantity on Pantry. Leave the page and come back if you cook the same recipe again later.

Cook this is not on suggestion cards or on Meal Plans. Save the suggestion first, then cook from Recipes. A meal plan is for a date you chose; cooking from a future plan would take food off the list too soon.

If a recipe has no ingredient lines, Cook this stays off.

## Meal plans

Open Meal Plans from the navigation. Pick a saved recipe, a date, and breakfast, lunch, or dinner. Add it, or remove entries when plans change. Meal plans are optional. You can get value from the app without using them.

Plans for any date show a short pantry check (Ready, Short on…, or missing / unit mismatch) and, when linked pantry items are past or within three days of expiry, calm Expired / Expiring soon lines naming those items — so you can decide whether to cook tonight or change plans. Plans for **today** also show a Cook this button — the same pantry update as on Recipes. After a successful subtract, the button stays Cooked with a View pantry link. Future dates stay plans only for cook (no cook button), so a Thursday dinner does not empty the pantry on Monday.

## Troubleshooting

**Suggest recipes fails or returns nothing**
If the pantry is empty, add at least one ingredient — the button stays off until then. If you see a waking-up note, wait; that is the live backend starting up, not a broken page. If you get an error, tap Try again (or Suggest recipes again). If you run locally, check that the Gemini API key is set (see the technical doc).

**Login fails**
Check the email and password. Email is matched the way it was stored when you registered.

**A saved recipe is missing some ingredients**
If you saved from a suggestion, check the skip note. Names have to match your pantry entries closely (case, spaces, and simple plurals on the last word). Units have to match too — rice in cup will not link to rice in lbs — but cup and cups (or tbsp and tablespoon) count as the same. Different words still skip — tomato will not match cherry tomatoes.

**Cook this skipped an ingredient**
If the note says the recipe uses one unit and the pantry uses another, change the pantry unit to match (and the amount if needed), then cook again. The app does not convert cup to lbs. Spelling variants like cups / cup are already treated as the same.

**Can't delete a recipe**
If you see a message about a meal plan, open Meal Plans, remove that recipe from the plan, then try deleting again.

**Can't delete a pantry item**
If you see a message that it is used in a recipe, open Recipes, take that ingredient off those recipes, then try deleting again.

**The page hangs on the first request**
On the live app, give it 30 to 60 seconds. Suggest recipes will say the service is waking up, then show Try again if it still cannot finish. Locally, confirm Docker is running and the frontend can reach the API.

## FAQ

**Can other people see my pantry?**
No. Each account only sees its own ingredients, recipes, and meal plans.

**Does it work offline?**
No. You need a network connection, and suggestions need the AI service to be reachable.

## Doc history

- 6 Aug 2026: First user guide for pantry, suggestions, recipes, and meal plans.
- 7 Aug 2026: Save an AI suggestion (match note / skip note).
- 8 Aug 2026: Recipes search; delete blocked by meal plan (clear message). Collapsible instructions shipped with the 7 Aug save flow.
- 9 Aug 2026: Save-loop polish — Saved stays until next Suggest, View in Recipes, trimmed matching, no save when nothing matches; suggestions skip already-saved names.
- 10 Aug 2026: Optional category and expiry on add; quantity stepper (− / +, click to type) with update without delete-and-readd.
- 11 Aug 2026: Quantity at 0 auto-removes the row with a 5-second Undo toast; Delete button stays immediate.
- 12 Aug 2026: Calm Expired / Expiring soon notes next to pantry expiry dates (within 3 days, or past).
- 13 Aug 2026: Suggestions prefer soon-to-expire items when dates are set, and lean toward simple, on-hand recipes for a thin pantry. Meal plans still do not flag expired ingredients on a planned meal.
- 14 Aug 2026: Empty pantry: Suggest recipes is disabled with “Add a few ingredients to get suggestions.” Can’t delete a pantry item that is still on a recipe — the message names those recipes.
- 15 Aug 2026: Pantry list puts expired items first, then expiring soon. Save from a suggestion also matches simple singular/plural on the last word.
- 16 Aug 2026: Cook this on saved recipes (pantry amounts go down; short or skipped lines are named). Save also skips when units do not match, with a next-step note. Meal plans still do not cook.
- 17 Aug 2026: Cook this stays Cooked after a subtract, with View pantry. Pantry rows at 0 after cooking explain they are still on a recipe.
- 18 Aug 2026: Pantry list and suggestion cards work on a phone (stacked cards, larger tap targets). Recipes and Meal Plans are unchanged.
- 19 Aug 2026: Suggest recipes — waking-up note if it is slow; error plus Try again if it fails. Empty pantry helper unchanged.
- 21 Aug 2026: Empty pantry first-use note — add a few ingredients, then Suggest recipes. Save skip notes already said what to do next. Unit on add is a required select of common kitchen measures (same list on Recipes).
- 22 Aug 2026: Ship week closed; live happy-path checklist passed. User guide matches shipped behavior; no further feature changes for v1.
- 22 Aug 2026 (later): Unit aliases (cup/cups, tbsp/tablespoon, etc.) on save and cook. Meal Plans: Ready / short / mismatch note and Cook this for today’s plans only.
- 23 Aug 2026: Meal Plans also show Expired / Expiring soon for linked ingredients, and readiness on future plans too (Cook this still today only).
- 28 Aug 2026: Visual refresh — same screens and actions, nicer look: shared header with Smart Pantry branding, softer background, clearer buttons and form fields, pill badges for expiry. No change to what the app does.