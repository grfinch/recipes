import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RecipeSection from './RecipeSection';

afterEach(() => vi.restoreAllMocks());

describe('RecipeSection', () => {
  it('gives instruction steps an accessible name that includes the step text', () => {
    render(
      <RecipeSection
        header="Instructions"
        listItems={['Heat the oil', 'Simmer']}
        ordered
        clickable
      />,
    );
    // Screen readers announce the accessible name, so it must include the instruction itself.
    expect(screen.getByRole('button', { name: /Heat the oil/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Simmer/ })).toBeInTheDocument();
  });

  it('hides group dividers from screen readers', () => {
    render(
      <RecipeSection
        header="Ingredients"
        listItems={[['1 cup flour', '1 egg'], ['1 tsp salt']]}
        ordered={false}
        clickable
      />,
    );
    // getAllByRole skips aria-hidden elements, so only the 3 real items count.
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('treats identical items in one list as separate items', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    render(
      <RecipeSection
        header="Ingredients"
        listItems={[['1 tsp salt', '1 cup rice', '1 tsp salt']]}
        ordered={false}
        clickable
      />,
    );
    const [firstSalt, secondSalt] = screen.getAllByRole('checkbox', { name: /salt/ });
    await user.click(firstSalt);
    expect(firstSalt).toBeChecked();
    expect(secondSalt).not.toBeChecked();

    // React reports duplicate keys through console.error
    const keyWarnings = consoleError.mock.calls.filter((args) =>
      String(args[0]).includes('same key'),
    );
    expect(keyWarnings).toEqual([]);
  });
});
