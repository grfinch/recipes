import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import App from './App';

// Separate file because vi.mock replaces recipes.json for the whole file.
vi.mock('./recipes.json', () => ({ default: { recipes: [] } }));

it('renders a message instead of crashing when there are no recipes', () => {
  render(<App />);
  expect(screen.getByText(/no recipes/i)).toBeInTheDocument();
  expect(screen.getByLabelText('Search recipes')).toBeInTheDocument();
});
