import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

// Two recipes that share an ingredient and a step, like the real data does.
vi.mock('./recipes/index.js', () => ({
  default: [
    {
      id: 'lentil-stew',
      name: 'Lentil Stew',
      ingredients: [{ items: ['1 Tbsp olive oil', '1 cup lentils'] }],
      instructions: [{ items: ['Heat the oil', 'Simmer'] }],
    },
    {
      id: 'sausage-pasta',
      name: 'Sausage Pasta',
      ingredients: [{ items: ['1 Tbsp olive oil', '1 lb sausage'] }],
      instructions: [{ items: ['Heat the oil', 'Boil pasta'] }],
    },
    {
      id: 'apple-crisp',
      name: 'Apple Crisp',
      course: 'Dessert',
      cookingMethod: 'Oven',
      ingredients: [{ items: ['4 apples', '1 cup oats'] }],
      instructions: [{ items: ['Bake'] }],
    },
  ],
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
    localStorage.setItem('recipes:checked:lentil-stew', '{not json');
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

describe('Site footer', () => {
  // Fake only Date, so timers used by userEvent and hashchange keep running normally.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2031-06-15T12:00:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('shows the copyright with the current year on a recipe page', () => {
    window.history.replaceState(null, '', '#/lentil-stew');
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Lentil Stew');
    expect(screen.getByRole('contentinfo')).toHaveTextContent('© 2031 Gaven Finch');
  });

  it('shows the copyright with the current year on All recipes', () => {
    window.history.replaceState(null, '', '#/browse');
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('All recipes');
    expect(screen.getByRole('contentinfo')).toHaveTextContent('© 2031 Gaven Finch');
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
    const list = within(screen.getByRole('main')).getByRole('list');
    const links = within(list).getAllByRole('link');
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

describe('Suggest a recipe', () => {
  it('links to the suggest page from the footer and the browse page', () => {
    window.history.replaceState(null, '', '#/browse');
    render(<App />);
    const footerLink = within(screen.getByRole('contentinfo')).getByRole('link', {
      name: 'Suggest a recipe',
    });
    expect(footerLink).toHaveAttribute('href', '#/suggest');
    expect(footerLink).not.toHaveAttribute('aria-current');
    const main = within(screen.getByRole('main'));
    expect(main.getByRole('link', { name: 'Suggest a recipe' })).toHaveAttribute(
      'href',
      '#/suggest',
    );
  });

  it('opens from the footer link with its own title, focus, and aria-current', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const user = userEvent.setup();
    render(<App />);
    const footer = () => within(screen.getByRole('contentinfo'));
    await user.click(footer().getByRole('link', { name: 'Suggest a recipe' }));
    const heading = await screen.findByRole('heading', { level: 1, name: 'Suggest a recipe' });
    expect(window.location.hash).toBe('#/suggest');
    expect(document.title).toBe("Suggest a recipe | Twig's Cook Book");
    expect(heading).toHaveFocus();
    expect(footer().getByRole('link', { name: 'Suggest a recipe' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    // Back to a recipe
    await goToHash('#/lentil-stew');
    expect(await screen.findByRole('heading', { level: 1, name: 'Lentil Stew' })).toHaveFocus();
  });
});

describe('Getting back from All recipes', () => {
  async function openBrowseFromRecipe(user) {
    window.history.replaceState(null, '', '#/sausage-pasta');
    render(<App />);
    await user.click(screen.getByRole('checkbox', { name: /sausage/ }));
    await user.click(screen.getByRole('link', { name: 'All recipes' }));
    await screen.findByRole('heading', { level: 1, name: 'All recipes' });
  }

  it('offers a link back to the recipe you came from', async () => {
    const user = userEvent.setup();
    await openBrowseFromRecipe(user);

    const back = screen.getByRole('link', { name: 'Back to Sausage Pasta' });
    expect(back).toHaveAttribute('href', '#/sausage-pasta');
    await user.click(back);

    const heading = await screen.findByRole('heading', { level: 1, name: 'Sausage Pasta' });
    expect(heading).toHaveFocus();
    expect(window.location.hash).toBe('#/sausage-pasta');
    expect(document.title).toBe("Sausage Pasta | Twig's Cook Book");
    expect(screen.getByRole('checkbox', { name: /sausage/ })).toBeChecked();
  });

  it('goes back to the recipe when the highlighted pill is tapped again', async () => {
    const user = userEvent.setup();
    await openBrowseFromRecipe(user);

    const pill = within(screen.getByRole('banner')).getByRole('link', { name: 'All recipes' });
    expect(pill).toHaveAccessibleDescription('Back to Sausage Pasta');
    expect(pill).toHaveAttribute('aria-current', 'page');
    expect(pill).toHaveAttribute('href', '#/sausage-pasta');
    await user.click(pill);

    expect(await screen.findByRole('heading', { level: 1, name: 'Sausage Pasta' })).toHaveFocus();
    const pillOnRecipe = within(screen.getByRole('banner')).getByRole('link', {
      name: 'All recipes',
    });
    expect(pillOnRecipe).toHaveAttribute('href', '#/browse');
    expect(pillOnRecipe).not.toHaveAttribute('aria-current');
    expect(pillOnRecipe).not.toHaveAttribute('aria-describedby');
  });

  it('offers no way back on a deep link to #/browse', () => {
    window.history.replaceState(null, '', '#/browse');
    render(<App />);
    expect(screen.queryByRole('link', { name: /^Back to/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'All recipes' })).toHaveAttribute('href', '#/browse');
  });
});
