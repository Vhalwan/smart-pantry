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
3. If the ideas are thin, try adding a couple more staples. Suggestions only know about what is in your pantry right now.
4. If something goes wrong, you should see an error on the page. The rest of the app should still work.

## Saving recipes

### Write one yourself

Go to Recipes, create a recipe with a name, and pick ingredients from your pantry. You can add description, instructions, and prep time if you want. Delete anything you no longer need.

### Save an AI suggestion

This is the main path we want: click Save on a suggestion card and it becomes a normal recipe.

When that flow is finished, the app will match suggestion ingredient names to your pantry (ignoring capitalization). If a name does not match, the recipe still saves and you get a note about what was skipped.

Until the Save button is fully wired up, use the manual Recipes page.

## Meal plans

Open Meal Plans from the navigation. Pick a saved recipe, a date, and breakfast, lunch, or dinner. Add it, or remove entries when plans change. Meal plans are optional. You can get value from the app without using them.

## Troubleshooting

**Suggest recipes fails or returns nothing**
Make sure you have a few ingredients. On the live app, wait for the backend to wake up if it was idle. If you run locally, check that the Gemini API key is set (see the technical doc).

**Login fails**
Check the email and password. Email is matched the way it was stored when you registered.

**A saved recipe is missing some ingredients**
If you saved from a suggestion, check the skip note. Names have to match your pantry entries closely.

**The page hangs on the first request**
On the live app, give it 30 to 60 seconds and try again. Locally, confirm Docker is running and the frontend can reach the API.

## FAQ

**Can other people see my pantry?**
No. Each account only sees its own ingredients, recipes, and meal plans.

**Does it work offline?**
No. You need a network connection, and suggestions need the AI service to be reachable.
