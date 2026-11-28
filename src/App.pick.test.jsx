import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

// Separate file because vi.mock replaces the recipe list for the whole file.
vi.mock('./recipes/index.js', () => ({
  default: [
    {
      id: 'apple-crisp',
      name: 'Apple Crisp',
      course: 'Dessert',
      cookingMethod: 'Oven',
      ingredients: [{ items: ['4 apples', '1 cup oats'] }],
      instructions: [{ items: ['Bake'] }],
      contributor: 'Sharmi',
    },
    {
      id: 'chicken-curry',
      name: 'Chicken Curry',
      course: 'Dinner',
      cookingMethod: 'Stovetop',
      ingredients: [{ items: ['2 lb chicken thighs', '1 can coconut milk'] }],
      instructions: [{ items: ['Simmer'] }],
      contributor: 'Sharmi',
    },
    {
      id: 'teriyaki-chicken',
      name: 'Teriyaki Chicken',
      course: 'Dinner',
      cookingMethod: 'Instant-pot',
      ingredients: [
        { title: 'Chicken', items: ['8 chicken thighs', '1 bottle teriyaki sauce'] },
        { title: 'Rice', items: ['2 cups rice'] },
      ],
      instructions: [{ items: ['Pressure cook'] }],
      contributor: 'Gaven',
    },
    {
      id: 'lentil-stew',
      name: 'Lentil Stew',
      course: 'Dinner',
      cookingMethod: 'Instant-pot',
      ingredients: [{ items: ['1 cup lentils', '2 cups rice'] }],
      instructions: [{ items: ['Pressure cook'] }],
    },
  ],
}));

afterEach(() => vi.restoreAllMocks());

const main = () => within(screen.getByRole('main'));
const chip = (groupName, name) =>
  within(main().getByRole('group', { name: groupName })).getByRole('checkbox', { name });
const count = () => main().getByRole('status');
const ingredientsBox = () => main().getByRole('textbox', { name: /Ingredients you have/ });
const result = () => main().queryByRole('region', { name: 'Your pick' });
const pickedName = () => within(result()).getAllByRole('link')[0].textContent;
// The names in the recipe list, not in the pick's card
const listed = () =>
  main()
    .getAllByRole('listitem')
    .filter((li) => !result()?.contains(li))
    .map((li) => within(li).getByRole('link').textContent);

function openBrowse(hash = '#/browse') {
  window.history.replaceState(null, '', hash);
  render(<App />);
}

// What Back does: the hash changes and hashchange fires (asynchronously in jsdom)
async function waitForHashChange(change) {
  await act(async () => {
    const changed = new Promise((resolve) =>
      window.addEventListener('hashchange', resolve, { once: true }),
    );
    change();
    await changed;
  });
}

