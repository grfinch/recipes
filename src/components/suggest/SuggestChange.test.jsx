import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SuggestChange from './SuggestChange';

// Tests pass endpoint and turnstileSiteKey explicitly, so a developer's .env.local (which
// Vitest also loads) can't change what they test.
const ENDPOINT = 'https://relay.test/suggest';
const recipe = { id: 'apple-crisp', name: 'Apple Crisp' };
const DRAFT_KEY = 'recipes:change-draft:apple-crisp';

function mockFetch(response = new Response('{"ok":true}', { status: 200 })) {
  const fetch = vi.fn().mockImplementation(async () => response);
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

const renderForm = () =>
  render(<SuggestChange recipe={recipe} endpoint={ENDPOINT} turnstileSiteKey="" />);
const details = () => screen.getByRole('textbox', { name: 'Your suggestion' });
const send = () => screen.getByRole('button', { name: 'Send suggestion' });

afterEach(() => vi.unstubAllGlobals());

describe('SuggestChange', () => {
  it('links to a new GitHub issue about the recipe when no relay is set up', () => {
    render(<SuggestChange recipe={recipe} endpoint="" />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Suggest a change to Apple Crisp' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'suggest a change on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/grfinch/recipes/issues/new?title=Change+to+Apple+Crisp',
    );
    expect(screen.getByRole('link', { name: 'Back to Apple Crisp' })).toHaveAttribute(
      'href',
      '#/apple-crisp',
    );
  });

  it('labels every field, and starts on "An improvement"', () => {
    renderForm();
    const kind = screen.getByRole('combobox', { name: 'What kind of change' });
    expect(within(kind).getByRole('option', { name: 'An improvement' })).toHaveProperty(
      'selected',
      true,
    );
    expect(
      within(kind)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Something is wrong', 'An improvement', 'A tip or variation']);
    expect(details()).toBeRequired();
    expect(details()).toHaveAccessibleDescription(
      'Which ingredient or step, and what to change. Amounts, times, and temperatures help.',
    );
    expect(screen.getByRole('textbox', { name: 'Your name (optional)' })).not.toBeRequired();
  });

  it('shows a focused error summary on an empty Send, and sends nothing', async () => {
    const fetch = mockFetch();
    const user = userEvent.setup();
    renderForm();
    await user.click(send());
    expect(fetch).not.toHaveBeenCalled();
    const summary = screen.getByRole('heading', {
      name: 'There is 1 problem with your suggestion',
    }).parentElement;
    expect(summary).toHaveFocus();
    expect(details()).toHaveAttribute('aria-invalid', 'true');

    await user.click(within(summary).getByRole('link', { name: 'Enter your suggestion.' }));
    expect(details()).toHaveFocus();
    expect(window.location.hash).toBe('');
  });

  it('sends the recipe id, kind, and text, then thanks the visitor', async () => {
    const fetch = mockFetch();
    const user = userEvent.setup();
    renderForm();
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'What kind of change' }),
      'Something is wrong',
    );
    await user.type(details(), '  Bake 10 minutes longer.  ');
    await user.click(send());

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(ENDPOINT);
    expect(JSON.parse(init.body)).toEqual({
      type: 'change',
      recipeId: 'apple-crisp',
      kind: 'fix',
      details: 'Bake 10 minutes longer.',
      submitter: '',
      website: '',
      turnstileToken: '',
    });
    const thanks = await screen.findByRole('heading', {
      level: 1,
      name: 'Thanks for the suggestion!',
    });
    expect(thanks).toHaveFocus();
    expect(screen.getByRole('link', { name: 'Back to Apple Crisp' })).toBeVisible();
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Suggest another change' }));
    expect(
      screen.getByRole('heading', { level: 1, name: 'Suggest a change to Apple Crisp' }),
    ).toHaveFocus();
    expect(details()).toHaveValue('');
  });

  it('keeps what was typed when sending fails, and says so', async () => {
    mockFetch(new Response('{}', { status: 502 }));
    const user = userEvent.setup();
    renderForm();
    await user.type(details(), 'Use less sugar.');
    await user.click(send());
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Your suggestion wasn't sent. Nothing you typed was lost.",
    );
    expect(details()).toHaveValue('Use less sugar.');
  });

  it('keeps an unsent draft for each recipe', async () => {
    const user = userEvent.setup();
    const { unmount } = renderForm();
    await user.type(details(), 'Add cinnamon.');
    unmount();
    expect(JSON.parse(localStorage.getItem(DRAFT_KEY))).toMatchObject({
      details: 'Add cinnamon.',
    });

    renderForm();
    expect(details()).toHaveValue('Add cinnamon.');
  });
});
