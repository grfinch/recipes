import { describe, expect, it } from 'vitest';
import { matchContext, matchRanges, matchesQuery, searchRecipes } from './recipeSearch';

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

  it('needs every word, but each word may match a different item', () => {
    expect(matchesQuery(stew, 'carrot lentils')).toBe(true);
    expect(matchesQuery(stew, 'lentil   dinner')).toBe(true);
    expect(matchesQuery(stew, 'lentil soup')).toBe(false);
  });

  it("doesn't match one word across two items", () => {
    // "oil" ends one ingredient and "1" starts the next; "oil,1" is one word
    expect(matchesQuery(stew, 'oil,1')).toBe(false);
    expect(matchesQuery(stew, 'oil,1 carrot')).toBe(false);
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

describe('searchRecipes', () => {
  const soup = {
    id: 'potato-soup',
    name: 'Baked Potato Soup',
    ingredients: [{ items: ['4 cups chicken stock'] }],
    instructions: [{ items: ['Simmer'] }],
  };
  const enchiladas = {
    id: 'chicken-enchiladas',
    name: 'Chicken Enchiladas',
    ingredients: [{ items: ['2 cups chicken'] }],
    instructions: [{ items: ['Bake'] }],
  };
  const friedRice = {
    id: 'chicken-fried-rice',
    name: 'Chicken Fried Rice',
    ingredients: [{ items: ['1 cup rice', '1 cup chicken'] }],
    instructions: [{ items: ['Fry'] }],
  };
  const byName = [soup, enchiladas, friedRice, stew];

  it('lists recipes with the words in their name first, keeping the given order otherwise', () => {
    expect(searchRecipes(byName, 'chicken').map((r) => r.id)).toEqual([
      'chicken-enchiladas',
      'chicken-fried-rice',
      'potato-soup',
    ]);
  });

  it('ranks by how many of the words are in the name', () => {
    const soupWithRice = { ...soup, ingredients: [{ items: ['chicken stock', 'rice'] }] };
    expect(
      searchRecipes([soupWithRice, enchiladas, friedRice], 'chicken rice').map((r) => r.id),
    ).toEqual(['chicken-fried-rice', 'potato-soup']);
  });

  it('returns nothing for an empty query', () => {
    expect(searchRecipes(byName, ' ')).toEqual([]);
  });
});

describe('matchContext', () => {
  it('is null when the name has every word', () => {
    expect(matchContext(stew, 'lentil')).toBeNull();
    expect(matchContext(stew, 'stew LENTIL')).toBeNull();
  });

  it('gives the line with the words the name lacks, ingredients first', () => {
    expect(matchContext(stew, 'carrot')).toBe('1 carrot');
    expect(matchContext(stew, 'lentil pressure')).toBe('Pressure cook on high');
    expect(matchContext(stew, 'freezes')).toBe('Freezes well');
    expect(matchContext(stew, 'saute')).toBe('Sauté');
    expect(matchContext(stew, 'dinner')).toBe('Dinner');
    // "1" is in both ingredients; "oil" picks the line that has both words
    expect(matchContext(stew, '1 oil')).toBe('1 Tbsp olive oil');
  });

  it('trims a long line around the match', () => {
    const long = {
      ...stew,
      instructions: [
        {
          items: [
            'Heat the pot until it is very hot, then add the onions and cook for ten minutes, ' +
              'stirring now and then, until they turn golden brown and smell sweet and rich.',
          ],
        },
      ],
    };
    const text = matchContext(long, 'golden');
    expect(text.startsWith('…')).toBe(true);
    expect(text).toContain('golden');
    expect(text.length).toBeLessThanOrEqual(82);
    expect(matchContext(long, 'heat')).toMatch(/^Heat the pot .*…$/);
  });
});

describe('matchRanges', () => {
  it('finds each word in the original text, ignoring case', () => {
    expect(matchRanges('Lentil Stew', 'STEW')).toEqual([[7, 11]]);
    expect(matchRanges('Lentil Stew', 'stew lentil')).toEqual([
      [0, 6],
      [7, 11],
    ]);
    expect(matchRanges('Lentil Stew', 'soup')).toEqual([]);
    expect(matchRanges('Lentil Stew', '  ')).toEqual([]);
  });

  it('merges overlapping words', () => {
    expect(matchRanges('Pancakes', 'pan pancake')).toEqual([[0, 7]]);
    expect(matchRanges('Pancakes', 'panc cakes')).toEqual([[0, 8]]);
  });

  it('covers accented letters, whether or not the query has them', () => {
    expect(matchRanges('Café Rio', 'cafe')).toEqual([[0, 4]]);
    expect(matchRanges('Creamy Jalapeño Ranch', 'jalapeno')).toEqual([[7, 15]]);
    // An accent stored as a separate combining mark (NFD: "e" then the accent) stays with its
    // letter, so the highlight never splits them
    const decomposed = 'Café Rio'.normalize('NFD');
    expect(matchRanges(decomposed, 'cafe')).toEqual([[0, 5]]);
    expect(matchRanges(decomposed, 'rio')).toEqual([[6, 9]]);
  });
});
