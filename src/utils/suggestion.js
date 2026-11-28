// The "Suggest a recipe" form's fields and rules. Shared by the page (src/components/suggest/)
// and the relay that turns a suggestion into a GitHub issue (relay/), so both enforce the same
// limits. Plain data and functions only: no DOM, no React.

// Where visitors can suggest things themselves when this copy has no relay
export const ISSUES_URL = 'https://github.com/grfinch/recipes/issues/new';

export const FIELDS = [
  { name: 'name', label: 'Recipe name', required: true, max: 120 },
  { name: 'ingredients', label: 'Ingredients', required: true, max: 10000 },
  { name: 'steps', label: 'Steps', required: true, max: 10000 },
  { name: 'course', label: 'Course', max: 40 },
  { name: 'cookingMethod', label: 'Cooking method', max: 40 },
  { name: 'notes', label: 'Tips, swaps, or servings', max: 5000 },
  { name: 'source', label: "Where it's from", max: 300 },
  { name: 'submitter', label: 'Your name', required: true, missing: 'Enter your name.', max: 80 },
];

export const EMPTY_SUGGESTION = Object.fromEntries(FIELDS.map((f) => [f.name, '']));

// { fieldName: message } for each problem; empty when the suggestion can be sent.
export function validateSuggestion(values) {
  const errors = {};
  for (const { name, label, required, missing, max } of FIELDS) {
    const value = typeof values?.[name] === 'string' ? values[name] : '';
    if (required && value.trim() === '') {
      errors[name] = missing ?? `Enter the ${label.toLowerCase()}.`;
    } else if (value.length > max) {
      errors[name] =
        `${label} is too long: ${value.length.toLocaleString('en-US')} characters, ` +
        `and the limit is ${max.toLocaleString('en-US')}.`;
    }
  }
  return errors;
}

// Only the known fields, trimmed, so nothing else is sent.
export function cleanSuggestion(values) {
  return Object.fromEntries(
    FIELDS.map(({ name }) => [name, typeof values?.[name] === 'string' ? values[name].trim() : '']),
  );
}

// The suggestion as plain text, for "Copy my recipe" when sending fails.
export function suggestionAsText(values) {
  return FIELDS.filter(({ name }) => values?.[name]?.trim())
    .map(({ name, label }) => `${label}:\n${values[name].trim()}`)
    .join('\n\n');
}
