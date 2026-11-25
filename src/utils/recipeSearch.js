const GROUP_FIELDS = ['ingredients', 'instructions', 'notes'];

// Everything a search can match, one piece per line, so a query can't match across the end
// of one ingredient and the start of the next (e.g. "oil" + "1 carrot" as "oil 1").
export function searchableText(recipe) {
  const parts = [recipe.name, recipe.course, recipe.cookingMethod];
  for (const field of GROUP_FIELDS) {
    for (const group of recipe[field] ?? []) parts.push(group.title, ...(group.items ?? []));
  }
  return parts
    .filter((part) => typeof part === 'string')
    .join('\n')
    .toLowerCase();
}

// Case-insensitive substring match against the name, course, cooking method, group titles,
// and every ingredient, step, and note. An empty query matches nothing.
export function matchesQuery(recipe, query) {
  const q = String(query ?? '')
    .trim()
    .toLowerCase();
  return q !== '' && searchableText(recipe).includes(q);
}
