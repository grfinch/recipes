import categories from '../recipeCategories.json';
import { BROWSE_FILTERS } from './recipeHash';

const CATEGORY_ORDER = { course: categories.courses, method: categories.cookingMethods };

// Order values as recipeCategories.json lists them; any value it doesn't list goes last, A-Z.
function byCategoryOrder(order) {
  const rank = (value) => {
    const i = order.indexOf(value);
    return i === -1 ? order.length : i;
  };
  return (a, b) => rank(a) - rank(b) || a.localeCompare(b);
}

// The choices for each browse filter: only values some recipe uses, so no choice is ever empty.
// Returns { course: [...], method: [...] }.
export function filterOptions(recipes) {
  const options = {};
  for (const [param, field] of Object.entries(BROWSE_FILTERS)) {
    const used = new Set(
      recipes.map((r) => r[field]).filter((v) => typeof v === 'string' && v !== ''),
    );
    options[param] = [...used].sort(byCategoryOrder(CATEGORY_ORDER[param]));
  }
  return options;
}

// Whether a recipe passes the filters ({ course?, method? }); a missing filter means "All".
export function matchesFilters(recipe, filters) {
  return Object.entries(BROWSE_FILTERS).every(
    ([param, field]) => !filters[param] || recipe[field] === filters[param],
  );
}

// The All recipes list splits into A-Z sections, with a jump bar, once it shows more recipes
// than this. Shorter lists stay one plain list.
export const LETTER_GROUP_THRESHOLD = 30;

// The section a recipe name files under: its first letter, upper-cased and without accents
// ("Éclairs" → "E"), or "#" for a name that starts with a digit, symbol, or another script.
export function letterFor(name) {
  const first = name.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().charAt(0).toUpperCase();
  return /^[A-Z]$/.test(first) ? first : '#';
}

// Split already-sorted recipes into [{ letter, recipes }], "#" first and then A-Z. Each
// section keeps the recipes in the order given; letters with no recipes are left out.
export function groupByLetter(recipes) {
  const sections = new Map();
  for (const recipe of recipes) {
    const letter = letterFor(recipe.name);
    if (!sections.has(letter)) sections.set(letter, []);
    sections.get(letter).push(recipe);
  }
  return [...sections]
    .map(([letter, list]) => ({ letter, recipes: list }))
    .sort((a, b) => (a.letter === '#' ? -1 : b.letter === '#' ? 1 : a.letter < b.letter ? -1 : 1));
}
