import { describe, expect, it } from 'vitest';
import { ingredientTerms, linesUsing, pickRandom, usesAll } from './recipePick';

const recipe = {
  id: 'teriyaki',
  name: 'Teriyaki Chicken',
  ingredients: [
    { title: 'Chicken', items: ['8 chicken thighs', '1 bottle teriyaki sauce'] },
    { title: 'Rice', items: ['2 cups Jasmine rice', '1 potato', '3 eggs'] },
  ],
  instructions: [{ items: ['Add the garlic'] }],
};

describe('ingredientTerms', () => {
  it('splits on commas, trims, lowercases, and drops blanks and repeats', () => {
    expect(ingredientTerms(' Chicken, rice,, ,CHICKEN ')).toEqual(['chicken', 'rice']);
  });

  it('has no terms for an empty box', () => {
    expect(ingredientTerms('')).toEqual([]);
    expect(ingredientTerms(' , ')).toEqual([]);
    expect(ingredientTerms(undefined)).toEqual([]);
  });
});

describe('usesAll', () => {
  it('needs every term in some ingredient line, ignoring case', () => {
    expect(usesAll(recipe, ['chicken'])).toBe(true);
    expect(usesAll(recipe, ['CHICKEN', 'jasmine'])).toBe(true);
    expect(usesAll(recipe, ['chicken', 'beef'])).toBe(false);
  });

  it('matches the start of a word, not the middle', () => {
    expect(usesAll(recipe, ['thigh'])).toBe(true);
    expect(usesAll({ ingredients: [{ items: ['1 cup licorice'] }] }, ['rice'])).toBe(false);
  });

  it('matches plurals by their stem', () => {
    expect(usesAll(recipe, ['potatoes'])).toBe(true);
    expect(usesAll(recipe, ['egg'])).toBe(true);
    expect(usesAll(recipe, ['eggs'])).toBe(true);
    expect(usesAll({ ingredients: [{ items: ['1 cup basil'] }] }, ['bass'])).toBe(false);
  });

  it('looks only at ingredients, not steps', () => {
    expect(usesAll(recipe, ['garlic'])).toBe(false);
  });

  it('treats special characters as plain text', () => {
    expect(usesAll(recipe, ['(chicken'])).toBe(false);
    expect(usesAll({ ingredients: [{ items: ['1 c. milk'] }] }, ['c.'])).toBe(true);
  });

  it('accepts every recipe when there are no terms', () => {
    expect(usesAll(recipe, [])).toBe(true);
    expect(usesAll({ id: 'empty' }, [])).toBe(true);
  });
});

describe('linesUsing', () => {
  it('lists the ingredient lines that use any term, in order', () => {
    expect(linesUsing(recipe, ['rice', 'chicken'])).toEqual([
      '8 chicken thighs',
      '2 cups Jasmine rice',
    ]);
    expect(linesUsing(recipe, [])).toEqual([]);
  });
});

describe('pickRandom', () => {
  const a = { id: 'a' };
  const b = { id: 'b' };
  const c = { id: 'c' };

  it('picks by the random number', () => {
    expect(pickRandom([a, b, c], null, () => 0)).toBe(a);
    expect(pickRandom([a, b, c], null, () => 0.99)).toBe(c);
  });

  it('never repeats the current pick when there is another choice', () => {
    expect(pickRandom([a, b], a, () => 0)).toBe(b);
    expect(pickRandom([a, b], b, () => 0.99)).toBe(a);
  });

  it('repeats the only choice, and gives null for none', () => {
    expect(pickRandom([a], a, () => 0.5)).toBe(a);
    expect(pickRandom([], null, () => 0.5)).toBeNull();
  });
});
