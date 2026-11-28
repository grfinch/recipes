import categories from '../recipeCategories.json';
import { BROWSE_FILTERS, filterValues } from './recipeHash';

const CATEGORY_ORDER = { course: categories.courses, method: categories.cookingMethods };

// Order values as recipeCategories.json lists them; any value it doesn't list goes last, A-Z.
// With no list (contributors), plain A-Z.
function byCategoryOrder(order = []) {
  const rank = (value) => {
    const i = order.indexOf(value);
    return i === -1 ? order.length : i;
  };
  return (a, b) => rank(a) - rank(b) || a.localeCompare(b);
}

// The choices for each browse filter: only values some recipe uses, so no choice is ever empty.
// Returns { course: [...], method: [...], by?: [...] }. `by` (who shared it) is left out when no
// recipe credits anyone, since "All" alone would be no choice.
export function filterOptions(recipes) {
  const options = {};
  for (const [param, field] of Object.entries(BROWSE_FILTERS)) {
    const used = new Set(
      recipes.map((r) => r[field]).filter((v) => typeof v === 'string' && v !== ''),
    );
    if (param === 'by' && used.size === 0) continue;
    options[param] = [...used].sort(byCategoryOrder(CATEGORY_ORDER[param]));
  }
  return options;
}

// Whether a recipe passes the filters ({ course?, method?, by? }, each a list of values). It must
// have one of the chosen values in every filter: Appetizer or Side, and Oven. A missing or empty
// filter means "All".
export function matchesFilters(recipe, filters) {
  return Object.entries(BROWSE_FILTERS).every(([param, field]) => {
    const values = filterValues(filters[param]);
    return values.length === 0 || values.includes(recipe[field]);
  });
}

// The All recipes list is always in A-Z sections, but it gets a "Jump to letter" bar only once
// it shows more recipes than this. On a shorter list the bar would just push the list down.
export const JUMP_BAR_THRESHOLD = 30;

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
