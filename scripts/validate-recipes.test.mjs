import { describe, expect, it } from 'vitest';
import recipesData from '../src/recipes.json';
import categories from '../src/recipeCategories.json';
import { validateRecipes } from './validate-recipes.mjs';

const valid = () => ({
  name: 'Lentil Stew',
  course: 'Main',
  cookingMethod: 'Instant-pot',
  ingredients: [['1 Tbsp olive oil'], ['1 cup lentils']],
  instructions: ['Heat the oil', '---', 'Simmer'],
  notes: ['Freezes well.'],
});

const check = (...recipes) => validateRecipes({ recipes }, categories);
const expectError = (errors, pattern) =>
  expect(
    errors.some((e) => pattern.test(e)),
    errors.join('\n'),
  ).toBe(true);

describe('validateRecipes', () => {
  it('accepts the real recipes.json', () => {
    expect(validateRecipes(recipesData, categories)).toEqual([]);
  });

  it('accepts a well-formed recipe, with or without notes', () => {
    const { notes: _notes, ...noNotes } = valid();
    expect(check(valid())).toEqual([]);
    expect(check({ ...noNotes, name: 'Other' })).toEqual([]);
  });

  it('rejects a missing recipes array', () => {
    expectError(validateRecipes({}, categories), /"recipes" array/);
  });

  it('rejects unknown fields, such as typos', () => {
    expectError(check({ ...valid(), instruction: [] }), /unknown field "instruction"/);
  });

  it('rejects duplicate names and names that share a link', () => {
    expectError(check(valid(), { ...valid(), name: 'lentil stew' }), /same name as recipes\[0\]/);
    expectError(
      check(valid(), { ...valid(), name: 'Lentil-Stew!' }),
      /same link \(#\/lentil-stew\)/,
    );
  });

  it('rejects names whose link is reserved for an app view', () => {
    expectError(check({ ...valid(), name: 'Browse' }), /reserved/);
  });

  it('rejects categories not in recipeCategories.json', () => {
    expectError(check({ ...valid(), course: 'Entree' }), /course: "Entree" is not in/);
    expectError(
      check({ ...valid(), cookingMethod: 'Instant Pot' }),
      /cookingMethod: "Instant Pot"/,
    );
  });

  it('rejects flat or empty ingredient groups and separator items in them', () => {
    expectError(check({ ...valid(), ingredients: ['1 egg'] }), /ingredients\[0\]: must be/);
    expectError(check({ ...valid(), ingredients: [[]] }), /ingredients\[0\]: must be/);
    expectError(check({ ...valid(), ingredients: [['1 egg', '---']] }), /starts with "-"/);
  });

  it('rejects separators that leave an empty group', () => {
    expectError(check({ ...valid(), instructions: ['---', 'Simmer'] }), /empty group/);
    expectError(
      check({ ...valid(), instructions: ['Heat', '---', '---', 'Simmer'] }),
      /empty group/,
    );
    expectError(check({ ...valid(), notes: ['Tip', '---'] }), /notes\[1\].*empty group/);
  });

  it('rejects odd separators, blank strings, and stray spaces', () => {
    expectError(check({ ...valid(), instructions: ['Heat', '- -', 'Simmer'] }), /exactly "---"/);
    expectError(check({ ...valid(), instructions: ['Heat', ''] }), /non-empty string/);
    expectError(check({ ...valid(), name: ' Lentil Stew' }), /leading or trailing spaces/);
  });

  it('requires at least one instruction step', () => {
    expectError(check({ ...valid(), instructions: [] }), /at least one item/);
  });
});