describe('Ingredients and Pick one for me on All recipes', () => {
  it('opens an old #/pick link as All recipes, keeping its filters', () => {
    openBrowse('#/pick?course=Dinner');
    expect(screen.getByRole('heading', { level: 1, name: 'All recipes' })).toBeInTheDocument();
    expect(window.location.hash).toBe('#/browse?course=Dinner');
    expect(chip('Course', 'Dinner')).toBeChecked();
    const footer = within(screen.getByRole('contentinfo'));
    expect(footer.queryByRole('link', { name: 'Pick a recipe for me' })).toBeNull();
  });

  it('starts with every recipe listed, an empty ingredients box, and no pick', () => {
    openBrowse();
    expect(ingredientsBox()).toHaveValue('');
    expect(ingredientsBox()).toHaveAccessibleDescription(/Separate them with commas/);
    expect(count()).toHaveTextContent('4 recipes');
    expect(main().getByRole('button', { name: 'Pick one for me' })).toBeInTheDocument();
    expect(result()).toBeNull();
  });

  it('lists only recipes with the ingredients, keeps them in the link, and picks from them', async () => {
    const user = userEvent.setup();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    openBrowse();
    const historyLength = window.history.length;

    await user.click(chip('Course', 'Dinner'));
    await user.type(ingredientsBox(), 'Chicken, ');
    // The box keeps what was typed; the link keeps the terms
    expect(ingredientsBox()).toHaveValue('Chicken, ');
    expect(window.location.hash).toBe('#/browse?course=Dinner&have=chicken');
    expect(listed()).toEqual(['Chicken Curry', 'Teriyaki Chicken']);
    await user.type(ingredientsBox(), 'rice');
    expect(window.location.hash).toBe('#/browse?course=Dinner&have=chicken&have=rice');
    expect(count()).toHaveTextContent('1 recipe');
    expect(listed()).toEqual(['Teriyaki Chicken']);
    // Typing and filtering add no history entries
    expect(window.history.length).toBe(historyLength);

    const button = main().getByRole('button', { name: 'Pick one for me' });
    await user.click(button);
    expect(pickedName()).toBe('Teriyaki Chicken');
    expect(within(result()).getByRole('link', { name: 'Teriyaki Chicken' })).toHaveAttribute(
      'href',
      '#/teriyaki-chicken',
    );
    expect(result()).toHaveTextContent('Dinner · Instant-pot');
    expect(
      within(result())
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['8 chicken thighs', '2 cups rice']);
    expect(result()).toHaveTextContent("It's the only recipe that matches.");
    // Focus stays on the button; the pick is announced by its aria-live region
    expect(button).toHaveFocus();
    expect(result().parentElement).toHaveAttribute('aria-live', 'polite');
    // Picking doesn't navigate or change the URL
    expect(window.location.hash).toBe('#/browse?course=Dinner&have=chicken&have=rice');
  });

  it('reads the ingredients from the link, ignoring case, blanks, and repeats', () => {
    openBrowse('#/browse?have=Chicken&have=chicken&have=%20');
    expect(ingredientsBox()).toHaveValue('chicken');
    expect(listed()).toEqual(['Chicken Curry', 'Teriyaki Chicken']);
    expect(window.location.hash).toBe('#/browse?have=chicken');
  });

  it('matches plurals by their stem, and says when no recipe uses them all', async () => {
    const user = userEvent.setup();
    openBrowse();
    await user.type(ingredientsBox(), 'apple');
    expect(listed()).toEqual(['Apple Crisp']);
    await user.clear(ingredientsBox());
    // Each is used somewhere, but never together
    await user.type(ingredientsBox(), 'lentils, oat');
    expect(count()).toHaveTextContent('No recipes match these filters.');
  });

  it('"Pick another" always changes the pick when there is more than one match', async () => {
    const user = userEvent.setup();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    openBrowse();
    await user.type(ingredientsBox(), 'chicken');
    expect(count()).toHaveTextContent('2 recipes');

    await user.click(main().getByRole('button', { name: 'Pick one for me' }));
    expect(pickedName()).toBe('Chicken Curry');
    await user.click(main().getByRole('button', { name: 'Pick another' }));
    expect(pickedName()).toBe('Teriyaki Chicken');
    await user.click(main().getByRole('button', { name: 'Pick another' }));
    expect(pickedName()).toBe('Chicken Curry');
  });

  it('drops the pick when a filter or the ingredients change', async () => {
    const user = userEvent.setup();
    openBrowse();
    await user.click(main().getByRole('button', { name: 'Pick one for me' }));
    expect(result()).not.toBeNull();
    await user.click(chip('Course', 'Dinner'));
    expect(result()).toBeNull();

    await user.click(main().getByRole('button', { name: 'Pick one for me' }));
    expect(result()).not.toBeNull();
    await user.type(ingredientsBox(), 'r');
    expect(result()).toBeNull();
    expect(main().getByRole('button', { name: 'Pick one for me' })).toBeInTheDocument();
  });

  it('names an ingredient no recipe uses, and Clear filters clears the ingredients too', async () => {
    const user = userEvent.setup();
    openBrowse();
    await user.click(chip('Course', 'Dinner'));
    await user.type(ingredientsBox(), 'chicken, tofu');
    expect(count()).toHaveTextContent('No recipes use tofu.');
    expect(main().queryByRole('button', { name: 'Pick one for me' })).toBeNull();

    await user.click(main().getByRole('button', { name: 'Clear filters' }));
    expect(chip('Course', 'All')).toBeChecked();
    expect(chip('Course', 'All')).toHaveFocus();
    expect(ingredientsBox()).toHaveValue('');
    expect(count()).toHaveTextContent('4 recipes');
    expect(window.location.hash).toBe('#/browse');
  });

  it('keeps the filters and the pick after opening the recipe and coming Back', async () => {
    const user = userEvent.setup();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    openBrowse();
    await user.click(chip('Cooking method', 'Instant-pot'));
    await user.type(ingredientsBox(), 'rice');
    await user.click(main().getByRole('button', { name: 'Pick one for me' }));
    expect(pickedName()).toBe('Lentil Stew');

    await user.click(within(result()).getByRole('link', { name: 'Lentil Stew' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Lentil Stew' }),
    ).toBeInTheDocument();

    await waitForHashChange(() => window.history.back());
    expect(chip('Cooking method', 'Instant-pot')).toBeChecked();
    expect(ingredientsBox()).toHaveValue('rice');
    expect(pickedName()).toBe('Lentil Stew');
    // Focus goes back to the pick's link, where the visitor left
    expect(within(result()).getByRole('link', { name: 'Lentil Stew' })).toHaveFocus();
  });
});
