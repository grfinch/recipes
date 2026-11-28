// Recipes are addressed by their permanent id, in a hash like #/instant-pot-lentil-stew. A hash works under the
// GitHub Pages sub-path without a router or server rewrites, and needs no base URL.

// Hashes for app pages rather than recipes. They are checked before any recipe lookup, so a
// recipe whose name slugifies to one of these (say, "Browse") can't take over the page.
export const BROWSE_HASH = '#/browse';
export const SUGGEST_HASH = '#/suggest';
export const PICK_HASH = '#/pick';
export const CHANGE_SLUG = 'suggest-change';
export const RESERVED_SLUGS = ['browse', 'suggest', 'pick', CHANGE_SLUG];

// Turns a name into an id: lowercase, accents dropped, anything else becomes "-". Used once,
// when a recipe is created. After that the id never changes, so a rename can't break links.
export function slugify(name) {
  return String(name)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // drop accents: "sauté" -> "saute"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function hashFor(recipe) {
  return `#/${recipe.id}`;
}

// The "Suggest a change" page for a recipe: #/suggest-change?recipe=<id>
export function changeHashFor(recipe) {
  return `#/${CHANGE_SLUG}?${new URLSearchParams({ recipe: recipe.id })}`;
}

// The part of the hash before any "?query". Recipe ids never contain "?", so this is safe for
// every page, and a recipe link with a stray query still opens the recipe.
function splitHash(hash) {
  const rest = String(hash ?? '').replace(/^#\/?/, '');
  const q = rest.indexOf('?');
  return q === -1 ? [rest, ''] : [rest.slice(0, q), rest.slice(q + 1)];
}

function slugFromHash(hash) {
  try {
    return decodeURIComponent(splitHash(hash)[0]);
  } catch {
    return null; // malformed percent-encoding
  }
}

// The All recipes page's filters (also used by Pick for me): URL parameter -> recipe field.
// "by" is who shared the recipe: #/browse?by=Sharmi. Kept free of JSON imports, because
// scripts/validate-recipes.mjs imports this file in plain Node.
export const BROWSE_FILTERS = { course: 'course', method: 'cookingMethod', by: 'contributor' };

// A filter's chosen values as a list: filters hold arrays, but a single value is accepted too
// (a recipe page's link to its course passes a string). Missing or empty: [].
export function filterValues(value) {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

// The browse filters a query string asks for, each a list of values some recipe uses. A filter
// with several values repeats its parameter: ?course=Appetizer&course=Side. Matching ignores
// case and returns the recipe's spelling, so the URL can be rewritten to it. Unknown parameters,
// unused or empty values, and repeats are dropped; a filter with no values left is left out.
function browseFiltersFromQuery(recipes, query) {
  const params = new URLSearchParams(query);
  const filters = {};
  for (const [param, field] of Object.entries(BROWSE_FILTERS)) {
    const values = [];
    for (const raw of params.getAll(param)) {
      const wanted = raw.trim().toLowerCase();
      if (!wanted) continue;
      const match = recipes.find(
        (r) => typeof r[field] === 'string' && r[field].toLowerCase() === wanted,
      );
      if (match && !values.includes(match[field])) values.push(match[field]);
    }
    if (values.length > 0) filters[param] = values;
  }
  return filters;
}

// The recipe the current URL hash points at, or null if it matches none or is reserved.
export function recipeFromHash(recipes, hash = window.location.hash) {
  const slug = slugFromHash(hash);
  if (!slug || RESERVED_SLUGS.includes(slug)) return null;
  return recipes.find((r) => r.id === slug) ?? null;
}

// What the hash asks to show: { page: 'browse', course?, method?, by? } (each a list of values), { page: 'suggest' },
// { page: 'pick' }, { page: 'change', recipe }, { page: 'recipe', recipe }, or null. Plain
// #/browse is { page: 'browse' }; filter keys appear only when set. A change page for a recipe
// that doesn't exist is null, like any unknown link.
export function viewFromHash(recipes, hash = window.location.hash) {
  if (slugFromHash(hash) === 'suggest') return { page: 'suggest' };
  if (slugFromHash(hash) === 'pick') return { page: 'pick' };
  if (slugFromHash(hash) === CHANGE_SLUG) {
    const id = new URLSearchParams(splitHash(hash)[1]).get('recipe');
    const recipe = recipes.find((r) => r.id === id);
    return recipe ? { page: 'change', recipe } : null;
  }
  if (slugFromHash(hash) === 'browse') {
    return { page: 'browse', ...browseFiltersFromQuery(recipes, splitHash(hash)[1]) };
  }
  const recipe = recipeFromHash(recipes, hash);
  return recipe ? { page: 'recipe', recipe } : null;
}

// The hash for a view. Browse filters go in a query, in BROWSE_FILTERS order, each value of a
// filter in the order given: #/browse?course=Appetizer&course=Side&method=Oven&by=Sharmi
export function hashForView(view) {
  if (view.page === 'suggest') return SUGGEST_HASH;
  if (view.page === 'pick') return PICK_HASH;
  if (view.page === 'change') return changeHashFor(view.recipe);
  if (view.page !== 'browse') return hashFor(view.recipe);
  const params = new URLSearchParams();
  for (const param of Object.keys(BROWSE_FILTERS)) {
    for (const value of filterValues(view[param])) params.append(param, value);
  }
  const query = params.toString();
  return query ? `${BROWSE_HASH}?${query}` : BROWSE_HASH;
}
