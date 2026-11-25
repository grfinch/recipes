import { describe, expect, it } from 'vitest';
import categories from '../src/recipeCategories.json';
import { loadRecipeFiles, validateRecipes } from './validate-recipes.mjs';

const valid = (overrides = {}) => ({
  id: 'lentil-stew',
  name: 'Lentil Stew',
  course: 'Dinner',
  cookingMethod: 'Instant-pot',
  ingredients: [{ title: 'Sauté', items: ['1 Tbsp olive oil'] }, { items: ['1 cup lentils'] }],
  instructions: [{ items: ['Heat the oil'] }, { items: ['Simmer'] }],
  notes: [{ items: ['Freezes well.'] }],
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

  it('requires non-empty ingredient and instruction groups', () => {
    expectError(check(valid({ ingredients: [] })), /ingredients: must be a non-empty array/);
    expectError(check(valid({ instructions: undefined })), /instructions: must be a non-empty/);
    expectError(check(valid({ notes: [] })), /notes: must be a non-empty array/);
  });

  it('rejects groups in the old formats', () => {
    expectError(check(valid({ ingredients: [['1 egg']] })), /must be a group object/);
    expectError(
      check(valid({ instructions: ['Heat', '---', 'Simmer'] })),
      /must be a group object/,
    );
  });

  it('checks each group: items, title, and unknown fields', () => {
    expectError(check(valid({ ingredients: [{ title: 'Dry' }] })), /items: must be a non-empty/);
    expectError(check(valid({ ingredients: [{ items: [] }] })), /items: must be a non-empty/);
    expectError(check(valid({ ingredients: [{ title: '', items: ['1 egg'] }] })), /title: must be/);
    expectError(
      check(valid({ ingredients: [{ name: 'Dry', items: ['1 egg'] }] })),
      /unknown field "name"/,
    );
  });

  it('rejects leftover "---" separators, blank items, and stray spaces', () => {
    expectError(check(valid({ instructions: [{ items: ['Heat', '---'] }] })), /isn't a separator/);
    expectError(check(valid({ instructions: [{ items: ['Heat', ''] }] })), /non-empty string/);
    expectError(check(valid({ name: ' Lentil Stew' })), /leading or trailing spaces/);
  });
});
