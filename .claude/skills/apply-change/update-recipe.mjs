// Saves an edited copy of an existing recipe (a JSON file holding a single recipe object) over
// src/recipes/<id>.json, but only if that recipe exists, its id and contributor are unchanged,
// and every recipe still validates with the edit. Nothing is written on failure. Run from the
// repo root:
//   node .claude/skills/apply-change/update-recipe.mjs path/to/draft.json
// With --check, it runs the same checks but never writes, to test a draft before showing it:
//   node .claude/skills/apply-change/update-recipe.mjs --check path/to/draft.json
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  CATEGORIES_FILE,
  RECIPES_DIR,
  loadRecipeFiles,
  validateRecipes,
} from '../../../scripts/validate-recipes.mjs';

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const draftPath = args.find((a) => a !== '--check');
if (!draftPath) {
  console.error('Usage: node .claude/skills/apply-change/update-recipe.mjs [--check] <draft.json>');
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
// The id names the file, so a draft can only ever replace the recipe it came from
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(draft.id) || !existsSync(target)) {
  console.error(`Not updated: there is no src/recipes/${file}. A change edits an existing recipe.`);
  process.exit(1);
}

const current = JSON.parse(readFileSync(target, 'utf8'));
const errors = [];
// The credit for sharing the recipe belongs to whoever shared it, whatever the change says
if (draft.contributor !== current.contributor) {
  errors.push(
    `contributor: must stay ${JSON.stringify(current.contributor)}; credit a change in the notes`,
  );
}
if (JSON.stringify(draft) === JSON.stringify(current)) {
  errors.push('the draft is the same as the current recipe; there is nothing to change');
}

const categories = JSON.parse(readFileSync(CATEGORIES_FILE, 'utf8'));
const others = loadRecipeFiles().filter((entry) => entry.file !== file);
errors.push(...validateRecipes([...others, { file, recipe: draft }], categories));
if (errors.length > 0) {
  console.error(`Not updated. ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

if (checkOnly) {
  console.log(`OK: src/recipes/${file} ("${draft.name}") would be updated. Nothing written.`);
  process.exit(0);
}

// Prettier's JSON style: 2-space indent and a final newline. Run `npm run format` after anyway.
writeFileSync(target, JSON.stringify(draft, null, 2) + '\n');
console.log(`Updated "${draft.name}" in src/recipes/${file}.`);
