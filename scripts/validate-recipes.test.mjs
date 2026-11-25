import { describe, expect, it } from 'vitest';
import categories from '../src/recipeCategories.json';
import { loadRecipeFiles, validateRecipes } from './validate-recipes.mjs';

const valid = (overrides = {}) => ({
  id: 'lentil-stew',
  name: 'Lentil Stew',
  course: 'Main',
  cookingMethod: 'Instant-pot',
  ingredients: [['1 Tbsp olive oil'], ['1 cup lentils']],
  instructions: ['Heat the oil', '---', 'Simmer'],
  notes: ['Freezes well.'],
  ...overrides,
});

// Each recipe as if it were saved in its own correctly named file
const check = (...recipes) =>
  validateRecipes(
    recipes.map((recipe) => ({ file: `${recipe.id}.json`, recipe })),
    categories,
  );
const expectError = (errors, pattern) =>
  expect(
    errors.some((e) => pattern.test(e)),
    errors.join('\n'),
  ).toBe(true);

describe('validateRecipes', () => {
  it('accepts the real recipe files', () => {
    const entries = loadRecipeFiles();
    expect(entries.length).toBeGreaterThan(0);
    expect(validateRecipes(entries, categories)).toEqual([]);
  });

  it('accepts a well-formed recipe, with or without notes', () => {
    const { notes: _notes, ...noNotes } = valid();
    expect(check(valid())).toEqual([]);
    expect(check({ ...noNotes, id: 'other', name: 'Other' })).toEqual([]);
  });

  it('reports a file that is not valid JSON', () => {
    expectError(validateRecipes([{ file: 'x.json', error: 'bad' }], categories), /not valid JSON/);
  });

  it('rejects unknown fields, such as typos', () => {
    expectError(check(valid({ instruction: [] })), /unknown field "instruction"/);
  });

  it('requires an id that matches its file name', () => {
    expectError(check(valid({ id: undefined })), /\.id: must be a non-empty string/);
    expectError(check(valid({ id: 'Lentil Stew' })), /lowercase letters, digits, and dashes/);
    const misnamed = [{ file: 'lentils.json', recipe: valid() }];
    expectError(validateRecipes(misnamed, categories), /must match the file name/);
  });

  it('rejects duplicate ids and duplicate names', () => {
    const dupId = [
      { file: 'lentil-stew.json', recipe: valid() },
      { file: 'lentil-stew.json', recipe: valid({ name: 'Other' }) },
    ];
    expectError(validateRecipes(dupId, categories), /same id as lentil-stew\.json/);
    expectError(
      check(valid(), valid({ id: 'stew-2', name: 'lentil stew' })),
      /same name as lentil-stew\.json/,
    );
  });

  it('rejects ids reserved for an app view', () => {
    expectError(check(valid({ id: 'browse', name: 'Browse' })), /reserved/);
  });

  it('rejects categories not in recipeCategories.json', () => {
    expectError(check(valid({ course: 'Entree' })), /course: "Entree" is not in/);
    expectError(check(valid({ cookingMethod: 'Instant Pot' })), /cookingMethod: "Instant Pot"/);
  });

  it('rejects flat or empty ingredient groups and separator items in them', () => {
    expectError(check(valid({ ingredients: ['1 egg'] })), /ingredients\[0\]: must be/);
    expectError(check(valid({ ingredients: [[]] })), /ingredients\[0\]: must be/);
    expectError(check(valid({ ingredients: [['1 egg', '---']] })), /starts with "-"/);
  });

  it('rejects separators that leave an empty group', () => {
    expectError(check(valid({ instructions: ['---', 'Simmer'] })), /empty group/);
    expectError(check(valid({ instructions: ['Heat', '---', '---', 'Simmer'] })), /empty group/);
    expectError(check(valid({ notes: ['Tip', '---'] })), /notes\[1\].*empty group/);
  });

  it('rejects odd separators, blank strings, and stray spaces', () => {
    expectError(check(valid({ instructions: ['Heat', '- -', 'Simmer'] })), /exactly "---"/);
    expectError(check(valid({ instructions: ['Heat', ''] })), /non-empty string/);
    expectError(check(valid({ name: ' Lentil Stew' })), /leading or trailing spaces/);
  });

  it('requires at least one instruction step', () => {
    expectError(check(valid({ instructions: [] })), /at least one item/);
  });
});
