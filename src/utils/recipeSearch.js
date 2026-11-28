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
  const parts = [recipe.name, recipe.course, recipe.cookingMethod];
  for (const field of GROUP_FIELDS) {
    for (const group of recipe[field] ?? []) parts.push(group.title, ...(group.items ?? []));
  }
  return fold(parts.filter((part) => typeof part === 'string').join('\n'));
}

// Case- and accent-insensitive substring match against the name, course, cooking method,
// group titles, and every ingredient, step, and note. An empty query matches nothing.
export function matchesQuery(recipe, query) {
  const q = fold(query).trim();
  return q !== '' && searchableText(recipe).includes(q);
}

// Where the query appears in the text, ignoring case and accents, as [start, end] positions in
// the original text (for highlighting), or null. Folding can change a string's length ("é" is
// two characters once its accent is split off), so it maps each folded character back to the
// original character it came from.
export function findMatch(text, query) {
  const needle = fold(query).trim();
  if (!needle) return null;
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
  const at = folded.indexOf(needle);
  if (at === -1) return null;
  const last = origin[at + needle.length - 1];
  // End after the whole original character holding the match's last folded character
  const end = origin.find((o) => o > last) ?? source.length;
  return [origin[at], end];
}
