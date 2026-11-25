// Browser check for a newly added recipe: opens its link and checks what renders.
// Run through the run-recipes driver from the repo root, with the recipe's id:
//   RECIPE_ID=my-recipe \
//     node .claude/skills/run-recipes/driver.mjs .claude/skills/add-recipe/check-recipe.flow.mjs
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export default async function checkRecipe({ page, shot, check }) {
  const id = process.env.RECIPE_ID;
  if (!id) throw new Error('Set RECIPE_ID to the recipe id (its file name without .json)');

  const file = path.resolve('src/recipes', `${id}.json`);
  check('recipe file exists', existsSync(file), `src/recipes/${id}.json`);
  if (!existsSync(file)) return;
  const recipe = JSON.parse(readFileSync(file, 'utf8'));

  await page.goto(`${page.url().split('#')[0]}#/${id}`);
  await page.reload(); // load straight from the link, as a shared link would
  const h1 = page.getByRole('heading', { level: 1 });
  await h1.waitFor();
  check('its link opens it', (await h1.textContent()).trim() === recipe.name, `#/${id}`);

  const main = page.getByRole('main');
  const ingredientCount = recipe.ingredients.flat().length;
  const stepCount = recipe.instructions.filter((s) => !s.trim().startsWith('-')).length;
  const boxes = await main.getByRole('checkbox').count();
  const steps = await main.getByRole('listitem').getByRole('button').count();
  check('every ingredient is a checkbox', boxes === ingredientCount, `${boxes}/${ingredientCount}`);
  check('every step is a button', steps === stepCount, `${steps}/${stepCount}`);

  await page.screenshot({ path: shot(`add-recipe-${id}.png`), fullPage: true });
}
