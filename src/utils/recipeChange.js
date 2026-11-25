// The "Suggest a change" form's fields and rules: a visitor's fix, improvement or tip for an
// existing recipe. Shared by the page (src/components/suggest/SuggestChange.jsx) and the relay
// that turns it into a GitHub issue (relay/), so both enforce the same limits. Plain data and
// functions only: no DOM, no React, no JSON imports (the relay bundles this file).

// The kinds of change, in the order the form lists them. The value is what the relay posts.
export const CHANGE_KINDS = [
  { value: 'fix', label: 'Something is wrong' },
  { value: 'improvement', label: 'An improvement' },
  { value: 'tip', label: 'A tip or variation' },
];

export const CHANGE_FIELDS = [
  { name: 'kind', label: 'What kind of change', required: true, max: 20 },
  { name: 'details', label: 'Your suggestion', required: true, max: 5000 },
  { name: 'submitter', label: 'Your name', max: 80 },
];

export const EMPTY_CHANGE = { kind: 'improvement', details: '', submitter: '' };

// Same rule as a recipe file's id (scripts/validate-recipes.mjs). The relay puts it in the
// issue title and a link, so it must never carry anything else.
const RECIPE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const MAX_RECIPE_ID = 100;

export function isRecipeId(value) {
  return typeof value === 'string' && value.length <= MAX_RECIPE_ID && RECIPE_ID.test(value);
}

// { fieldName: message } for each problem; empty when the change can be sent. recipeId isn't
// typed by the visitor, so its message is for the relay's logs and tests, not the form.
export function validateChange(values) {
  const errors = {};
  if (!isRecipeId(values?.recipeId)) errors.recipeId = 'Unknown recipe.';
  for (const { name, label, required, max } of CHANGE_FIELDS) {
    const value = typeof values?.[name] === 'string' ? values[name] : '';
    if (required && value.trim() === '') {
      errors[name] = name === 'kind' ? 'Choose what kind of change.' : 'Enter your suggestion.';
    } else if (name === 'kind' && !CHANGE_KINDS.some((k) => k.value === value)) {
      errors[name] = 'Choose what kind of change.';
    } else if (value.length > max) {
      errors[name] =
        `${label} is too long: ${value.length.toLocaleString('en-US')} characters, ` +
        `and the limit is ${max.toLocaleString('en-US')}.`;
    }
  }
  return errors;
}

// Only the known fields, trimmed, so nothing else is sent.
export function cleanChange(values) {
  return {
    recipeId: typeof values?.recipeId === 'string' ? values.recipeId.trim() : '',
    ...Object.fromEntries(
      CHANGE_FIELDS.map(({ name }) => [
        name,
        typeof values?.[name] === 'string' ? values[name].trim() : '',
      ]),
    ),
  };
}

export function changeKindLabel(value) {
  return CHANGE_KINDS.find((k) => k.value === value)?.label ?? value;
}
