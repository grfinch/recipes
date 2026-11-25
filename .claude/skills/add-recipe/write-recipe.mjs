// Saves one drafted recipe (a JSON file holding a single recipe object) as
// src/recipes/<id>.json, but only if no recipe with that id exists and every recipe still
// validates with it added. Nothing is written on failure. Run from the repo root:
//   node .claude/skills/add-recipe/write-recipe.mjs path/to/draft.json
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  CATEGORIES_FILE,
  RECIPES_DIR,
  loadRecipeFiles,
  validateRecipes,
} from '../../../scripts/validate-recipes.mjs';

const draftPath = process.argv[2];
if (!draftPath) {
  console.error('Usage: node .claude/skills/add-recipe/write-recipe.mjs <draft.json>');
  process.exit(2);
}
if (!existsSync(RECIPES_DIR)) {
  console.error(`No ${RECIPES_DIR}. Run this from the repo root.`);
  process.exit(2);
}

let draft;
try {
  draft = JSON.parse(readFileSync(draftPath, 'utf8'));
} catch (e) {
  console.error(`Couldn't read ${draftPath} as JSON: ${e.message}`);
  process.exit(1);
}
if (!draft || typeof draft !== 'object' || Array.isArray(draft) || typeof draft.id !== 'string') {
  console.error('The draft must be a single recipe object with an "id".');
  process.exit(1);
}

const file = `${draft.id}.json`;
const target = path.join(RECIPES_DIR, file);
if (existsSync(target)) {
  console.error(`Not added: src/recipes/${file} already exists. Choose another id.`);
  process.exit(1);
}

const categories = JSON.parse(readFileSync(CATEGORIES_FILE, 'utf8'));
const errors = validateRecipes([...loadRecipeFiles(), { file, recipe: draft }], categories);
if (errors.length > 0) {
  console.error(`Not added. ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

// Prettier's JSON style: 2-space indent and a final newline. Run `npm run format` after anyway.
writeFileSync(target, JSON.stringify(draft, null, 2) + '\n');
console.log(`Added "${draft.name}" as src/recipes/${file}.`);
