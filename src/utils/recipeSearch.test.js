import { describe, expect, it } from 'vitest';
import { matchesQuery } from './recipeSearch';

const stew = {
  id: 'lentil-stew',
  name: 'Lentil Stew',
  course: 'Main',
  cookingMethod: 'Instant-pot',
  ingredients: [
    { title: 'Sauté', items: ['1 Tbsp olive oil', '1 carrot'] },
    { items: ['1.5 cups brown lentils'] },
  ],
  instructions: [{ items: ['Pressure cook on high'] }],
  notes: [{ items: ['Freezes well'] }],
};

describe('matchesQuery', () => {
  it('matches the name, any item, and group titles, ignoring case', () => {
    expect(matchesQuery(stew, 'LENTIL stew')).toBe(true);
    expect(matchesQuery(stew, 'carrot')).toBe(true);
    expect(matchesQuery(stew, 'pressure cook')).toBe(true);
    expect(matchesQuery(stew, 'freezes')).toBe(true);
    expect(matchesQuery(stew, 'sauté')).toBe(true);
  });

  it('matches course and cooking method', () => {
    expect(matchesQuery(stew, 'main')).toBe(true);
    expect(matchesQuery(stew, 'instant-pot')).toBe(true);
  });

  it("doesn't match across two items", () => {
    expect(matchesQuery(stew, 'oil 1')).toBe(false);
    expect(matchesQuery(stew, 'oil,1')).toBe(false);
  });

  it('matches nothing for an empty or unknown query', () => {
    expect(matchesQuery(stew, '   ')).toBe(false);
    expect(matchesQuery(stew, 'pancakes')).toBe(false);
  });

  it('copes with a recipe that has no notes', () => {
    const { notes: _notes, ...noNotes } = stew;
    expect(matchesQuery(noNotes, 'lentils')).toBe(true);
  });
});
