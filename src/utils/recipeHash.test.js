import { describe, expect, it } from 'vitest';
import recipesData from '../recipes.json';
import {
  BROWSE_HASH,
  RESERVED_SLUGS,
  hashFor,
  hashForView,
  recipeFromHash,
  slugify,
  viewFromHash,
} from './recipeHash';

const recipes = [{ name: 'Instant-pot Lentil Stew' }, { name: 'Crème Brûlée' }];

describe('recipeHash', () => {
  it('turns names into readable slugs', () => {
    expect(slugify('Instant-pot Lentil Stew')).toBe('instant-pot-lentil-stew');
    expect(slugify('  Mac & Cheese!! ')).toBe('mac-cheese');
    expect(slugify('Crème Brûlée')).toBe('creme-brulee');
  });

  it('round-trips a recipe through its hash', () => {
    expect(hashFor(recipes[1])).toBe('#/creme-brulee');
    expect(recipeFromHash(recipes, '#/creme-brulee')).toBe(recipes[1]);
  });

  it('returns null for empty, unknown, or malformed hashes', () => {
    expect(recipeFromHash(recipes, '')).toBeNull();
    expect(recipeFromHash(recipes, '#/')).toBeNull();
    expect(recipeFromHash(recipes, '#/pancakes')).toBeNull();
    expect(recipeFromHash(recipes, '#/%E0%A4%A')).toBeNull();
  });

  it('reads the browse page from the hash', () => {
    expect(viewFromHash(recipes, '#/browse')).toEqual({ page: 'browse' });
    expect(viewFromHash(recipes, '#/creme-brulee')).toEqual({ page: 'recipe', recipe: recipes[1] });
    expect(viewFromHash(recipes, '#/pancakes')).toBeNull();
    expect(hashForView({ page: 'browse' })).toBe(BROWSE_HASH);
    expect(hashForView({ page: 'recipe', recipe: recipes[1] })).toBe('#/creme-brulee');
  });

  it('never lets a recipe take a reserved page hash', () => {
    const withBrowse = [...recipes, { name: 'Browse' }];
    expect(recipeFromHash(withBrowse, '#/browse')).toBeNull();
    expect(viewFromHash(withBrowse, '#/browse')).toEqual({ page: 'browse' });
  });

  it('has no real recipe whose slug is reserved', () => {
    const clashes = recipesData.recipes.filter((r) => RESERVED_SLUGS.includes(slugify(r.name)));
    expect(clashes.map((r) => r.name)).toEqual([]);
  });
});
