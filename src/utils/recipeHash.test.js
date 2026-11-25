import { describe, expect, it } from 'vitest';
import allRecipes from '../recipes/index.js';
import {
  BROWSE_HASH,
  RESERVED_SLUGS,
  SUGGEST_HASH,
  hashFor,
  hashForView,
  recipeFromHash,
  slugify,
  viewFromHash,
} from './recipeHash';

const recipes = [
  { id: 'instant-pot-lentil-stew', name: 'Instant-pot Lentil Stew' },
  { id: 'creme-brulee', name: 'Crème Brûlée' },
];

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

  it('links by id, so renaming a recipe keeps its link', () => {
    const renamed = { id: 'creme-brulee', name: 'Vanilla Crème Brûlée' };
    expect(hashFor(renamed)).toBe('#/creme-brulee');
    expect(recipeFromHash([renamed], '#/creme-brulee')).toBe(renamed);
    expect(recipeFromHash([renamed], '#/vanilla-creme-brulee')).toBeNull();
  });

  it('returns null for empty, unknown, or malformed hashes', () => {
    expect(recipeFromHash(recipes, '')).toBeNull();
    expect(recipeFromHash(recipes, '#/')).toBeNull();
    expect(recipeFromHash(recipes, '#/pancakes')).toBeNull();
    expect(recipeFromHash(recipes, '#/%E0%A4%A')).toBeNull();
  });

  it('reads the suggest page from the hash, even if a recipe is named Suggest', () => {
    const withSuggest = [...recipes, { id: 'suggest', name: 'Suggest' }];
    expect(viewFromHash(withSuggest, '#/suggest')).toEqual({ page: 'suggest' });
    expect(recipeFromHash(withSuggest, '#/suggest')).toBeNull();
    expect(hashForView({ page: 'suggest' })).toBe(SUGGEST_HASH);
    expect(RESERVED_SLUGS).toContain('suggest');
  });

  it('reads the browse page from the hash', () => {
    expect(viewFromHash(recipes, '#/browse')).toEqual({ page: 'browse' });
    expect(viewFromHash(recipes, '#/creme-brulee')).toEqual({ page: 'recipe', recipe: recipes[1] });
    expect(viewFromHash(recipes, '#/pancakes')).toBeNull();
    expect(hashForView({ page: 'browse' })).toBe(BROWSE_HASH);
    expect(hashForView({ page: 'recipe', recipe: recipes[1] })).toBe('#/creme-brulee');
  });

  it('never lets a recipe take a reserved page hash', () => {
    const withBrowse = [...recipes, { id: 'browse', name: 'Browse' }];
    expect(recipeFromHash(withBrowse, '#/browse')).toBeNull();
    expect(viewFromHash(withBrowse, '#/browse')).toEqual({ page: 'browse' });
  });

  it('has no real recipe whose slug is reserved', () => {
    const clashes = allRecipes.filter((r) => RESERVED_SLUGS.includes(r.id));
    expect(clashes.map((r) => r.id)).toEqual([]);
  });
});
