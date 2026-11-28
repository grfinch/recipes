// Helpers for All recipes' "Ingredients you have" box and "Pick one for me" button: which
// recipes use the ingredients a visitor has on hand, and a random pick from them. Kept free of
// imports, because recipeHash.js uses it and scripts/validate-recipes.mjs imports that in Node.

// The ingredients typed into the box, split on commas: "Chicken, rice," -> ['chicken', 'rice'].
// Lowercase, trimmed, and without blanks or repeats.
export function ingredientTerms(text) {
  const terms = String(text ?? '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(terms)];
}

// A plural is matched by its stem, so "potatoes" finds "2 potatoes" and "1 potato", and "eggs"
// finds "1 egg". Words ending in "ss" ("bass") keep their ending, and so do short ones ("gas").
function stem(term) {
  return term.length > 3 && !term.endsWith('ss') ? term.replace(/e?s$/, '') : term;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Whether an ingredient line has a word starting with the term: "chicken" matches
// "8 chicken thighs", and "rice" doesn't match "licorice". Ignores case.
function lineUses(line, term) {
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(stem(term))}`, 'i').test(line);
}

function ingredientLines(recipe) {
  return (recipe.ingredients ?? []).flatMap((group) => group.items ?? []);
}

// The recipe's ingredient lines that use any of the terms, in recipe order.
export function linesUsing(recipe, terms) {
  return ingredientLines(recipe).filter((line) => terms.some((term) => lineUses(line, term)));
}

// Whether the recipe uses every term in at least one ingredient line. No terms: always true.
export function usesAll(recipe, terms) {
  const lines = ingredientLines(recipe);
  return terms.every((term) => lines.some((line) => lineUses(line, term)));
}

// A random recipe from the list, avoiding `avoid` (the current pick) when there's another
// choice, so "Pick another" always changes the answer. Null for an empty list.
export function pickRandom(recipes, avoid = null, random = Math.random) {
  const pool = recipes.length > 1 ? recipes.filter((r) => r !== avoid) : recipes;
  return pool[Math.floor(random() * pool.length)] ?? null;
}
