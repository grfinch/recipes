// Recipes are addressed by a hash like #/instant-pot-lentil-stew. A hash works under the
// GitHub Pages sub-path without a router or server rewrites, and needs no base URL.

// Hashes for app pages rather than recipes. They are checked before any recipe lookup, so a
// recipe whose name slugifies to one of these (say, "Browse") can't take over the page.
export const BROWSE_HASH = '#/browse';
export const RESERVED_SLUGS = ['browse'];

export function slugify(name) {
  return String(name)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // drop accents: "sauté" -> "saute"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function hashFor(recipe) {
  return `#/${slugify(recipe.name)}`;
}

function slugFromHash(hash) {
  try {
    return decodeURIComponent(hash.replace(/^#\/?/, ''));
  } catch {
    return null; // malformed percent-encoding
  }
}

// The recipe the current URL hash points at, or null if it matches none or is reserved.
export function recipeFromHash(recipes, hash = window.location.hash) {
  const slug = slugFromHash(hash);
  if (!slug || RESERVED_SLUGS.includes(slug)) return null;
  return recipes.find((r) => slugify(r.name) === slug) ?? null;
}

// What the hash asks to show: { page: 'browse' }, { page: 'recipe', recipe }, or null.
export function viewFromHash(recipes, hash = window.location.hash) {
  if (slugFromHash(hash) === 'browse') return { page: 'browse' };
  const recipe = recipeFromHash(recipes, hash);
  return recipe ? { page: 'recipe', recipe } : null;
}

export function hashForView(view) {
  return view.page === 'browse' ? BROWSE_HASH : hashFor(view.recipe);
}
