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
  'contributor',
  'thanks',
];

// The most a credited name can be: the "Your name" limit on both suggest forms
// (src/utils/suggestion.js, src/utils/recipeChange.js), so a name sent through either fits
export const CONTRIBUTOR_MAX = 80;

// Zero-width and other invisible characters. The relay puts a zero-width space after every
// "@" in an issue, so a name copied by hand from one can carry it onto the page.
const INVISIBLE = /[\u200B-\u200F\u2060\uFEFF]/;

// A credited name: non-empty, trimmed, short enough, and nothing invisible in it
function checkName(value, where, errors) {
  if (!checkText(value, where, errors)) return;
  if (value.length > CONTRIBUTOR_MAX) {
    errors.push(`${where}: must be at most ${CONTRIBUTOR_MAX} characters`);
  }
  if (INVISIBLE.test(value)) {
    errors.push(`${where}: has an invisible character (often after "@"); retype the name`);
  }
}

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

const GROUP_KEYS = ['title', 'items'];

// ingredients, instructions, notes: a non-empty array of { title?, items: [string] } groups.
function checkGroups(groups, where, errors) {
  if (!Array.isArray(groups) || groups.length === 0) {
    errors.push(`${where}: must be a non-empty array of groups ({ "title"?, "items": [...] })`);
    return;
  }
  groups.forEach((group, g) => {
    const at = `${where}[${g}]`;
    if (!group || typeof group !== 'object' || Array.isArray(group)) {
      errors.push(`${at}: must be a group object ({ "title"?, "items": [...] })`);
      return;
    }
    for (const key of Object.keys(group)) {
      if (!GROUP_KEYS.includes(key)) errors.push(`${at}: unknown field "${key}"`);
    }
    if (group.title !== undefined) checkText(group.title, `${at}.title`, errors);
    if (!Array.isArray(group.items) || group.items.length === 0) {
      errors.push(`${at}.items: must be a non-empty array of strings`);
      return;
    }
    group.items.forEach((item, i) => {
      if (checkText(item, `${at}.items[${i}]`, errors) && /^-+$/.test(item)) {
        errors.push(`${at}.items[${i}]: "${item}" isn't a separator; start a new group instead`);
      }
    });
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

  checkGroups(recipe.ingredients, `${label}.ingredients`, errors);
  checkGroups(recipe.instructions, `${label}.instructions`, errors);
  // Optional, but leave it out rather than writing an empty list
  if (recipe.notes !== undefined) checkGroups(recipe.notes, `${label}.notes`, errors);
  // Optional: who shared the recipe, shown on its page as credit
  if (recipe.contributor !== undefined) {
    checkName(recipe.contributor, `${label}.contributor`, errors);
  }
  // Optional: people whose suggested changes were used, thanked on the page in this order
  if (recipe.thanks !== undefined) {
    if (!Array.isArray(recipe.thanks) || recipe.thanks.length === 0) {
      errors.push(`${label}.thanks: must be a non-empty array of names (or left out)`);
    } else {
      const seen = new Set();
      recipe.thanks.forEach((name, i) => {
        checkName(name, `${label}.thanks[${i}]`, errors);
        if (typeof name !== 'string') return;
        const key = name.trim().toLowerCase();
        if (seen.has(key)) errors.push(`${label}.thanks[${i}]: "${name}" is already listed`);
        seen.add(key);
      });
    }
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
