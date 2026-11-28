const GROUP_FIELDS = ['ingredients', 'instructions', 'notes'];

// Lowercase without accents, so "saute" finds "Sauté" and "jalapeno" finds "Jalapeño". People
// rarely type accents, least of all on a phone keyboard.
export function fold(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// Everything a search can match, one piece per line, so a query can't match across the end
// of one ingredient and the start of the next (e.g. "oil" + "1 carrot" as "oil 1").
export function searchableText(recipe) {
  const parts = [recipe.name, recipe.course, recipe.cookingMethod, recipe.contributor];
  for (const field of GROUP_FIELDS) {
    for (const group of recipe[field] ?? []) parts.push(group.title, ...(group.items ?? []));
  }
  return fold(parts.filter((part) => typeof part === 'string').join('\n'));
}

// The query's words, folded: "Chicken  rice" -> ['chicken', 'rice'].
export function queryWords(query) {
  return fold(query).split(/\s+/).filter(Boolean);
}

// Whether the recipe has every word of the query, ignoring case and accents. Each word is a
// substring match against the name, course, cooking method, contributor, group titles, or one
// ingredient, step, or note; different words may match different items, so "chicken rice" finds a recipe
// with chicken in one line and rice in another. An empty query matches nothing.
export function matchesQuery(recipe, query) {
  const words = queryWords(query);
  if (words.length === 0) return false;
  const text = searchableText(recipe);
  return words.every((word) => text.includes(word));
}

// The recipes matching the query, best first: those with more of the query's words in their
// name come first, so "chicken" lists Chicken Enchiladas before a soup that uses chicken stock.
// Ties keep the order given (App's list is sorted by name).
export function searchRecipes(recipes, query) {
  const words = queryWords(query);
  const nameWords = (recipe) => {
    const name = fold(recipe.name);
    return words.filter((word) => name.includes(word)).length;
  };
  return recipes
    .filter((recipe) => matchesQuery(recipe, query))
    .map((recipe) => ({ recipe, score: nameWords(recipe) }))
    .sort((a, b) => b.score - a.score)
    .map(({ recipe }) => recipe);
}

// Why a result matched, when its name doesn't say: the recipe line with the most of the query's
// words that aren't in the name, as a short snippet. Ingredients come first, then steps, notes,
// group titles, course, cooking method and contributor ("Shared by Sharmi"); ties go to the
// earliest line. Null when the name has every word.
export function matchContext(recipe, query, maxLength = 80) {
  const name = fold(recipe.name);
  const missing = queryWords(query).filter((word) => !name.includes(word));
  if (missing.length === 0) return null;
  const lines = [
    ...GROUP_FIELDS.flatMap((field) => (recipe[field] ?? []).flatMap((g) => g.items ?? [])),
    ...GROUP_FIELDS.flatMap((field) => (recipe[field] ?? []).map((g) => g.title)),
    recipe.course,
    recipe.cookingMethod,
    recipe.contributor && `Shared by ${recipe.contributor}`,
  ].filter((line) => typeof line === 'string');
  let best = null;
  let bestCount = 0;
  for (const line of lines) {
    const folded = fold(line);
    const count = missing.filter((word) => folded.includes(word)).length;
    if (count > bestCount) [best, bestCount] = [line, count];
  }
  return best === null ? null : snippet(best, missing, maxLength);
}

// A long line trimmed to about maxLength characters around its first match, cut at spaces,
// with "…" where text was dropped.
function snippet(line, words, maxLength) {
  if (line.length <= maxLength) return line;
  const first = matchRanges(line, words.join(' '))[0]?.[0] ?? 0;
  let start = 0;
  if (first > maxLength / 2) {
    start = line.lastIndexOf(' ', first - 20) + 1;
  }
  let text = line.slice(start);
  if (text.length > maxLength) {
    const cut = text.lastIndexOf(' ', maxLength);
    text = text.slice(0, cut > 0 ? cut : maxLength) + '…';
  }
  return (start > 0 ? '…' : '') + text;
}

// Where each word of the query appears in the text, ignoring case and accents, as sorted,
// non-overlapping [start, end] positions in the original text (for highlighting). Folding can
// change a string's length ("é" is two characters once its accent is split off), so it maps
// each folded character back to the original character it came from.
export function matchRanges(text, query) {
  const source = String(text ?? '');
  let folded = '';
  const origin = []; // origin[i]: where folded[i] starts in the original text
  let pos = 0;
  for (const char of source) {
    const f = fold(char);
    for (let k = 0; k < f.length; k += 1) origin.push(pos);
    folded += f;
    pos += char.length;
  }
  origin.push(source.length);

  const ranges = [];
  for (const word of queryWords(query)) {
    const at = folded.indexOf(word);
    if (at === -1) continue;
    const last = origin[at + word.length - 1];
    // End after the whole original character holding the match's last folded character
    ranges.push([origin[at], origin.find((o) => o > last) ?? source.length]);
  }

  // Merge overlaps, so "pan pancake" highlights "Pancake" once
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [start, end] of ranges) {
    const prev = merged[merged.length - 1];
    if (prev && start <= prev[1]) prev[1] = Math.max(prev[1], end);
    else merged.push([start, end]);
  }
  return merged;
}
