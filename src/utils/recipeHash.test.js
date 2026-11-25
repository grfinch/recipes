import { describe, expect, it } from 'vitest';
import allRecipes from '../recipes/index.js';
import {
  BROWSE_HASH,
  PICK_HASH,
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

  it('reads the pick page from the hash, even if a recipe is named Pick', () => {
    const withPick = [...recipes, { id: 'pick', name: 'Pick' }];
    expect(viewFromHash(withPick, '#/pick')).toEqual({ page: 'pick' });
    expect(viewFromHash(withPick, '#/pick?course=Dinner')).toEqual({ page: 'pick' });
    expect(recipeFromHash(withPick, '#/pick')).toBeNull();
    expect(hashForView({ page: 'pick' })).toBe(PICK_HASH);
    expect(RESERVED_SLUGS).toContain('pick');
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

  describe('browse filters in the hash', () => {
    const filterable = [
      { id: 'lentil-stew', name: 'Lentil Stew', course: 'Dinner', cookingMethod: 'Instant-pot' },
      { id: 'pulled-pork', name: 'Pulled Pork', course: 'Dinner', cookingMethod: 'Slow cooker' },
      { id: 'mac-cheese', name: 'Mac & Cheese', course: 'Side & Snack', cookingMethod: 'Oven' },
    ];
    const view = (hash) => viewFromHash(filterable, hash);

    it('reads course and method, and leaves plain #/browse unchanged', () => {
      expect(view('#/browse')).toEqual({ page: 'browse' });
      expect(view('#/browse?')).toEqual({ page: 'browse' });
      expect(view('#/browse?course=Dinner')).toEqual({ page: 'browse', course: 'Dinner' });
      expect(view('#/browse?course=Dinner&method=Instant-pot')).toEqual({
        page: 'browse',
        course: 'Dinner',
        method: 'Instant-pot',
      });
      expect(view('#/browse?method=Oven&course=Dinner')).toEqual({
        page: 'browse',
        course: 'Dinner',
        method: 'Oven',
      });
    });

    it('ignores unknown parameters', () => {
      expect(view('#/browse?sort=name&cookingMethod=Oven&q=stew')).toEqual({ page: 'browse' });
      expect(view('#/browse?sort=name&course=Dinner')).toEqual({
        page: 'browse',
        course: 'Dinner',
      });
    });

    it('drops bad values: unused, unknown, empty, or blank', () => {
      expect(view('#/browse?course=Lunch')).toEqual({ page: 'browse' }); // a category nobody uses
      expect(view('#/browse?course=Pizza&method=Oven')).toEqual({ page: 'browse', method: 'Oven' });
      expect(view('#/browse?course=&method=%20%20')).toEqual({ page: 'browse' });
      expect(view('#/browse?course')).toEqual({ page: 'browse' });
      expect(view('#/browse?method=Dinner')).toEqual({ page: 'browse' }); // a course, not a method
    });

    it('matches values ignoring case and spaces around them, using the recipe spelling', () => {
      expect(view('#/browse?course=dinner&method=INSTANT-POT')).toEqual({
        page: 'browse',
        course: 'Dinner',
        method: 'Instant-pot',
      });
      expect(view('#/browse?course=%20Dinner%20')).toEqual({ page: 'browse', course: 'Dinner' });
    });

    it('uses the first of repeated parameters', () => {
      expect(view('#/browse?course=Dinner&course=Side+%26+Snack')).toEqual({
        page: 'browse',
        course: 'Dinner',
      });
    });

    it('decodes spaces as + or %20, and encoded & and =', () => {
      expect(view('#/browse?method=Slow+cooker').method).toBe('Slow cooker');
      expect(view('#/browse?method=Slow%20cooker').method).toBe('Slow cooker');
      expect(view('#/browse?course=Side%20%26%20Snack').course).toBe('Side & Snack');
      expect(view('#/browse?course=%E0%A4%A')).toEqual({ page: 'browse' }); // malformed, no throw
    });

    it('builds the hash with course first, encoded, and round-trips it', () => {
      const filtered = { page: 'browse', method: 'Slow cooker', course: 'Side & Snack' };
      const hash = hashForView(filtered);
      expect(hash).toBe('#/browse?course=Side+%26+Snack&method=Slow+cooker');
      expect(view(hash)).toEqual({ page: 'browse', course: 'Side & Snack', method: 'Slow cooker' });
      expect(hashForView({ page: 'browse', course: 'Dinner' })).toBe('#/browse?course=Dinner');
      expect(hashForView({ page: 'browse', course: undefined, method: null })).toBe(BROWSE_HASH);
    });

    it('does not treat an encoded "?" as the start of a query', () => {
      expect(view('#/browse%3Fcourse=Dinner')).toBeNull();
    });

    it('opens a recipe whose link has a stray query', () => {
      expect(view('#/lentil-stew?course=Dinner')).toEqual({
        page: 'recipe',
        recipe: filterable[0],
      });
      expect(recipeFromHash(filterable, '#/browse?course=Dinner')).toBeNull();
    });
  });

  it('has no real recipe whose slug is reserved', () => {
    const clashes = allRecipes.filter((r) => RESERVED_SLUGS.includes(r.id));
    expect(clashes.map((r) => r.id)).toEqual([]);
  });
});
