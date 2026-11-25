// Appends one recipe (a JSON file holding a single recipe object) to src/recipes.json,
// but only if the whole file still validates. Nothing is written on failure.
//   node .claude/skills/add-recipe/append-recipe.mjs path/to/draft.json
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateRecipes } from '../../../scripts/validate-recipes.mjs';

const fromRoot = (rel) => fileURLToPath(new URL(`../../../${rel}`, import.meta.url));
const RECIPES = fromRoot('src/recipes.json');

const draftPath = process.argv[2];
if (!draftPath) {
  console.error('Usage: node .claude/skills/add-recipe/append-recipe.mjs <draft.json>');
  process.exit(2);
}

let draft;
try {
  draft = JSON.parse(readFileSync(draftPath, 'utf8'));
} catch (e) {
  console.error(`Couldn't read ${draftPath} as JSON: ${e.message}`);
  process.exit(1);
}
if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
  console.error('The draft must be a single recipe object, not an array or a whole recipes.json.');
  process.exit(1);
}

const data = JSON.parse(readFileSync(RECIPES, 'utf8'));
const categories = JSON.parse(readFileSync(fromRoot('src/recipeCategories.json'), 'utf8'));
const next = { ...data, recipes: [...data.recipes, draft] };

const errors = validateRecipes(next, categories);
if (errors.length > 0) {
  console.error(`Not added. ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

// Prettier's JSON style: 2-space indent and a final newline. Run `npm run format` after anyway.
writeFileSync(RECIPES, JSON.stringify(next, null, 2) + '\n');
console.log(`Added "${draft.name}" (recipe ${next.recipes.length} of ${next.recipes.length}).`);
