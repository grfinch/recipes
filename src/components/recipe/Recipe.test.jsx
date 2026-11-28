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

test('credits the contributor under the title, as plain text', () => {
  render(<Recipe recipe={{ ...recipe, contributor: 'Sam' }} />);

  const term = screen.getByText('Shared by');
  expect(term).toHaveRole('term');
  expect(term.nextElementSibling).toHaveTextContent('Sam');
  expect(term.nextElementSibling).toHaveRole('definition');
  expect(screen.queryByRole('link', { name: 'Sam' })).not.toBeInTheDocument();
});

test('shows no credit when the recipe has no contributor or thanks', () => {
  render(<Recipe recipe={recipe} />);

  expect(screen.queryByText('Shared by')).not.toBeInTheDocument();
  expect(screen.queryByText('Thanks to')).not.toBeInTheDocument();
});

test('thanks the people whose suggested changes were used, in order', () => {
  render(<Recipe recipe={{ ...recipe, contributor: 'Sam', thanks: ['Ana', 'Lee'] }} />);

  const term = screen.getByText('Thanks to');
  expect(term).toHaveRole('term');
  expect(term.nextElementSibling).toHaveTextContent(/^Ana, Lee$/);
});

test('credits the contributor even when the recipe has no course or cooking method', () => {
  const { course: _course, cookingMethod: _method, ...bare } = recipe;
  render(<Recipe recipe={{ ...bare, contributor: 'Sam' }} />);

  expect(screen.getByText('Shared by')).toBeInTheDocument();
  expect(screen.getByText('Sam')).toBeInTheDocument();
});
