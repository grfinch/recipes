import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import ThemePicker from './ThemePicker';

const html = document.documentElement;

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
  it('offers System, Light and Dark in a Theme group, with System chosen at first', () => {
    render(<ThemePicker />);
    expect(screen.getByRole('group', { name: 'Theme' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'System' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Light' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Dark' })).not.toBeChecked();
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

    await user.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
    expect(html.dataset.theme).toBe('dark');
    expect(localStorage.getItem('recipes:theme')).toBe('dark');
    expect(system.listeners.size).toBe(0); // no longer following the system
  });

  it('goes back to following the system, and forgets the saved choice', async () => {
    localStorage.setItem('recipes:theme', 'light');
    fakeSystemTheme(true);
    const user = userEvent.setup();
    render(<ThemePicker />);
    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();
    expect(html.dataset.theme).toBe('light');

    await user.click(screen.getByRole('radio', { name: 'System' }));
    expect(html.dataset.theme).toBe('dark');
    expect(localStorage.getItem('recipes:theme')).toBeNull();
  });

  it('ignores an unknown saved value', () => {
    localStorage.setItem('recipes:theme', 'purple');
    render(<ThemePicker />);
    expect(screen.getByRole('radio', { name: 'System' })).toBeChecked();
    expect(html.dataset.theme).toBe('light'); // no matchMedia: light
  });

  it('picks up a choice made in another tab', () => {
    render(<ThemePicker />);
    act(() => {
      localStorage.setItem('recipes:theme', 'dark');
      window.dispatchEvent(new StorageEvent('storage', { key: 'recipes:theme' }));
    });
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
    expect(html.dataset.theme).toBe('dark');
  });

  it('changes with the arrow keys, like any radio group', async () => {
    const user = userEvent.setup();
    render(<ThemePicker />);
    await user.tab();
    expect(screen.getByRole('radio', { name: 'System' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();
    expect(html.dataset.theme).toBe('light');
  });
});
