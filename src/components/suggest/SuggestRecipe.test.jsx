import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SuggestRecipe from './SuggestRecipe';

// Tests pass endpoint and turnstileSiteKey explicitly, so a developer's .env.local (which
// Vitest also loads) can't change what they test.
const ENDPOINT = 'https://relay.test/suggest';
const DRAFT_KEY = 'recipes:suggestion-draft';

function mockFetch(response = new Response('{"ok":true}', { status: 200 })) {
  const fetch = vi
    .fn()
    .mockImplementation(async () => (typeof response === 'function' ? response() : response));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

async function fillRequired(user) {
  await user.type(screen.getByRole('textbox', { name: 'Recipe name' }), 'Grandma Soup');
  await user.type(screen.getByRole('textbox', { name: /^Ingredients/ }), '1 onion{Enter}2 carrots');
  await user.type(screen.getByRole('textbox', { name: /^Steps/ }), 'Chop. Simmer 20 min.');
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete window.turnstile;
});

describe('SuggestRecipe', () => {
  it('links to GitHub instead when no relay is set up', () => {
    render(<SuggestRecipe endpoint="" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Suggest a recipe' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'suggest a recipe on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/grfinch/recipes/issues/new',
    );
    expect(screen.queryByRole('button', { name: 'Send suggestion' })).not.toBeInTheDocument();
  });

  it('labels every field, marks the required ones, and offers the real categories', () => {
    render(<SuggestRecipe endpoint={ENDPOINT} turnstileSiteKey="" />);
    expect(screen.getByRole('textbox', { name: 'Recipe name' })).toBeRequired();
    expect(screen.getByRole('textbox', { name: 'Ingredients' })).toBeRequired();
    expect(screen.getByRole('textbox', { name: 'Ingredients' })).toHaveAccessibleDescription(
      'One per line, with amounts if you know them.',
    );
    expect(screen.getByRole('textbox', { name: 'Steps' })).toBeRequired();
    expect(screen.getByRole('textbox', { name: 'Your name (optional)' })).not.toBeRequired();
    expect(screen.getByRole('textbox', { name: "Where it's from (optional)" })).toBeVisible();
    expect(
      screen.getByRole('textbox', { name: 'Tips, swaps, or servings (optional)' }),
    ).toBeVisible();
    const course = screen.getByRole('combobox', { name: 'Course (optional)' });
    expect(within(course).getByRole('option', { name: 'Not sure' })).toHaveProperty(
      'selected',
      true,
    );
    expect(within(course).getByRole('option', { name: 'Dessert' })).toBeInTheDocument();
    const method = screen.getByRole('combobox', { name: 'Cooking method (optional)' });
    expect(within(method).getByRole('option', { name: 'Instant-pot' })).toBeInTheDocument();
  });

  it('shows no errors until Send, then a focused summary that links to each field', async () => {
    const fetch = mockFetch();
    const user = userEvent.setup();
    render(<SuggestRecipe endpoint={ENDPOINT} turnstileSiteKey="" />);
    const name = screen.getByRole('textbox', { name: 'Recipe name' });
    expect(name).not.toHaveAttribute('aria-invalid');

    await user.click(screen.getByRole('button', { name: 'Send suggestion' }));
    expect(fetch).not.toHaveBeenCalled();
    const summary = screen.getByRole('heading', {
      name: 'There are 3 problems with your suggestion',
    }).parentElement;
    expect(summary).toHaveFocus();
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription('Enter the recipe name.');

    await user.click(within(summary).getByRole('link', { name: 'Enter the steps.' }));
    expect(screen.getByRole('textbox', { name: 'Steps' })).toHaveFocus();
    expect(window.location.hash).toBe(''); // the summary links don't change the page

    // Fixing a field clears its error as you type
    await user.type(name, 'Soup');
    expect(name).not.toHaveAttribute('aria-invalid');
    expect(screen.getByRole('heading', { name: 'There are 2 problems with your suggestion' }));
  });

  it('sends the suggestion, thanks the visitor, and clears the draft', async () => {
    const fetch = mockFetch();
    const user = userEvent.setup();
    render(<SuggestRecipe endpoint={ENDPOINT} turnstileSiteKey="" />);
    await fillRequired(user);
    await user.selectOptions(screen.getByRole('combobox', { name: /^Course/ }), 'Soup');
    await user.type(screen.getByRole('textbox', { name: /^Your name/ }), '  Sam  ');
    expect(localStorage.getItem(DRAFT_KEY)).toContain('Grandma Soup');

    await user.click(screen.getByRole('button', { name: 'Send suggestion' }));

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(ENDPOINT);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      name: 'Grandma Soup',
      ingredients: '1 onion\n2 carrots',
      steps: 'Chop. Simmer 20 min.',
      course: 'Soup',
      cookingMethod: '',
      notes: '',
      source: '',
      submitter: 'Sam',
      website: '',
      turnstileToken: '',
    });
    const thanks = await screen.findByRole('heading', { level: 1, name: 'Thanks for the recipe!' });
    expect(thanks).toHaveFocus();
    expect(screen.getByRole('link', { name: 'Browse all recipes' })).toHaveAttribute(
      'href',
      '#/browse',
    );
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Suggest another recipe' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Suggest a recipe' })).toHaveFocus();
    expect(screen.getByRole('textbox', { name: 'Recipe name' })).toHaveValue('');
  });

  it('keeps everything and offers a copy when sending fails', async () => {
    mockFetch(() => new Response('nope', { status: 502 }));
    const user = userEvent.setup(); // also installs a fake clipboard
    render(<SuggestRecipe endpoint={ENDPOINT} turnstileSiteKey="" />);
    await fillRequired(user);
    await user.click(screen.getByRole('button', { name: 'Send suggestion' }));

    expect(await screen.findByRole('alert')).toHaveTextContent("Your recipe wasn't sent.");
    expect(screen.getByRole('textbox', { name: 'Recipe name' })).toHaveValue('Grandma Soup');
    expect(screen.getByRole('button', { name: 'Send suggestion' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Copy my recipe' }));
    expect(await screen.findByText('Copied.')).toBeInTheDocument();
    await expect(navigator.clipboard.readText()).resolves.toBe(
      'Recipe name:\nGrandma Soup\n\nIngredients:\n1 onion\n2 carrots\n\nSteps:\nChop. Simmer 20 min.',
    );
  });

  it('treats a network error like a failed send', async () => {
    mockFetch(() => Promise.reject(new TypeError('Failed to fetch')));
    const user = userEvent.setup();
    render(<SuggestRecipe endpoint={ENDPOINT} turnstileSiteKey="" />);
    await fillRequired(user);
    await user.click(screen.getByRole('button', { name: 'Send suggestion' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("Your recipe wasn't sent.");
  });

  it('brings back an unsent draft, and ignores a corrupt one', () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ name: 'Half-typed Pie', extra: 'x' }));
    const { unmount } = render(<SuggestRecipe endpoint={ENDPOINT} turnstileSiteKey="" />);
    expect(screen.getByRole('textbox', { name: 'Recipe name' })).toHaveValue('Half-typed Pie');
    unmount();

    localStorage.setItem(DRAFT_KEY, '{not json');
    render(<SuggestRecipe endpoint={ENDPOINT} turnstileSiteKey="" />);
    expect(screen.getByRole('textbox', { name: 'Recipe name' })).toHaveValue('');
  });

  it('rejects text over the limit with a clear message', async () => {
    mockFetch();
    const user = userEvent.setup();
    render(<SuggestRecipe endpoint={ENDPOINT} turnstileSiteKey="" />);
    await fillRequired(user);
    const name = screen.getByRole('textbox', { name: 'Recipe name' });
    await user.clear(name);
    await user.click(name);
    await user.paste('x'.repeat(121));
    await user.click(screen.getByRole('button', { name: 'Send suggestion' }));
    expect(name).toHaveAccessibleDescription(
      'Recipe name is too long: 121 characters, and the limit is 120.',
    );
  });

  describe('with the spam check', () => {
    function fakeTurnstile({ pass }) {
      const widget = { callback: null };
      window.turnstile = {
        render: vi.fn((el, options) => {
          widget.callback = options.callback;
          if (pass) setTimeout(() => options.callback('token-123'));
          return 'widget-1';
        }),
        reset: vi.fn(),
        remove: vi.fn(),
      };
      return widget;
    }

    it('sends the token once the check passes', async () => {
      fakeTurnstile({ pass: true });
      const fetch = mockFetch();
      const user = userEvent.setup();
      render(<SuggestRecipe endpoint={ENDPOINT} turnstileSiteKey="site-key" />);
      await fillRequired(user);
      await user.click(screen.getByRole('button', { name: 'Send suggestion' }));
      expect(JSON.parse(fetch.mock.calls[0][1].body).turnstileToken).toBe('token-123');
      expect(window.turnstile.render.mock.calls[0][1].sitekey).toBe('site-key');
    });

    it("asks the visitor to wait when the check hasn't finished", async () => {
      fakeTurnstile({ pass: false });
      const fetch = mockFetch();
      const user = userEvent.setup();
      render(<SuggestRecipe endpoint={ENDPOINT} turnstileSiteKey="site-key" />);
      await fillRequired(user);
      await user.click(screen.getByRole('button', { name: 'Send suggestion' }));
      expect(fetch).not.toHaveBeenCalled();
      expect(
        screen.getByRole('link', {
          name: 'Wait a moment for the spam check to finish, then send again.',
        }),
      ).toBeVisible();
    });

    it('gets a fresh token after a failed send', async () => {
      fakeTurnstile({ pass: true });
      mockFetch(() => new Response('nope', { status: 500 }));
      const user = userEvent.setup();
      render(<SuggestRecipe endpoint={ENDPOINT} turnstileSiteKey="site-key" />);
      await fillRequired(user);
      await user.click(screen.getByRole('button', { name: 'Send suggestion' }));
      await screen.findByRole('alert');
      expect(window.turnstile.reset).toHaveBeenCalledWith('widget-1');
    });
  });
});
