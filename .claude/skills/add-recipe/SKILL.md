---
name: add-recipe
description: Add a new recipe to the recipe book (src/recipes/<id>.json) from pasted text or by interviewing the user, with light cleanup, validation, a browser check, and a pull request. Use when asked to add, enter, import, save, or type up a recipe for the recipe book.
---

Turns a recipe the user pastes or describes into a new file, `src/recipes/<id>.json`, checks it, and opens a pull request. All paths are relative to the repo root. The schema is in `AGENTS.md` ("Recipe schema"). The allowed categories are in `src/recipeCategories.json`.

## 1. Branch first

Every change goes on its own branch and pull request. Never commit to `main`.

```bash
git branch --show-current    # check again right before committing; the user may switch branches
git switch main && git pull
git switch -c add-recipe/<id>   # e.g. add-recipe/chicken-tikka-masala
```

If the working tree has unrelated changes, stop and ask. Adding several recipes in one session is fine: use one branch, one commit per recipe, and one PR.

## 2. Collect the recipe

**Pasted text:** read the paste as the recipe. Ignore blog preamble, ads, ratings, and "jump to recipe" text. If anything below is missing or unclear, ask about only those parts.

**Interview:** when the user describes a recipe loosely or says "let's add my X", ask a few questions at a time, in this order. Skip anything they've already said.

1. Name, course, and cooking method. Offer choices from `src/recipeCategories.json` with AskUserQuestion.
2. Ingredients with amounts. Ask what gets added together at each stage; those stages become the ingredient groups.
3. Steps, in order, with times and temperatures.
4. Tips, substitutions, storage, or serving ideas (optional; these become notes).

**Never invent** amounts, times, temperatures, servings, or ingredients. If one is missing, ask. If the user doesn't know, keep their wording (for example "salt to taste" or "until browned").

## 3. Shape it into the schema

```json
{
  "id": "instant-pot-lentil-stew",
  "name": "Instant-pot Lentil Stew",
  "course": "Main",
  "cookingMethod": "Instant-pot",
  "ingredients": [
    ["1 Tbsp olive oil", "1 onion, chopped or diced"],
    ["1 box beef broth (about 4 cups)", "1.5 cups brown lentils"]
  ],
  "instructions": ["Set instant pot to sauté and add olive oil", "---", "Add beef broth"],
  "notes": ["Cook longer for more tender meat."]
}
```

- **name:** Title Case, the way the user names it.
- **id:** the recipe's permanent link (`#/<id>`), its file name (`src/recipes/<id>.json`), and its saved-checklist key. Make it from the name: lowercase, accents dropped, and runs of anything else turned into `-` (`slugify` in `src/utils/recipeHash.js`). It never changes after the recipe is added, even if the name does. If a file with that id or a recipe with the same name already exists, ask whether this is a different recipe that needs another name, or an edit to the existing one, which this skill doesn't cover. `browse` is reserved.
- **course / cookingMethod:** exactly one value from `src/recipeCategories.json`. If nothing fits, propose a new value and ask. If the user agrees, add it to the list in the same commit. Match the existing style: first word capitalized, and hyphenate only where it's one name ("Instant-pot", "No-cook"). Don't create near-duplicates like "Instant Pot" or "Stove top".
- **ingredients:** an array of groups, and each group is an array of strings. Group by stage, the things that go in together. A recipe with no stages is a single group. Never put `---` inside ingredients.
- **instructions:** a flat array of steps. Put `"---"` between stages, usually lining up with the ingredient groups. Never put `---` first, last, or twice in a row.
- **notes:** optional, a flat array. Use it for tips, substitutions, storage, and serving ideas. Leave it out instead of writing `[]`.

## 4. Light cleanup (keep the user's voice)

Do these, and keep a list of each change to show the user:

- Fix clear spelling mistakes ("stew meet" → "stew meat"). Leave regional spellings and names alone.
- Capitalize the first word of each step, ingredient, and note.
- Format ingredients as `<amount> <unit> <ingredient>, <prep>`: "2 cloves garlic, minced", "1 can (14.5 oz) diced tomatoes". Keep parenthetical notes like "(or less)".
- Use consistent units: `Tbsp`, `tsp`, `cup`/`cups`, `lb`, `oz`, `g`, `ml`, `°F`/`°C`. Keep fractions as fractions (`1/2`) and ranges with a hyphen (`1-3`).
- Split a step that has several unrelated actions only if that's clearly easier to follow. Never merge steps.
- Trim spaces, and remove numbering, bullets, and checkbox characters copied from the source.
- Move a footnote's text into notes, and keep its marker (`*`) on the step.

Don't do these:

- Change amounts, times, temperatures, or the order of steps.
- Rewrite a step in your own words.
- Add steps, warnings, or tips that weren't given.

## 5. Show a draft and wait for approval

Show the recipe the way the app would show it, not as raw JSON:

- The name, its id and link (`#/<id>`), the course, and the cooking method
- Ingredients by group (blank line between groups), numbered steps by stage, and notes
- "Changes I made:" with each cleanup change (`"stew meet" → "stew meat"`, `"tbsp" → "Tbsp"`), or "none"
- Any new category value being added

Ask the user to approve or correct it. Apply their corrections, and show the draft again if the changes were more than trivial.

## 6. Write and verify

Write the approved recipe, as one JSON object, to a file in the scratchpad (not the repo). Then:

```bash
node .claude/skills/add-recipe/write-recipe.mjs <scratchpad>/draft.json   # validates, then writes src/recipes/<id>.json
npm run format          # keeps the new file in Prettier's style
npm run validate:recipes
npm test                # includes a test that every real recipe file validates
```

`write-recipe.mjs` refuses to write if the id is taken or the result would be invalid, and lists each problem. Fix the draft and run it again. Don't create the file by hand to get around it.

Then check it in a browser with the run-recipes skill's driver. Read `.claude/skills/run-recipes/SKILL.md` for setup:

```bash
RECIPE_ID=<id> node .claude/skills/run-recipes/driver.mjs .claude/skills/add-recipe/check-recipe.flow.mjs
```

It opens the recipe's link and checks that every ingredient is a checkbox and every step is a button. Look at the full-page screenshot it saves (`shots/add-recipe-<id>.png`) for anything odd, such as a stray divider or a step that runs together.

If the driver says "Reusing dev server" but the page shows old data, the running server may be serving stale files. Save the recipe file again (`touch` it) or restart `npm run dev`.

## 7. Commit, push, and open a PR

```bash
git branch --show-current          # must be your add-recipe/... branch, never main
git add src/recipes/<id>.json src/recipeCategories.json
git commit -m "Add <Recipe Name> recipe"   # end the message with the session's attribution line
git push -u origin <branch>
gh pr create --base main --title "Add <Recipe Name> recipe" --body "..."
```

Use the session's attribution lines for the commit message and PR body. In the PR body, include the recipe's link (`https://grfinch.github.io/recipes/#/<id>`), the course and method, the "changes I made" list, and any new category. Then watch `gh pr checks <n> --watch`, and fix anything that fails. Don't merge; the user does that.
