// Checks every recipe file in src/recipes/ against the recipe schema in AGENTS.md and the
// allowed categories in src/recipeCategories.json. Run with `npm run validate:recipes`; CI
// runs it on every pull request. Exits 1 and lists every problem if anything is wrong.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
// RESERVED_SLUGS: links the app uses for its own views (e.g. #/browse), so no recipe can take them
import { RESERVED_SLUGS } from '../src/utils/recipeHash.js';

// Paths from the repo root, where npm scripts, Vitest, and CI all run. (Under Vitest,
// import.meta.url isn't a file:// URL, so it can't be used to find these.)
export const RECIPES_DIR = path.resolve('src/recipes');
export const CATEGORIES_FILE = path.resolve('src/recipeCategories.json');

const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const KNOWN_KEYS = [
  'id',
  'name',
  'course',
  'cookingMethod',
  'ingredients',
  'instructions',
  'notes',
];
const isSeparator = (s) => s.trim().startsWith('-');

// Every recipe file as { file, recipe }, or { file, error } if it isn't valid JSON.
export function loadRecipeFiles(dir = RECIPES_DIR) {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((file) => {
      try {
        return { file, recipe: JSON.parse(readFileSync(path.join(dir, file), 'utf8')) };
      } catch (e) {
        return { file, error: e.message };
      }
    });
}

function checkText(value, where, errors) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${where}: must be a non-empty string`);
    return false;
  }
  if (value !== value.trim()) errors.push(`${where}: has leading or trailing spaces`);
  return true;
}

// A flat list (instructions, notes) where "---" items split groups, as RecipeSection reads it.
function checkFlatList(list, where, errors, { required }) {
  if (!Array.isArray(list)) {
    errors.push(`${where}: must be an array of strings`);
    return;
  }
  if (required && list.filter((s) => typeof s === 'string' && !isSeparator(s)).length === 0) {
    errors.push(`${where}: needs at least one item`);
  }
  list.forEach((item, i) => {
    if (!checkText(item, `${where}[${i}]`, errors) || !isSeparator(item)) return;
    // A separator first, last, or next to another leaves an empty group and a stray divider.
    const prev = list[i - 1];
    if (i === 0 || i === list.length - 1 || (typeof prev === 'string' && isSeparator(prev))) {
      errors.push(`${where}[${i}]: "${item}" separator would leave an empty group`);
    } else if (item.trim() !== '---') {
      errors.push(`${where}[${i}]: separators must be exactly "---" (got "${item}")`);
    }
  });
}

function checkRecipe(recipe, file, label, categories, errors) {
  if (!recipe || typeof recipe !== 'object' || Array.isArray(recipe)) {
    errors.push(`${label}: must be a single recipe object`);
    return;
  }

  for (const key of Object.keys(recipe)) {
    if (!KNOWN_KEYS.includes(key)) errors.push(`${label}: unknown field "${key}"`);
  }

  if (checkText(recipe.id, `${label}.id`, errors)) {
    if (!ID_PATTERN.test(recipe.id)) {
      errors.push(`${label}.id: "${recipe.id}" must be lowercase letters, digits, and dashes`);
    }
    if (file !== `${recipe.id}.json`) {
      errors.push(`${label}.id: "${recipe.id}" must match the file name (${recipe.id}.json)`);
    }
    if (RESERVED_SLUGS.includes(recipe.id)) {
      errors.push(`${label}.id: #/${recipe.id} is reserved for an app view; choose another id`);
    }
  }
  checkText(recipe.name, `${label}.name`, errors);

  for (const [field, allowed] of [
    ['course', categories.courses],
    ['cookingMethod', categories.cookingMethods],
  ]) {
    if (checkText(recipe[field], `${label}.${field}`, errors) && !allowed.includes(recipe[field])) {
      errors.push(
        `${label}.${field}: "${recipe[field]}" is not in src/recipeCategories.json (${allowed.join(', ')})`,
      );
    }
  }

  // Ingredients: an array of groups, each a non-empty array of strings.
  const groups = recipe.ingredients;
  if (!Array.isArray(groups) || groups.length === 0) {
    errors.push(`${label}.ingredients: must be a non-empty array of groups (arrays of strings)`);
  } else {
    groups.forEach((group, g) => {
      const where = `${label}.ingredients[${g}]`;
      if (!Array.isArray(group) || group.length === 0) {
        errors.push(`${where}: must be a non-empty array of strings`);
        return;
      }
      group.forEach((item, i) => {
        if (checkText(item, `${where}[${i}]`, errors) && isSeparator(item)) {
          errors.push(
            `${where}[${i}]: "${item}" starts with "-"; groups are separate arrays, not "---" items`,
          );
        }
      });
    });
  }

  checkFlatList(recipe.instructions, `${label}.instructions`, errors, { required: true });
  if (recipe.notes !== undefined) {
    checkFlatList(recipe.notes, `${label}.notes`, errors, { required: false });
  }
}

// entries: [{ file, recipe }] or [{ file, error }], as loadRecipeFiles returns.
export function validateRecipes(entries, categories) {
  const errors = [];
  const seenIds = new Map();
  const seenNames = new Map();

  for (const { file, recipe, error } of entries) {
    if (error) {
      errors.push(`${file}: not valid JSON (${error})`);
      continue;
    }
    checkRecipe(recipe, file, file, categories, errors);

    if (typeof recipe?.id === 'string') {
      if (seenIds.has(recipe.id)) errors.push(`${file}: same id as ${seenIds.get(recipe.id)}`);
      seenIds.set(recipe.id, file);
    }
    if (typeof recipe?.name === 'string') {
      const lower = recipe.name.trim().toLowerCase();
      if (seenNames.has(lower)) errors.push(`${file}: same name as ${seenNames.get(lower)}`);
      seenNames.set(lower, file);
    }
  }
  return errors;
}

// CLI: validate the real files when run directly, not when imported by a test.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!existsSync(RECIPES_DIR)) {
    console.error(`No ${RECIPES_DIR}. Run this from the repo root (npm run validate:recipes).`);
    process.exit(2);
  }
  const entries = loadRecipeFiles();
  const categories = JSON.parse(readFileSync(CATEGORIES_FILE, 'utf8'));
  const errors = validateRecipes(entries, categories);
  if (errors.length > 0) {
    console.error(`src/recipes/ has ${errors.length} problem(s):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`src/recipes/: ${entries.length} recipes OK`);
}
