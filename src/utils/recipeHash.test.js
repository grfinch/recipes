import { describe, expect, it } from 'vitest';
import { hashFor, recipeFromHash, slugify } from './recipeHash';

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
});
