// Browser check for a newly added recipe: opens its link and checks what renders.
// Run through the run-recipes driver with the recipe's slug and name:
//   RECIPE_SLUG=my-recipe RECIPE_NAME="My Recipe" \
//     node .claude/skills/run-recipes/driver.mjs .claude/skills/add-recipe/check-recipe.flow.mjs
import { readFileSync } from 'node:fs';

export default async function checkRecipe({ page, shot, check }) {
  const slug = process.env.RECIPE_SLUG;
  const name = process.env.RECIPE_NAME;
  if (!slug || !name) throw new Error('Set RECIPE_SLUG and RECIPE_NAME');

  const { recipes } = JSON.parse(
    readFileSync(new URL('../../../src/recipes.json', import.meta.url), 'utf8'),
  );
  const recipe = recipes.find((r) => r.name === name);
  check('recipe is in recipes.json', Boolean(recipe), name);
  if (!recipe) return;

  await page.goto(`${page.url().split('#')[0]}#/${slug}`);
  await page.reload(); // load straight from the link, as a shared link would
  const h1 = page.getByRole('heading', { level: 1 });
  await h1.waitFor();
  check('its link opens it', (await h1.textContent()).trim() === name, `#/${slug}`);

  const main = page.getByRole('main');
  const ingredientCount = recipe.ingredients.flat().length;
  const stepCount = recipe.instructions.filter((s) => !s.trim().startsWith('-')).length;
  const boxes = await main.getByRole('checkbox').count();
  const steps = await main.getByRole('listitem').getByRole('button').count();
  check('every ingredient is a checkbox', boxes === ingredientCount, `${boxes}/${ingredientCount}`);
  check('every step is a button', steps === stepCount, `${steps}/${stepCount}`);

  await page.screenshot({ path: shot(`add-recipe-${slug}.png`), fullPage: true });
}
