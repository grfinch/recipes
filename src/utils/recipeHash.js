// Recipes are addressed by a hash like #/instant-pot-lentil-stew. A hash works under the
// GitHub Pages sub-path without a router or server rewrites, and needs no base URL.

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

// The recipe the current URL hash points at, or null if it matches none.
export function recipeFromHash(recipes, hash = window.location.hash) {
  let slug;
  try {
    slug = decodeURIComponent(hash.replace(/^#\/?/, ''));
  } catch {
    return null; // malformed percent-encoding
  }
  if (!slug) return null;
  return recipes.find((r) => slugify(r.name) === slug) ?? null;
}
