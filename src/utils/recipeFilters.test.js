import { describe, expect, it } from 'vitest';
import { filterOptions, groupByLetter, letterFor, matchesFilters } from './recipeFilters';

const recipes = [
  { id: 'a', name: 'A', course: 'Dessert', cookingMethod: 'Oven' },
  { id: 'b', name: 'B', course: 'Dinner', cookingMethod: 'Slow cooker' },
  { id: 'c', name: 'C', course: 'Breakfast', cookingMethod: 'Oven' },
  { id: 'd', name: 'D', course: 'Dinner', cookingMethod: 'Instant-pot' },
  { id: 'e', name: 'E' }, // no course or method
];

describe('filterOptions', () => {
  it('lists only values in use, once each, in recipeCategories.json order', () => {
    expect(filterOptions(recipes)).toEqual({
      course: ['Breakfast', 'Dinner', 'Dessert'],
      method: ['Instant-pot', 'Oven', 'Slow cooker'],
    });
  });

  it('puts values recipeCategories.json does not list last, A-Z', () => {
    const odd = [...recipes, { course: 'Picnic' }, { course: 'Brunch' }];
    expect(filterOptions(odd).course).toEqual([
      'Breakfast',
      'Dinner',
      'Dessert',
      'Brunch',
      'Picnic',
    ]);
  });

  it('has no options when there are no recipes', () => {
    expect(filterOptions([])).toEqual({ course: [], method: [] });
  });
});

describe('filterOptions: who shared it', () => {
  it('lists each contributor once, A-Z, skipping recipes with none', () => {
    const shared = [
      { contributor: 'Sharmi' },
      { contributor: 'Gaven' },
      {},
      { contributor: 'Sharmi' },
      { contributor: '' },
      { contributor: 'Kristen' },
    ];
    expect(filterOptions(shared).by).toEqual(['Gaven', 'Kristen', 'Sharmi']);
  });

  it('leaves the filter out when no recipe credits anyone', () => {
    expect(filterOptions(recipes)).not.toHaveProperty('by');
  });

  it('matches a recipe by its contributor', () => {
    expect(matchesFilters({ contributor: 'Gaven' }, { by: 'Gaven' })).toBe(true);
    expect(matchesFilters({ contributor: 'Gaven' }, { by: 'Sharmi' })).toBe(false);
    expect(matchesFilters({}, { by: 'Sharmi' })).toBe(false);
  });
});

describe('matchesFilters', () => {
  it('treats a missing filter as "All"', () => {
    expect(recipes.filter((r) => matchesFilters(r, {}))).toHaveLength(5);
    expect(recipes.filter((r) => matchesFilters(r, { course: undefined }))).toHaveLength(5);
  });

  it('matches course, method, and both', () => {
    const ids = (f) => recipes.filter((r) => matchesFilters(r, f)).map((r) => r.id);
    expect(ids({ course: 'Dinner' })).toEqual(['b', 'd']);
    expect(ids({ method: 'Oven' })).toEqual(['a', 'c']);
    expect(ids({ course: 'Dinner', method: 'Instant-pot' })).toEqual(['d']);
    expect(ids({ course: 'Dessert', method: 'Instant-pot' })).toEqual([]);
  });

  it('matches any chosen value within a filter, and every filter', () => {
    const ids = (f) => recipes.filter((r) => matchesFilters(r, f)).map((r) => r.id);
    expect(ids({ course: [] })).toHaveLength(5);
    expect(ids({ course: ['Dessert', 'Breakfast'] })).toEqual(['a', 'c']);
    expect(ids({ course: ['Dinner', 'Breakfast'], method: ['Oven', 'Slow cooker'] })).toEqual([
      'b',
      'c',
    ]);
  });
});

describe('letterFor', () => {
  it('files a name under its first letter, upper-cased and without accents', () => {
    expect(letterFor('apple crisp')).toBe('A');
    expect(letterFor('Éclairs')).toBe('E');
    expect(letterFor('  Zucchini bread')).toBe('Z');
  });

  it('files digits, symbols and other scripts under "#"', () => {
    expect(letterFor('7-layer dip')).toBe('#');
    expect(letterFor('"Best" brownies')).toBe('#');
    expect(letterFor('Ψωμί')).toBe('#');
    expect(letterFor('')).toBe('#');
  });
});

describe('groupByLetter', () => {
  it('puts "#" first, then A-Z, keeping the given order within each letter', () => {
    const named = ['10-minute soup', 'Apple crisp', 'Apricot jam', 'Banana bread', 'Éclairs'].map(
      (name) => ({ name }),
    );
    expect(groupByLetter(named)).toEqual([
      { letter: '#', recipes: [{ name: '10-minute soup' }] },
      { letter: 'A', recipes: [{ name: 'Apple crisp' }, { name: 'Apricot jam' }] },
      { letter: 'B', recipes: [{ name: 'Banana bread' }] },
      { letter: 'E', recipes: [{ name: 'Éclairs' }] },
    ]);
  });

  it('sorts letters even when the recipes arrive out of order', () => {
    const letters = groupByLetter([{ name: 'Z' }, { name: '1' }, { name: 'M' }, { name: 'A' }]).map(
      (s) => s.letter,
    );
    expect(letters).toEqual(['#', 'A', 'M', 'Z']);
  });

  it('has no sections when there are no recipes', () => {
    expect(groupByLetter([])).toEqual([]);
  });
});
