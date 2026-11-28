import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import PickRecipe from './components/pick/PickRecipe';

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
      // No contributor: matches only "All" in the Shared by row
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

function openPick() {
  window.history.replaceState(null, '', '#/pick');
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

describe('Pick a recipe for me', () => {
  it('opens from the footer link with its own title, focus, and aria-current', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '#/lentil-stew');
    render(<App />);
    const footer = () => within(screen.getByRole('contentinfo'));
    expect(footer().getByRole('link', { name: 'Pick a recipe for me' })).not.toHaveAttribute(
      'aria-current',
    );

    await user.click(footer().getByRole('link', { name: 'Pick a recipe for me' }));
    const heading = await screen.findByRole('heading', { level: 1, name: 'Pick a recipe for me' });
    expect(window.location.hash).toBe('#/pick');
    expect(document.title).toBe("Pick a recipe for me | Sharmi's Cook Book");
    expect(heading).toHaveFocus();
    expect(footer().getByRole('link', { name: 'Pick a recipe for me' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('is linked from All recipes', () => {
    window.history.replaceState(null, '', '#/browse');
    render(<App />);
    expect(main().getByRole('link', { name: 'Pick a recipe for me' })).toHaveAttribute(
      'href',
      '#/pick',
    );
  });

  it('starts with every recipe to choose from and no pick', () => {
    openPick();
    expect(chip('Course', 'All')).toBeChecked();
    expect(chip('Cooking method', 'All')).toBeChecked();
    expect(chip('Shared by', 'All')).toBeChecked();
    expect(ingredientsBox()).toHaveValue('');
    expect(ingredientsBox()).toHaveAccessibleDescription(/Separate them with commas/);
    expect(count()).toHaveTextContent('4 recipes to choose from');
    expect(result()).toBeNull();
  });

  it('picks a recipe that fits the course, method, and ingredients', async () => {
    const user = userEvent.setup();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    openPick();

    await user.click(chip('Course', 'Dinner'));
    expect(count()).toHaveTextContent('3 recipes match');
    await user.click(chip('Cooking method', 'Instant-pot'));
    expect(count()).toHaveTextContent('2 recipes match');
    await user.type(ingredientsBox(), 'Chicken, rice');
    expect(count()).toHaveTextContent('1 recipe matches');

    const button = main().getByRole('button', { name: 'Pick for me' });
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
    expect(window.location.hash).toBe('#/pick');
  });

  it('filters by who shared the recipe, listing each contributor A-Z', async () => {
    const user = userEvent.setup();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    openPick();
    const row = within(main().getByRole('group', { name: 'Shared by' }));
    // Each chip's label text, without its decorative check mark
    const labels = row
      .getAllByRole('checkbox')
      .map((r) => r.labels[0].textContent.replace('✓', ''));
    expect(labels).toEqual(['All', 'Gaven', 'Sharmi']);

    await user.click(chip('Shared by', 'Sharmi'));
    expect(count()).toHaveTextContent('2 recipes match');
    await user.type(ingredientsBox(), 'chicken');
    expect(count()).toHaveTextContent('1 recipe matches');
    await user.click(main().getByRole('button', { name: 'Pick for me' }));
    expect(pickedName()).toBe('Chicken Curry');

    // Adding Gaven: Sharmi's or Gaven's chicken recipes
    await user.click(chip('Shared by', 'Gaven'));
    expect(result()).toBeNull();
    expect(count()).toHaveTextContent('2 recipes match');
  });

  it('takes several choices in a row, and "All" clears them', async () => {
    const user = userEvent.setup();
    openPick();
    await user.click(chip('Course', 'Dessert'));
    expect(count()).toHaveTextContent('1 recipe matches');
    await user.click(chip('Course', 'Dinner'));
    expect(count()).toHaveTextContent('4 recipes match');
    await user.click(chip('Cooking method', 'Oven'));
    await user.click(chip('Cooking method', 'Stovetop'));
    expect(count()).toHaveTextContent('2 recipes match');

    await user.click(chip('Course', 'All'));
    expect(chip('Course', 'All')).toBeChecked();
    expect(chip('Course', 'Dinner')).not.toBeChecked();
    expect(chip('Cooking method', 'Oven')).toBeChecked();
    expect(count()).toHaveTextContent('2 recipes match');
  });

  it('has no Shared by row when no recipe credits anyone', () => {
    render(<PickRecipe recipes={[{ id: 'x', name: 'X', ingredients: [], instructions: [] }]} />);
    expect(screen.queryByRole('group', { name: 'Shared by' })).toBeNull();
    expect(screen.getByRole('group', { name: 'Course' })).toBeInTheDocument();
  });

  it('"Pick another" always changes the pick when there is more than one match', async () => {
    const user = userEvent.setup();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    openPick();
    await user.type(ingredientsBox(), 'chicken');
    expect(count()).toHaveTextContent('2 recipes match');

    await user.click(main().getByRole('button', { name: 'Pick for me' }));
    expect(pickedName()).toBe('Chicken Curry');
    await user.click(main().getByRole('button', { name: 'Pick another' }));
    expect(pickedName()).toBe('Teriyaki Chicken');
    await user.click(main().getByRole('button', { name: 'Pick another' }));
    expect(pickedName()).toBe('Chicken Curry');
  });

  it('drops the pick when the choices change', async () => {
    const user = userEvent.setup();
    openPick();
    await user.click(main().getByRole('button', { name: 'Pick for me' }));
    expect(result()).not.toBeNull();
    await user.click(chip('Course', 'Dessert'));
    expect(result()).toBeNull();
    expect(main().getByRole('button', { name: 'Pick for me' })).toBeInTheDocument();
  });

  it('names an ingredient no recipe uses, and Clear choices starts over', async () => {
    const user = userEvent.setup();
    openPick();
    await user.click(chip('Course', 'Dinner'));
    await user.click(chip('Shared by', 'Gaven'));
    await user.type(ingredientsBox(), 'chicken, tofu');
    expect(count()).toHaveTextContent('No recipes use tofu.');
    expect(main().queryByRole('button', { name: 'Pick for me' })).toBeNull();

    await user.click(main().getByRole('button', { name: 'Clear choices' }));
    expect(chip('Course', 'All')).toBeChecked();
    expect(chip('Course', 'All')).toHaveFocus();
    expect(chip('Shared by', 'All')).toBeChecked();
    expect(ingredientsBox()).toHaveValue('');
    expect(count()).toHaveTextContent('4 recipes to choose from');
  });

  it('says when the choices clash but each ingredient is used somewhere', async () => {
    const user = userEvent.setup();
    openPick();
    await user.click(chip('Course', 'Dessert'));
    await user.type(ingredientsBox(), 'chicken');
    expect(count()).toHaveTextContent('No recipes match all of these. Try fewer choices.');
  });

  it('keeps the choices and the pick after opening the recipe and coming Back', async () => {
    const user = userEvent.setup();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    openPick();
    await user.click(chip('Cooking method', 'Instant-pot'));
    await user.click(main().getByRole('button', { name: 'Pick for me' }));
    expect(pickedName()).toBe('Lentil Stew');

    await user.click(within(result()).getByRole('link', { name: 'Lentil Stew' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Lentil Stew' }),
    ).toBeInTheDocument();

    await waitForHashChange(() => window.history.back());
    expect(screen.getByRole('heading', { level: 1, name: 'Pick a recipe for me' })).toHaveFocus();
    expect(chip('Cooking method', 'Instant-pot')).toBeChecked();
    expect(pickedName()).toBe('Lentil Stew');
  });
});
