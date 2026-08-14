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
3. Log in. You should land on your Pantry page.

One thing to know about the live site: the backend runs on a free hosting plan, so it sometimes sleeps. The first request after a quiet stretch can take half a minute or so. That is normal.

## Your pantry

On the Pantry page, add what you have: a name, how much, and the unit (for example flour, 2, cup). Category and expiry date are optional. Items show up in your list with those fields when you set them.

If you set an expiry date, the list may show a small note next to it: Expired when the date is in the past, or Expiring soon when it falls within the next three days (including today). Items without an expiry date look the same as before.

To change how much you have without deleting the row, use the − / + buttons next to the quantity, or click the number and type an exact value. Quantity will not go below zero.

When quantity hits zero (via the stepper or by typing 0), the item leaves the list right away and you get a short toast: Removed {name} · Undo. If you do nothing for about five seconds, the item is deleted for good. Click Undo in that window to put it back at its previous quantity. The Delete button on the row still removes an item immediately, with no toast.

If that item is still used in a saved recipe, it cannot be deleted yet. You will see a message that names those recipes. Remove it from the recipes first, then delete it from the pantry. If you hit zero on an item that is still in a recipe, the row comes back with that same message instead of disappearing for good.

## Recipe suggestions

1. On the Pantry page, click Suggest recipes.
2. The app looks at what you currently have and returns a few ideas. Each one usually includes a name, short description, prep time, ingredients with amounts, and steps. If something is expired or expiring within the next three days, the ideas tend to use those items when they reasonably can. Suggestions are aimed at a rushed cook with a possibly thin pantry: shorter prep when it makes sense, simple steps, mostly what you already listed, and a note in the recipe if something extra is still needed.
3. If the ideas are thin, try adding a couple of staples. Suggestions only know about what is in your pantry right now. A very short list can still return a simple idea (or an honest note that there is not much to work with). If the pantry is empty, Suggest recipes stays disabled and you will see “Add a few ingredients to get suggestions.” The app also tries not to repeat recipes you already saved (by name). If everything it comes back with is already under Recipes, you will see a short note instead of duplicate cards.
4. If something goes wrong, you should see an error on the page. The rest of the app should still work.

## Saving recipes

### Write one yourself

Go to Recipes, create a recipe with a name, and pick ingredients from your pantry. You can add description, instructions, and prep time if you want. Use the search box at the top of your list to filter by recipe name as you type. Delete anything you no longer need — if that recipe is still on a meal plan, the app will tell you to remove it from the plan first.

On each saved recipe card, if there are instructions, use View instructions to expand them (and Hide instructions to collapse). Recipes without instructions omit that control.

### Save an AI suggestion

On a suggestion card, click Save recipe. The app matches ingredient names to your pantry (ignoring capitalization and extra spaces) and creates a normal recipe you can find under Recipes. After a successful save, the button stays on Saved and you can open View in Recipes. Clicking Save again on that card does nothing until you run Suggest recipes again.

If some names do not match, the recipe still saves and you get a note about what was skipped. If nothing matches, the recipe is not saved and you get a clear note instead.

## Meal plans

Open Meal Plans from the navigation. Pick a saved recipe, a date, and breakfast, lunch, or dinner. Add it, or remove entries when plans change. Meal plans are optional. You can get value from the app without using them. Planned meals do not yet warn you if a linked pantry ingredient is expired or expiring soon (that is a later idea, not in this version).

## Troubleshooting

**Suggest recipes fails or returns nothing**
If the pantry is empty, add at least one ingredient — the button stays off until then. On the live app, wait for the backend to wake up if it was idle. If you run locally, check that the Gemini API key is set (see the technical doc).

**Login fails**
Check the email and password. Email is matched the way it was stored when you registered.

**A saved recipe is missing some ingredients**
If you saved from a suggestion, check the skip note. Names have to match your pantry entries closely.

**Can't delete a recipe**
If you see a message about a meal plan, open Meal Plans, remove that recipe from the plan, then try deleting again.

**Can't delete a pantry item**
If you see a message that it is used in a recipe, open Recipes, take that ingredient off those recipes, then try deleting again.

**The page hangs on the first request**
On the live app, give it 30 to 60 seconds and try again. Locally, confirm Docker is running and the frontend can reach the API.

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