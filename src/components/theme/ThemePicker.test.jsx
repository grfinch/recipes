import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import ThemePicker from './ThemePicker';

const html = document.documentElement;
const button = () => screen.getByRole('button', { name: 'Theme' });
const choice = (name) => screen.getByRole('radio', { name });

// jsdom has no matchMedia. A fake one for (prefers-color-scheme: dark) that tests can flip.
function fakeSystemTheme(dark) {
  const listeners = new Set();
  const query = {
    get matches() {
      return dark;
    },
    addEventListener: (_type, fn) => listeners.add(fn),
    removeEventListener: (_type, fn) => listeners.delete(fn),
  };
  window.matchMedia = () => query;
  return {
    listeners,
    set(next) {
      dark = next;
      act(() => listeners.forEach((fn) => fn()));
    },
  };
}

afterEach(() => {
  delete window.matchMedia;
});

describe('ThemePicker', () => {
  it('is a closed Theme button that opens a Theme group of System, Light and Dark', async () => {
    const user = userEvent.setup();
    render(<ThemePicker />);
    expect(button()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('group', { name: 'Theme' })).not.toBeInTheDocument();

    await user.click(button());
    expect(button()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('group', { name: 'Theme' })).toBeVisible();
    expect(screen.getAllByRole('radio').map((r) => r.labels[0].textContent)).toEqual([
      'System',
      'Light',
      'Dark',
    ]);
    expect(choice('System')).toBeChecked();
  });

  it('follows the system theme, including when it changes', () => {
    const system = fakeSystemTheme(true);
    render(<ThemePicker />);
    expect(html.dataset.theme).toBe('dark');
    system.set(false);
    expect(html.dataset.theme).toBe('light');
  });

  it('applies and saves a chosen theme, which overrides the system', async () => {
    const system = fakeSystemTheme(false);
    const user = userEvent.setup();
    render(<ThemePicker />);
    await user.click(button());
    await user.click(choice('Dark'));
    expect(choice('Dark')).toBeChecked();
    expect(html.dataset.theme).toBe('dark');
    expect(localStorage.getItem('recipes:theme')).toBe('dark');
    expect(system.listeners.size).toBe(0); // no longer following the system
  });

  it('goes back to following the system, and forgets the saved choice', async () => {
    localStorage.setItem('recipes:theme', 'light');
    fakeSystemTheme(true);
    const user = userEvent.setup();
    render(<ThemePicker />);
    expect(html.dataset.theme).toBe('light');
    await user.click(button());
    expect(choice('Light')).toBeChecked();

    await user.click(choice('System'));
    expect(html.dataset.theme).toBe('dark');
    expect(localStorage.getItem('recipes:theme')).toBeNull();
  });

  it('ignores an unknown saved value', async () => {
    localStorage.setItem('recipes:theme', 'purple');
    const user = userEvent.setup();
    render(<ThemePicker />);
    expect(html.dataset.theme).toBe('light'); // no matchMedia: light
    await user.click(button());
    expect(choice('System')).toBeChecked();
  });

  it('picks up a choice made in another tab', () => {
    render(<ThemePicker />);
    act(() => {
      localStorage.setItem('recipes:theme', 'dark');
      window.dispatchEvent(new StorageEvent('storage', { key: 'recipes:theme' }));
    });
    expect(screen.getByRole('radio', { name: 'Dark', hidden: true })).toBeChecked(); // panel closed
    expect(html.dataset.theme).toBe('dark');
  });

  it('works from the keyboard: Tab into the panel, arrows choose, Escape closes', async () => {
    const user = userEvent.setup();
    render(<ThemePicker />);
    await user.tab();
    expect(button()).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.tab();
    expect(choice('System')).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(choice('Light')).toBeChecked();
    expect(html.dataset.theme).toBe('light');

    await user.keyboard('{Escape}');
    expect(button()).toHaveAttribute('aria-expanded', 'false');
    expect(button()).toHaveFocus();
  });

  it('closes on a tap outside, or when focus moves elsewhere', async () => {
    const user = userEvent.setup();
    render(
      <>
        <ThemePicker />
        <button type="button">Elsewhere</button>
      </>,
    );
    await user.click(button());
    await user.click(document.body);
    expect(button()).toHaveAttribute('aria-expanded', 'false');

    await user.click(button());
    screen.getByRole('button', { name: 'Elsewhere' }).focus();
    await act(async () => {});
    expect(button()).toHaveAttribute('aria-expanded', 'false');
  });
});
