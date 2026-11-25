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
  const count = (groups) => groups.reduce((n, g) => n + g.items.length, 0);
  const ingredientCount = count(recipe.ingredients);
  const stepCount = count(recipe.instructions);
  const titles = [...recipe.ingredients, ...recipe.instructions, ...(recipe.notes ?? [])]
    .map((g) => g.title)
    .filter(Boolean);
  const boxes = await main.getByRole('checkbox').count();
  const steps = await main.getByRole('listitem').getByRole('button').count();
  check('every ingredient is a checkbox', boxes === ingredientCount, `${boxes}/${ingredientCount}`);
  check('every step is a button', steps === stepCount, `${steps}/${stepCount}`);
  const lastStep = await main.getByRole('listitem').getByRole('button').last().textContent();
  check('steps are numbered 1 to N', lastStep.trim().startsWith(`${stepCount}.`), lastStep.trim());
  const headings = await main.getByRole('heading', { level: 3 }).allTextContents();
  check(
    'group titles are headings',
    titles.every((t) => headings.includes(t)),
    headings.join(', '),
  );

  await page.screenshot({ path: shot(`add-recipe-${id}.png`), fullPage: true });
}
