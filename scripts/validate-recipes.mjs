// Checks src/recipes.json against the recipe schema in AGENTS.md and the allowed
// categories in src/recipeCategories.json. Run with `npm run validate:recipes`; CI runs it
// on every pull request. Exits 1 and lists every problem if anything is wrong.
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { slugify } from '../src/utils/recipeHash.js';

// Hash routes the app uses for its own views. A recipe whose slug matched one would be
// unreachable, so these names are taken. Keep in sync with the routes in App.jsx.
export const RESERVED_SLUGS = ['browse'];

const KNOWN_KEYS = ['name', 'course', 'cookingMethod', 'ingredients', 'instructions', 'notes'];
const isSeparator = (s) => s.trim().startsWith('-');

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

export function validateRecipes(data, categories) {
  const errors = [];
  if (!data || !Array.isArray(data.recipes)) {
    return ['top level: must be an object with a "recipes" array'];
  }

  const seenNames = new Map();
  const seenSlugs = new Map();

  data.recipes.forEach((recipe, r) => {
    const label = `recipes[${r}]${typeof recipe?.name === 'string' ? ` "${recipe.name}"` : ''}`;
    if (!recipe || typeof recipe !== 'object' || Array.isArray(recipe)) {
      errors.push(`${label}: must be an object`);
      return;
    }

    for (const key of Object.keys(recipe)) {
      if (!KNOWN_KEYS.includes(key)) errors.push(`${label}: unknown field "${key}"`);
    }

    if (checkText(recipe.name, `${label}.name`, errors)) {
      const lower = recipe.name.toLowerCase();
      const slug = slugify(recipe.name);
      if (seenNames.has(lower)) {
        errors.push(`${label}: same name as recipes[${seenNames.get(lower)}]`);
      } else if (seenSlugs.has(slug)) {
        errors.push(`${label}: same link (#/${slug}) as recipes[${seenSlugs.get(slug)}]`);
      }
      if (!slug) errors.push(`${label}: name has no letters or digits, so it can't have a link`);
      if (RESERVED_SLUGS.includes(slug)) {
        errors.push(`${label}: link #/${slug} is reserved for an app view; rename the recipe`);
      }
      seenNames.set(lower, r);
      seenSlugs.set(slug, r);
    }

    for (const [field, allowed] of [
      ['course', categories.courses],
      ['cookingMethod', categories.cookingMethods],
    ]) {
      if (
        checkText(recipe[field], `${label}.${field}`, errors) &&
        !allowed.includes(recipe[field])
      ) {
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
  });

  return errors;
}

// CLI: validate the real files when run directly, not when imported by a test.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const read = (rel) =>
    JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8'));
  const data = read('../src/recipes.json');
  const errors = validateRecipes(data, read('../src/recipeCategories.json'));
  if (errors.length > 0) {
    console.error(`src/recipes.json has ${errors.length} problem(s):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`src/recipes.json: ${data.recipes.length} recipes OK`);
}
