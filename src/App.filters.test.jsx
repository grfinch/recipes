import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

// Separate file because vi.mock replaces the recipe list for the whole file. Four recipes over
// three courses and four methods; Lunch, Grill, and the other listed categories go unused.
// Two contributors; Pancakes has none.
vi.mock('./recipes/index.js', () => ({
  default: [
    {
      id: 'apple-crisp',
      name: 'Apple Crisp',
      course: 'Dessert',
      cookingMethod: 'Oven',
      ingredients: [{ items: ['4 apples'] }],
      instructions: [{ items: ['Bake'] }],
      contributor: 'Sharmi',
    },
    {
      id: 'lentil-stew',
      name: 'Lentil Stew',
      course: 'Dinner',
      cookingMethod: 'Instant-pot',
      ingredients: [{ items: ['1 cup lentils'] }],
      instructions: [{ items: ['Pressure cook'] }],
      contributor: 'Gaven',
    },
    {
      id: 'pancakes',
      name: 'Pancakes',
      course: 'Breakfast',
      cookingMethod: 'Stovetop',
      ingredients: [{ items: ['1 cup flour'] }],
      instructions: [{ items: ['Fry'] }],
    },
    {
      id: 'pulled-pork',
      name: 'Pulled Pork',
      course: 'Dinner',
      cookingMethod: 'Slow cooker',
      ingredients: [{ items: ['1 pork shoulder'] }],
      instructions: [{ items: ['Cook on low'] }],
      contributor: 'Sharmi',
    },
  ],
}));

const main = () => screen.getByRole('main');
const group = (name) => within(main()).getByRole('group', { name });
const chip = (groupName, name) => within(group(groupName)).getByRole('checkbox', { name });
// Recipe links in the list only, not the "Back to <recipe>" link above the heading
const shownNames = () => {
  const list = within(main()).queryByRole('list');
  return list
    ? within(list)
        .getAllByRole('link')
        .map((a) => a.textContent)
    : [];
};
// The browse page's own count, not the search box's role="status" in the header
const count = () => within(main()).getByRole('status');

function openBrowse(hash = '#/browse') {
  window.history.replaceState(null, '', hash);
  render(<App />);
}

// What Back or a changed link does: the hash changes and hashchange fires (asynchronously in jsdom)
async function waitForHashChange(change) {
  await act(async () => {
    const changed = new Promise((resolve) =>
      window.addEventListener('hashchange', resolve, { once: true }),
    );
    change();
    await changed;
  });
}

