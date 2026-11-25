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
