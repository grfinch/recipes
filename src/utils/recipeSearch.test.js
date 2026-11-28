import { describe, expect, it } from 'vitest';
import { findMatch, matchesQuery } from './recipeSearch';

const stew = {
  id: 'lentil-stew',
  name: 'Lentil Stew',
  course: 'Dinner',
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
    expect(matchesQuery(stew, 'dinner')).toBe(true);
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

  it('ignores accents in the recipe and the query', () => {
    expect(matchesQuery(stew, 'saute')).toBe(true);
    expect(matchesQuery(stew, 'SAUTE')).toBe(true);
    expect(matchesQuery({ ...stew, name: 'Café Rio Salad' }, 'cafe rio')).toBe(true);
    expect(matchesQuery(stew, 'lëntil')).toBe(true);
  });
});

describe('findMatch', () => {
  it('finds the match in the original text, ignoring case', () => {
    expect(findMatch('Lentil Stew', 'STEW')).toEqual([7, 11]);
    expect(findMatch('Lentil Stew', 'soup')).toBeNull();
    expect(findMatch('Lentil Stew', '  ')).toBeNull();
  });

  it('covers accented letters, whether or not the query has them', () => {
    expect(findMatch('Café Rio', 'cafe')).toEqual([0, 4]);
    expect(findMatch('Creamy Jalapeño Ranch', 'jalapeno')).toEqual([7, 15]);
    // An accent stored as a separate combining mark (NFD: "e" then the accent) stays with its
    // letter, so the highlight never splits them
    const decomposed = 'Café Rio'.normalize('NFD');
    expect(findMatch(decomposed, 'cafe')).toEqual([0, 5]);
    expect(findMatch(decomposed, 'rio')).toEqual([6, 9]);
  });
});
