import { describe, expect, it } from 'vitest';
import { filterOptions, matchesFilters } from './recipeFilters';

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
});
