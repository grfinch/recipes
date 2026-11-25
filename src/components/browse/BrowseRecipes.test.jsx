import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LETTER_GROUP_THRESHOLD } from '../../utils/recipeFilters';
import BrowseRecipes from './BrowseRecipes';

// count recipes named "<Letter> recipe <n>", cycling through the given first letters
function makeRecipes(count, letters = ['A', 'B', 'M']) {
  return Array.from({ length: count }, (_, i) => {
    const name = `${letters[i % letters.length]} recipe ${i}`;
    return { id: `recipe-${i}`, name, course: i % 2 ? 'Dinner' : 'Dessert' };
  });
}

describe('BrowseRecipes on a long list', () => {
  it('keeps a short list as one plain list, with no letter sections', () => {
    render(<BrowseRecipes recipes={makeRecipes(LETTER_GROUP_THRESHOLD)} />);
    expect(screen.queryByRole('navigation', { name: 'Jump to letter' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
    expect(screen.getAllByRole('list')).toHaveLength(1);
  });

  it('splits a long list into A-Z sections, with a button for each letter in use', () => {
    render(<BrowseRecipes recipes={makeRecipes(60, ['M', '7', 'A'])} />);
    const nav = screen.getByRole('navigation', { name: 'Jump to letter' });
    expect(
      within(nav)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['#', 'A', 'M']);
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      '#',
      'A',
      'M',
    ]);
    expect(screen.getByRole('status')).toHaveTextContent('60 recipes');
    // Every recipe is still listed, once
    expect(screen.getAllByRole('link', { name: /recipe \d+/ })).toHaveLength(60);
  });

  it('moves focus to a letter heading from the jump bar', async () => {
    const user = userEvent.setup();
    render(<BrowseRecipes recipes={makeRecipes(60)} />);
    await user.click(screen.getByRole('button', { name: 'M' }));
    expect(screen.getByRole('heading', { level: 2, name: 'M' })).toHaveFocus();
  });

  it('groups only the recipes the filters show, and drops the sections when few are left', () => {
    const recipes = [...makeRecipes(70), { id: 'zucchini', name: 'Zucchini', course: 'Side' }];
    const { rerender } = render(<BrowseRecipes recipes={recipes} filters={{ course: 'Dinner' }} />);
    expect(screen.getByRole('heading', { level: 2, name: 'A' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Z' })).not.toBeInTheDocument();

    rerender(<BrowseRecipes recipes={recipes} filters={{ course: 'Side' }} />);
    expect(screen.queryByRole('navigation', { name: 'Jump to letter' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Zucchini' })).toBeInTheDocument();
  });
});
