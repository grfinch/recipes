import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

// Two recipes that share an ingredient and a step, like the real data does.
vi.mock('./recipes.json', () => ({
  default: {
    recipes: [
      {
        name: 'Lentil Stew',
        ingredients: [['1 Tbsp olive oil', '1 cup lentils']],
        instructions: ['Heat the oil', 'Simmer'],
      },
      {
        name: 'Sausage Pasta',
        ingredients: [['1 Tbsp olive oil', '1 lb sausage']],
        instructions: ['Heat the oil', 'Boil pasta'],
      },
      {
        name: 'Apple Crisp',
        course: 'Dessert',
        cookingMethod: 'Oven',
        ingredients: [['4 apples', '1 cup oats']],
        instructions: ['Bake'],
      },
    ],
  },
}));

afterEach(() => vi.restoreAllMocks());

describe('App', () => {
  it('picks the random first recipe only once, not on every render', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    const { rerender } = render(<App />);
    rerender(<App />);
    rerender(<App />);
    expect(random).toHaveBeenCalledTimes(1);
  });

  it('opens the recipe named in the URL hash', () => {
    const random = vi.spyOn(Math, 'random');
    window.history.replaceState(null, '', '#/sausage-pasta');
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sausage Pasta');
    expect(random).not.toHaveBeenCalled();
    expect(document.title).toBe("Sausage Pasta | Twig's Cook Book");
  });

  it('replaces an unknown hash with the recipe it shows', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    window.history.replaceState(null, '', '#/pancakes');
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Lentil Stew');
    expect(window.location.hash).toBe('#/lentil-stew');
  });

  it('puts the selected recipe in the URL and follows hash changes', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Search recipes'), 'pasta');
    await user.click(await screen.findByRole('button', { name: 'Sausage Pasta' }));
    expect(window.location.hash).toBe('#/sausage-pasta');

    // What Back does: the hash changes and the browser fires hashchange
    window.location.hash = '#/lentil-stew';
    expect(await screen.findByRole('heading', { level: 1, name: 'Lentil Stew' })).toBeVisible();
  });

  it('keeps checked items after a reload', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await user.click(screen.getByRole('checkbox', { name: /lentils/ }));
    await user.click(screen.getByRole('button', { name: /Simmer/ }));
    unmount();

    render(<App />);
    expect(screen.getByRole('checkbox', { name: /lentils/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /olive oil/ })).not.toBeChecked();
    expect(screen.getByRole('button', { name: /Simmer/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('clears every checked item with Reset checklist', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await user.click(screen.getByRole('checkbox', { name: /lentils/ }));
    await user.click(screen.getByRole('button', { name: /Simmer/ }));
    await user.click(screen.getByRole('button', { name: 'Reset checklist' }));

    expect(screen.getByRole('checkbox', { name: /lentils/ })).not.toBeChecked();
    expect(screen.getByRole('button', { name: /Simmer/ })).toHaveAttribute('aria-pressed', 'false');
    unmount();
    render(<App />);
    expect(screen.getByRole('checkbox', { name: /lentils/ })).not.toBeChecked();
  });

  it('starts fresh when saved checklist data is corrupt', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    localStorage.setItem('recipes:checked:Lentil Stew', '{not json');
    render(<App />);
    expect(screen.getByRole('checkbox', { name: /lentils/ })).not.toBeChecked();
  });

  it('resets checked items when switching to another recipe', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // start on Lentil Stew
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Lentil Stew');

    await user.click(screen.getByRole('checkbox', { name: /olive oil/ }));
    await user.click(screen.getByRole('button', { name: /Heat the oil/ }));
    expect(screen.getByRole('checkbox', { name: /olive oil/ })).toBeChecked();

    await user.type(screen.getByLabelText('Search recipes'), 'pasta');
    await user.click(await screen.findByRole('button', { name: 'Sausage Pasta' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sausage Pasta');

    expect(screen.getByRole('checkbox', { name: /olive oil/ })).not.toBeChecked();
    expect(screen.getByRole('button', { name: /Heat the oil/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});

// What Back, Forward, or clicking an in-page link does: the hash changes and hashchange fires.
// jsdom fires hashchange asynchronously, so wait for it inside act().
async function goToHash(hash) {
  await act(async () => {
    window.location.hash = hash;
    await new Promise((resolve) => window.addEventListener('hashchange', resolve, { once: true }));
  });
}

describe('Browse all recipes', () => {
  it('links to the browse view from the header', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<App />);
    const link = within(screen.getByRole('banner')).getByRole('link', { name: 'All recipes' });
    expect(link).toHaveAttribute('href', '#/browse');
    expect(link).not.toHaveAttribute('aria-current');
  });

  it('lists every recipe by name as a link to it, sorted by name', () => {
    window.history.replaceState(null, '', '#/browse');
    render(<App />);
    const links = within(screen.getByRole('main')).getAllByRole('link');
    expect(links.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Apple Crisp', '#/apple-crisp'],
      ['Lentil Stew', '#/lentil-stew'],
      ['Sausage Pasta', '#/sausage-pasta'],
    ]);
    expect(screen.getByText('Dessert · Oven')).toBeInTheDocument();
  });

  it('deep-links to #/browse with its own title and no random recipe', () => {
    const random = vi.spyOn(Math, 'random');
    window.history.replaceState(null, '', '#/browse');
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('All recipes');
    expect(random).not.toHaveBeenCalled();
    expect(window.location.hash).toBe('#/browse');
    expect(document.title).toBe("All recipes | Twig's Cook Book");
    expect(screen.getByRole('link', { name: 'All recipes' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('does not move focus on the first page load', () => {
    window.history.replaceState(null, '', '#/browse');
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveFocus();
  });

  it('goes to browse from the header link, then opens a recipe, moving focus each time', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('link', { name: 'All recipes' }));
    const browseHeading = await screen.findByRole('heading', { level: 1, name: 'All recipes' });
    expect(window.location.hash).toBe('#/browse');
    expect(document.title).toBe("All recipes | Twig's Cook Book");
    expect(browseHeading).toHaveFocus();

    await user.click(screen.getByRole('link', { name: 'Apple Crisp' }));
    const recipeHeading = await screen.findByRole('heading', { level: 1, name: 'Apple Crisp' });
    expect(window.location.hash).toBe('#/apple-crisp');
    expect(document.title).toBe("Apple Crisp | Twig's Cook Book");
    expect(recipeHeading).toHaveFocus();
    expect(screen.getByRole('checkbox', { name: /apples/ })).toBeInTheDocument();
  });

  it('follows hash changes between browse and recipes', async () => {
    window.history.replaceState(null, '', '#/browse');
    render(<App />);

    await goToHash('#/sausage-pasta');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sausage Pasta');
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
    expect(document.title).toBe("Sausage Pasta | Twig's Cook Book");

    await goToHash('#/browse');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('All recipes');
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
  });

  it('keeps a recipe checklist across a trip to browse and back', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('checkbox', { name: /lentils/ }));

    await user.click(screen.getByRole('link', { name: 'All recipes' }));
    await user.click(await screen.findByRole('link', { name: 'Lentil Stew' }));
    expect(await screen.findByRole('checkbox', { name: /lentils/ })).toBeChecked();
  });

  it('moves focus to the recipe heading after choosing a search result', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Search recipes'), 'pasta');
    await user.click(await screen.findByRole('button', { name: 'Sausage Pasta' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Sausage Pasta' })).toHaveFocus();
  });
});
