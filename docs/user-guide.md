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

On the Pantry page, add what you have: a name, how much, and the unit (for example flour, 2, cup). Items show up in your list, and you can remove anything you used up or threw out.

Category and expiry date exist in the system, but adding them from the form is still being finished. Same for quick quantity edits. The project plan covers when that lands.

## Recipe suggestions

1. On the Pantry page, click Suggest recipes.
2. The app looks at what you currently have and returns a few ideas. Each one usually includes a name, short description, prep time, ingredients with amounts, and steps.
3. If the ideas are thin, try adding a couple of staples. Suggestions only know about what is in your pantry right now. The app also tries not to repeat recipes you already saved (by name). If everything it comes back with is already under Recipes, you will see a short note instead of duplicate cards.
4. If something goes wrong, you should see an error on the page. The rest of the app should still work.

## Saving recipes

### Write one yourself

Go to Recipes, create a recipe with a name, and pick ingredients from your pantry. You can add description, instructions, and prep time if you want. Use the search box at the top of your list to filter by recipe name as you type. Delete anything you no longer need — if that recipe is still on a meal plan, the app will tell you to remove it from the plan first.

On each saved recipe card, if there are instructions, use View instructions to expand them (and Hide instructions to collapse). Recipes without instructions omit that control.

### Save an AI suggestion

On a suggestion card, click Save recipe. The app matches ingredient names to your pantry (ignoring capitalization and extra spaces) and creates a normal recipe you can find under Recipes. After a successful save, the button stays on Saved and you can open View in Recipes. Clicking Save again on that card does nothing until you run Suggest recipes again.

If some names do not match, the recipe still saves and you get a note about what was skipped. If nothing matches, the recipe is not saved and you get a clear note instead.

## Meal plans

Open Meal Plans from the navigation. Pick a saved recipe, a date, and breakfast, lunch, or dinner. Add it, or remove entries when plans change. Meal plans are optional. You can get value from the app without using them.

## Troubleshooting

**Suggest recipes fails or returns nothing**
Make sure you have a few ingredients. On the live app, wait for the backend to wake up if it was idle. If you run locally, check that the Gemini API key is set (see the technical doc).

**Login fails**
Check the email and password. Email is matched the way it was stored when you registered.

**A saved recipe is missing some ingredients**
If you saved from a suggestion, check the skip note. Names have to match your pantry entries closely.

**Can't delete a recipe**
If you see a message about a meal plan, open Meal Plans, remove that recipe from the plan, then try deleting again.

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
