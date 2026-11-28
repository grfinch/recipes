import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JUMP_BAR_THRESHOLD } from '../../utils/recipeFilters';
import { BACK_TO_TOP_THRESHOLD } from './BackToTop';
import BrowseRecipes from './BrowseRecipes';

// count recipes named "<Letter> recipe <n>", cycling through the given first letters
function makeRecipes(count, letters = ['A', 'B', 'M']) {
  return Array.from({ length: count }, (_, i) => {
    const name = `${letters[i % letters.length]} recipe ${i}`;
    return { id: `recipe-${i}`, name, course: i % 2 ? 'Dinner' : 'Dessert' };
  });
}

describe('BrowseRecipes on a long list', () => {
  it('splits a short list into letter sections too, but with no jump bar', () => {
    render(<BrowseRecipes recipes={makeRecipes(JUMP_BAR_THRESHOLD)} />);
    expect(screen.queryByRole('navigation', { name: 'Jump to letter' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'A',
      'B',
      'M',
    ]);
    expect(screen.getAllByRole('list')).toHaveLength(3);
    expect(screen.getAllByRole('link', { name: /recipe \d+/ })).toHaveLength(JUMP_BAR_THRESHOLD);
  });

  it('gives a single recipe its letter heading', () => {
    render(<BrowseRecipes recipes={[{ id: 'zucchini', name: 'Zucchini', course: 'Side' }]} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Z' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Zucchini' })).toBeInTheDocument();
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

  it('groups only the recipes the filters show, and drops the jump bar when few are left', () => {
    const recipes = [...makeRecipes(70), { id: 'zucchini', name: 'Zucchini', course: 'Side' }];
    const { rerender } = render(<BrowseRecipes recipes={recipes} filters={{ course: 'Dinner' }} />);
    expect(screen.getByRole('heading', { level: 2, name: 'A' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Z' })).not.toBeInTheDocument();

    rerender(<BrowseRecipes recipes={recipes} filters={{ course: 'Side' }} />);
    expect(screen.queryByRole('navigation', { name: 'Jump to letter' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Zucchini' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Z' })).toBeInTheDocument();
  });
});

describe('BrowseRecipes back to top', () => {
  function scrollWindowTo(y) {
    act(() => {
      window.scrollY = y;
      window.dispatchEvent(new Event('scroll'));
    });
  }

  beforeEach(() => {
    // jsdom doesn't scroll: record the call and act as if it had
    window.scrollTo = vi.fn(({ top }) => scrollWindowTo(top));
  });

  afterEach(() => {
    window.scrollY = 0;
    delete window.scrollTo;
  });

  it('shows only once the visitor has scrolled down', () => {
    render(<BrowseRecipes recipes={makeRecipes(60)} />);
    expect(screen.queryByRole('button', { name: 'Back to top' })).not.toBeInTheDocument();

    scrollWindowTo(BACK_TO_TOP_THRESHOLD + 1);
    expect(screen.getByRole('button', { name: 'Back to top' })).toBeInTheDocument();

    scrollWindowTo(0);
    expect(screen.queryByRole('button', { name: 'Back to top' })).not.toBeInTheDocument();
  });

  it('scrolls to the top and moves focus to the heading', async () => {
    const user = userEvent.setup();
    render(<BrowseRecipes recipes={makeRecipes(60)} />);
    scrollWindowTo(2000);
    await user.click(screen.getByRole('button', { name: 'Back to top' }));
    expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
    expect(screen.getByRole('heading', { level: 1, name: 'All recipes' })).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Back to top' })).not.toBeInTheDocument();
  });
});
