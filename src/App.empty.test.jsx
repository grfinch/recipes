import { render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import App from './App';

// Separate file because vi.mock replaces the recipe list for the whole file.
vi.mock('./recipes/index.js', () => ({ default: [] }));

it('renders a message instead of crashing when there are no recipes', () => {
  render(<App />);
  expect(screen.getByText(/no recipes/i)).toBeInTheDocument();
  expect(screen.getByLabelText('Search recipes')).toBeInTheDocument();
  const main = within(screen.getByRole('main'));
  expect(main.getByRole('link', { name: 'Suggest a recipe' })).toHaveAttribute('href', '#/suggest');
});
