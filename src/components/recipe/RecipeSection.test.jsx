import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import useCheckedItems from '../../hooks/useCheckedItems';
import RecipeSection from './RecipeSection';

afterEach(() => vi.restoreAllMocks());

// RecipeSection's items are controlled; this supplies the state Recipe normally owns.
function StatefulSection(props) {
  const [checked, toggle] = useCheckedItems('test-recipe');
  return <RecipeSection {...props} checked={checked} onToggle={toggle} />;
}

describe('RecipeSection', () => {
  it('gives instruction steps an accessible name that includes the step text', () => {
    render(
      <RecipeSection
        header="Instructions"
        groups={[{ items: ['Heat the oil', 'Simmer'] }]}
        ordered
        clickable
      />,
    );
    // Screen readers announce the accessible name, so it must include the instruction itself.
    expect(screen.getByRole('button', { name: /Heat the oil/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Simmer/ })).toBeInTheDocument();
  });

  // jsdom joins the number and text without a space ("1.Heat"); browsers add one.
  it('restarts step numbers at 1 in each group', () => {
    render(
      <RecipeSection
        header="Instructions"
        groups={[{ items: ['Heat the oil', 'Add onion'] }, { items: ['Add broth', 'Simmer'] }]}
        ordered
        clickable
      />,
    );
    expect(screen.getByRole('button', { name: /^1\.\s*Heat the oil$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^2\.\s*Add onion$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^1\.\s*Add broth$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^2\.\s*Simmer$/ })).toBeInTheDocument();
  });

  it('shows group titles as headings under the section heading', () => {
    render(
      <RecipeSection
        header="Ingredients"
        groups={[{ title: 'For the sauce', items: ['1 jar pasta sauce'] }, { items: ['1 egg'] }]}
        ordered={false}
        clickable
      />,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Ingredients' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'For the sauce' })).toBeInTheDocument();
    // Untitled groups get no heading
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1);
  });

  it('puts each group in its own list, with no separator text', () => {
    render(
      <RecipeSection
        header="Ingredients"
        groups={[{ items: ['1 cup flour', '1 egg'] }, { items: ['1 tsp salt'] }]}
        ordered={false}
        clickable
      />,
    );
    const lists = screen.getAllByRole('list');
    expect(lists).toHaveLength(2);
    expect(within(lists[0]).getAllByRole('listitem')).toHaveLength(2);
    expect(within(lists[1]).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.queryByText('---')).not.toBeInTheDocument();
  });

  it('toggles instruction steps from the keyboard', async () => {
    const user = userEvent.setup();
    render(
      <StatefulSection
        header="Instructions"
        groups={[{ items: ['Heat the oil'] }]}
        ordered
        clickable
      />,
    );
    const step = screen.getByRole('button', { name: /Heat the oil/ });
    expect(step).toHaveAttribute('aria-pressed', 'false');

    step.focus();
    await user.keyboard('{Enter}');
    expect(step).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard(' ');
    expect(step).toHaveAttribute('aria-pressed', 'false');
  });

  it('names ingredient checkboxes by their visible text', () => {
    render(
      <RecipeSection
        header="Ingredients"
        groups={[{ items: ['1 cup flour'] }]}
        ordered={false}
        clickable
      />,
    );
    expect(screen.getByRole('checkbox', { name: '1 cup flour' })).toBeInTheDocument();
  });

  it('treats identical items, in one group or across groups, as separate items', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    render(
      <StatefulSection
        header="Ingredients"
        groups={[{ items: ['1 tsp salt', '1 cup rice', '1 tsp salt'] }, { items: ['1 tsp salt'] }]}
        ordered={false}
        clickable
      />,
    );
    const salts = screen.getAllByRole('checkbox', { name: /salt/ });
    expect(salts).toHaveLength(3);
    await user.click(salts[0]);
    expect(salts.map((box) => box.checked)).toEqual([true, false, false]);
    await user.click(salts[2]);
    expect(salts.map((box) => box.checked)).toEqual([true, false, true]);

    // React reports duplicate keys through console.error
    const keyWarnings = consoleError.mock.calls.filter((args) =>
      String(args[0]).includes('same key'),
    );
    expect(keyWarnings).toEqual([]);
  });
});
