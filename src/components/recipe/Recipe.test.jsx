import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import Recipe from './Recipe';

const recipe = {
  id: 'toast',
  name: 'Toast',
  course: 'Breakfast',
  cookingMethod: 'Stovetop',
  ingredients: [{ items: ['1 slice bread'] }],
  instructions: [{ items: ['Toast the bread.'] }],
};

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

test('Print opens the browser print dialog', async () => {
  const print = vi.spyOn(window, 'print').mockImplementation(() => {});
  const user = userEvent.setup();
  render(<Recipe recipe={recipe} />);

  await user.click(screen.getByRole('button', { name: 'Print' }));

  expect(print).toHaveBeenCalledTimes(1);
});

test('a done step still has its number in the page, for printing', async () => {
  const user = userEvent.setup();
  render(<Recipe recipe={recipe} />);
  const step = screen.getByRole('button', { name: /Toast the bread/ });

  await user.click(step);

  expect(step).toHaveAttribute('aria-pressed', 'true');
  expect(step).toHaveTextContent('1.');
});

test('shows the course and cooking method, each linking to the browse page filtered by it', () => {
  render(<Recipe recipe={recipe} />);

  expect(screen.getByRole('link', { name: 'Breakfast' })).toHaveAttribute(
    'href',
    '#/browse?course=Breakfast',
  );
  expect(screen.getByRole('link', { name: 'Stovetop' })).toHaveAttribute(
    'href',
    '#/browse?method=Stovetop',
  );
  expect(screen.getByText('Course')).toBeInTheDocument();
  expect(screen.getByText('Cooking method')).toBeInTheDocument();
});