describe('All recipes filters', () => {
  it('offers only the courses and methods recipes use, in recipeCategories.json order', () => {
    openBrowse();
    const labels = (name) =>
      within(group(name))
        .getAllByRole('checkbox')
        .map((r) => r.labels[0].textContent);
    // The check mark is aria-hidden; accessible names are the visible words only
    expect(within(group('Course')).getAllByRole('checkbox').length).toBe(4);
    expect(labels('Course').map((t) => t.replace('✓', ''))).toEqual([
      'All',
      'Breakfast',
      'Dinner',
      'Dessert',
    ]);
    expect(labels('Cooking method').map((t) => t.replace('✓', ''))).toEqual([
      'All',
      'Instant-pot',
      'Oven',
      'Stovetop',
      'Slow cooker',
    ]);
    expect(within(group('Course')).queryByRole('checkbox', { name: 'Lunch' })).toBeNull();
    expect(within(group('Cooking method')).queryByRole('checkbox', { name: 'Grill' })).toBeNull();
  });

  it('starts on "All" for both filters with plain #/browse', () => {
    openBrowse();
    expect(chip('Course', 'All')).toBeChecked();
    expect(chip('Cooking method', 'All')).toBeChecked();
    expect(shownNames()).toEqual(['Apple Crisp', 'Lentil Stew', 'Pancakes', 'Pulled Pork']);
    expect(count()).toHaveTextContent('4 recipes');
    expect(window.location.hash).toBe('#/browse');
  });

  it('filters by course, by method, and by both, announcing the count', async () => {
    const user = userEvent.setup();
    openBrowse();

    await user.click(chip('Course', 'Dinner'));
    expect(shownNames()).toEqual(['Lentil Stew', 'Pulled Pork']);
    expect(count()).toHaveTextContent('2 recipes');
    expect(window.location.hash).toBe('#/browse?course=Dinner');

    await user.click(chip('Cooking method', 'Slow cooker'));
    expect(shownNames()).toEqual(['Pulled Pork']);
    expect(count()).toHaveTextContent('1 recipe');
    expect(window.location.hash).toBe('#/browse?course=Dinner&method=Slow+cooker');

    await user.click(chip('Course', 'All'));
    expect(shownNames()).toEqual(['Pulled Pork']);
    expect(window.location.hash).toBe('#/browse?method=Slow+cooker');

    // A second method adds to the first: Slow cooker or Oven
    await user.click(chip('Cooking method', 'Oven'));
    expect(shownNames()).toEqual(['Apple Crisp', 'Pulled Pork']);

    await user.click(chip('Cooking method', 'All'));
    expect(shownNames()).toHaveLength(4);
    expect(window.location.hash).toBe('#/browse');
  });

  it('takes several choices in a row, and "All" clears them', async () => {
    const user = userEvent.setup();
    openBrowse();

    await user.click(chip('Course', 'Breakfast'));
    await user.click(chip('Course', 'Dessert'));
    expect(chip('Course', 'Breakfast')).toBeChecked();
    expect(chip('Course', 'Dessert')).toBeChecked();
    expect(chip('Course', 'All')).not.toBeChecked();
    expect(shownNames()).toEqual(['Apple Crisp', 'Pancakes']);
    expect(count()).toHaveTextContent('2 recipes');
    // Values follow the chips' order, not the order they were clicked
    expect(window.location.hash).toBe('#/browse?course=Breakfast&course=Dessert');

    // Unchecking one keeps the other
    await user.click(chip('Course', 'Breakfast'));
    expect(shownNames()).toEqual(['Apple Crisp']);
    expect(window.location.hash).toBe('#/browse?course=Dessert');

    await user.click(chip('Course', 'Dinner'));
    await user.click(chip('Course', 'All'));
    expect(chip('Course', 'All')).toBeChecked();
    expect(chip('Course', 'Dessert')).not.toBeChecked();
    expect(chip('Course', 'Dinner')).not.toBeChecked();
    expect(shownNames()).toHaveLength(4);
    expect(window.location.hash).toBe('#/browse');

    // Unchecking the last choice goes back to "All"
    await user.click(chip('Course', 'Dinner'));
    await user.click(chip('Course', 'Dinner'));
    expect(chip('Course', 'All')).toBeChecked();
    expect(window.location.hash).toBe('#/browse');
  });

  it('keeps "All" checked when it is clicked again', async () => {
    const user = userEvent.setup();
    openBrowse();
    await user.click(chip('Course', 'All'));
    expect(chip('Course', 'All')).toBeChecked();
    expect(shownNames()).toHaveLength(4);
  });

  it('opens a deep link with several values in a filter', () => {
    openBrowse('#/browse?course=dessert&course=Breakfast&course=Dessert&course=Lunch');
    expect(chip('Course', 'Breakfast')).toBeChecked();
    expect(chip('Course', 'Dessert')).toBeChecked();
    expect(shownNames()).toEqual(['Apple Crisp', 'Pancakes']);
    // Repeats and unused values dropped, spelling fixed, the link's order kept
    expect(window.location.hash).toBe('#/browse?course=Dessert&course=Breakfast');
  });

  it('filters by who shared the recipe, A-Z, alone or with the other filters', async () => {
    const user = userEvent.setup();
    openBrowse();
    const labels = within(group('Shared by'))
      .getAllByRole('checkbox')
      .map((r) => r.labels[0].textContent.replace('✓', ''));
    expect(labels).toEqual(['All', 'Gaven', 'Sharmi']);
    expect(chip('Shared by', 'All')).toBeChecked();

    await user.click(chip('Shared by', 'Sharmi'));
    expect(shownNames()).toEqual(['Apple Crisp', 'Pulled Pork']);
    expect(count()).toHaveTextContent('2 recipes');
    expect(window.location.hash).toBe('#/browse?by=Sharmi');

    await user.click(chip('Course', 'Dinner'));
    expect(shownNames()).toEqual(['Pulled Pork']);
    expect(window.location.hash).toBe('#/browse?course=Dinner&by=Sharmi');
  });

  it('opens a "Shared by" deep link, tidying its case', () => {
    openBrowse('#/browse?by=gaven');
    expect(chip('Shared by', 'Gaven')).toBeChecked();
    expect(shownNames()).toEqual(['Lentil Stew']);
    expect(window.location.hash).toBe('#/browse?by=Gaven');
  });

  it('keeps the browse count separate from the search box status', async () => {
    const user = userEvent.setup();
    openBrowse();
    await user.type(screen.getByLabelText('Search recipes'), 'pork');
    expect(await within(screen.getByRole('banner')).findByRole('status')).toHaveTextContent(
      '1 result',
    );
    expect(count()).toHaveTextContent('4 recipes');
  });

  it('works from the keyboard: Tab moves between chips, Space toggles, focus stays', async () => {
    const user = userEvent.setup();
    openBrowse();
    chip('Course', 'All').focus();
    await user.tab();
    expect(chip('Course', 'Breakfast')).toHaveFocus();
    await user.keyboard(' ');
    expect(chip('Course', 'Breakfast')).toBeChecked();
    expect(chip('Course', 'Breakfast')).toHaveFocus();
    expect(shownNames()).toEqual(['Pancakes']);
  });

  it('replaces the history entry on each filter change instead of adding one', async () => {
    const user = userEvent.setup();
    openBrowse();
    const before = window.history.length;
    await user.click(chip('Course', 'Dinner'));
    await user.click(chip('Cooking method', 'Instant-pot'));
    await user.click(chip('Course', 'All'));
    expect(window.history.length).toBe(before);
    expect(chip('Course', 'All')).toHaveFocus();
  });

  it('shows a message and a Clear filters button when nothing matches', async () => {
    const user = userEvent.setup();
    openBrowse();
    await user.click(chip('Course', 'Dessert'));
    await user.click(chip('Cooking method', 'Instant-pot'));
    expect(shownNames()).toEqual([]);
    expect(count()).toHaveTextContent('No recipes match these filters.');

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(shownNames()).toHaveLength(4);
    expect(count()).toHaveTextContent('4 recipes');
    expect(chip('Course', 'All')).toBeChecked();
    expect(chip('Cooking method', 'All')).toBeChecked();
    expect(chip('Course', 'All')).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
    expect(window.location.hash).toBe('#/browse');
  });

  it('opens a filtered view from a deep link', () => {
    const random = vi.spyOn(Math, 'random');
    openBrowse('#/browse?course=Dinner&method=Instant-pot');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('All recipes');
    expect(chip('Course', 'Dinner')).toBeChecked();
    expect(chip('Cooking method', 'Instant-pot')).toBeChecked();
    expect(shownNames()).toEqual(['Lentil Stew']);
    expect(random).not.toHaveBeenCalled();
    random.mockRestore();
  });

  it('tidies the URL of a deep link: case, spaces, unknown and unused values', () => {
    openBrowse('#/browse?method=slow%20COOKER&course=Lunch&sort=name');
    expect(chip('Cooking method', 'Slow cooker')).toBeChecked();
    expect(chip('Course', 'All')).toBeChecked();
    expect(shownNames()).toEqual(['Pulled Pork']);
    expect(window.location.hash).toBe('#/browse?method=Slow+cooker');
  });

  it('follows hashchange to and between filtered views without moving focus to the heading', async () => {
    openBrowse();
    await waitForHashChange(() => (window.location.hash = '#/browse?course=Breakfast'));
    expect(chip('Course', 'Breakfast')).toBeChecked();
    expect(shownNames()).toEqual(['Pancakes']);
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveFocus();

    await waitForHashChange(() => (window.location.hash = '#/browse'));
    expect(chip('Course', 'All')).toBeChecked();
    expect(shownNames()).toHaveLength(4);
  });

  it('opens a recipe from a filtered list, and Back returns to the filtered list', async () => {
    const user = userEvent.setup();
    openBrowse();
    await user.click(chip('Course', 'Dinner'));
    await user.click(screen.getByRole('link', { name: 'Pulled Pork' }));
    const recipeHeading = await screen.findByRole('heading', { level: 1, name: 'Pulled Pork' });
    expect(window.location.hash).toBe('#/pulled-pork');
    expect(recipeHeading).toHaveFocus();

    await waitForHashChange(() => window.history.back());
    expect(window.location.hash).toBe('#/browse?course=Dinner');
    expect(chip('Course', 'Dinner')).toBeChecked();
    expect(shownNames()).toEqual(['Lentil Stew', 'Pulled Pork']);
    // Focus goes back to the recipe's own link, so a long list keeps the visitor's place
    expect(within(main()).getByRole('link', { name: 'Pulled Pork' })).toHaveFocus();
    // The filtered list still offers the way back to the recipe just visited (from #23)
    expect(within(main()).getByRole('link', { name: /Back to Pulled Pork/ })).toHaveAttribute(
      'href',
      '#/pulled-pork',
    );
  });

  it('keeps the header link on plain #/browse, and it clears the filters', async () => {
    const user = userEvent.setup();
    openBrowse('#/browse?course=Dinner');
    const link = within(screen.getByRole('banner')).getByRole('link', { name: 'All recipes' });
    expect(link).toHaveAttribute('href', '#/browse');
    expect(link).toHaveAttribute('aria-current', 'page');

    await user.click(link);
    await screen.findByText('4 recipes');
    expect(chip('Course', 'All')).toBeChecked();
    expect(window.location.hash).toBe('#/browse');
  });
});
