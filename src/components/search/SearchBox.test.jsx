import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SearchBox from './SearchBox';

const recipes = [
  {
    id: 'lentil-stew',
    name: 'Lentil Stew',
    ingredients: [{ items: ['1 cup lentils', '1 carrot'] }],
    instructions: [{ items: ['Simmer everything'] }],
  },
  {
    id: 'pancakes',
    name: 'Pancakes',
    ingredients: [{ items: ['2 cups flour', '1 egg'] }],
    instructions: [{ items: ['Whisk and fry'] }],
    notes: [{ items: ['Great with maple syrup'] }],
  },
  {
    id: 'cafe-rio-salad',
    name: 'Café Rio Salad',
    ingredients: [{ items: ['1 head romaine', '1 jalapeño'] }],
    instructions: [{ items: ['Toss together'] }],
  },
];

function setup() {
  const onSelect = vi.fn();
  const user = userEvent.setup();
  render(<SearchBox recipes={recipes} onSelect={onSelect} />);
  const input = screen.getByLabelText('Search recipes');
  return { user, input, onSelect };
}

// The overlay is a list of result buttons; it appears after the debounce delay.
const resultsList = () => screen.queryByRole('list');

describe('SearchBox', () => {
  it('shows matching recipes by name', async () => {
    const { user, input } = setup();
    await user.type(input, 'lentil');
    expect(await screen.findByRole('button', { name: 'Lentil Stew' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pancakes' })).not.toBeInTheDocument();
  });

  it('matches on ingredients, instructions, and notes', async () => {
    const { user, input } = setup();
    for (const term of ['flour', 'whisk', 'maple']) {
      await user.clear(input);
      await user.type(input, term);
      expect(await screen.findByRole('button', { name: 'Pancakes' })).toBeInTheDocument();
    }
  });

  it('ignores accents, and highlights the accented letters in the name', async () => {
    const { user, input } = setup();
    await user.type(input, 'cafe');
    const result = await screen.findByRole('button', { name: 'Café Rio Salad' });
    expect(result.querySelector('[class*="highlight"]')).toHaveTextContent(/^Café$/);
    await user.clear(input);
    await user.type(input, 'jalapeno');
    expect(await screen.findByRole('button', { name: 'Café Rio Salad' })).toBeInTheDocument();
  });

  it('matches every word of the query, in any item, and highlights each in the name', async () => {
    const { user, input } = setup();
    await user.type(input, 'stew carrot lentil');
    const result = await screen.findByRole('button', { name: 'Lentil Stew' });
    const name = result.querySelector('[class*="resultName"]');
    const highlighted = [...name.querySelectorAll('[class*="highlight"]')];
    expect(highlighted.map((el) => el.textContent)).toEqual(['Lentil', 'Stew']);
    // "carrot" isn't in the name, so the line it came from shows under it
    expect(result).toHaveAccessibleDescription('1 carrot');
    await user.clear(input);
    await user.type(input, 'lentil syrup');
    expect(await screen.findByText('No recipes match')).toBeInTheDocument();
  });

  it('lists name matches before other matches', async () => {
    const user = userEvent.setup();
    const soup = {
      id: 'soup',
      name: 'Baked Potato Soup',
      ingredients: [{ items: ['4 cups chicken stock'] }],
      instructions: [{ items: ['Simmer'] }],
    };
    const curry = { ...soup, id: 'curry', name: 'Chicken Curry' };
    render(<SearchBox recipes={[soup, curry]} onSelect={() => {}} />);
    await user.type(screen.getByLabelText('Search recipes'), 'chicken');
    await screen.findByRole('list');
    const [first, second] = screen.getAllByRole('button');
    expect(first).toHaveAccessibleName('Chicken Curry');
    expect(second).toHaveAccessibleName('Baked Potato Soup');
  });

  it('shows the matching line when the name has no match', async () => {
    const { user, input } = setup();
    await user.type(input, 'flour');
    const result = await screen.findByRole('button', { name: 'Pancakes' });
    expect(result).toHaveAccessibleDescription('2 cups flour');
    expect(result).toHaveTextContent('2 cups flour');
  });

  it('shows no extra line when the name has every word', async () => {
    const { user, input } = setup();
    await user.type(input, 'lentil');
    const result = await screen.findByRole('button', { name: 'Lentil Stew' });
    expect(result).not.toHaveAccessibleDescription();
    expect(result).toHaveTextContent(/^Lentil Stew$/);
  });

  it('says so in the results panel when nothing matches', async () => {
    const { user, input } = setup();
    await user.type(input, 'zzz');
    expect(await screen.findByText('No recipes match')).toBeInTheDocument();
    expect(resultsList()).not.toBeInTheDocument();
  });

  it('selects a recipe, clears the input, and closes the results', async () => {
    const { user, input, onSelect } = setup();
    await user.type(input, 'pan');
    await user.click(await screen.findByRole('button', { name: 'Pancakes' }));
    expect(onSelect).toHaveBeenCalledWith(recipes[1]);
    expect(input).toHaveValue('');
    expect(resultsList()).not.toBeInTheDocument();
  });

  it('closes the results when clicking outside', async () => {
    const { user, input } = setup();
    await user.type(input, 'pan');
    await screen.findByRole('list');
    await user.click(document.body);
    expect(resultsList()).not.toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  // Escape with focus in the input: real browsers natively clear an <input type="search">,
  // which the "hides again when the search box is cleared" counter test covers. jsdom
  // doesn't do that, so these tests press Escape from a result button, where no native
  // clearing happens and SearchBox's own Escape handler is what closes the overlay.
  it('closes the results on Escape from a result and returns focus to the input', async () => {
    const { user, input } = setup();
    await user.type(input, 'pan');
    await screen.findByRole('list');
    await user.tab(); // focus moves to the "Pancakes" result button
    expect(screen.getByRole('button', { name: 'Pancakes' })).toHaveFocus();
    await user.keyboard('{Escape}');
    // Give any follow-up renders a chance to reopen it before asserting.
    await new Promise((r) => setTimeout(r, 300));
    expect(resultsList()).not.toBeInTheDocument();
    expect(input).toHaveFocus();
    expect(input).toHaveValue('pan'); // the search text is kept
  });

  it('reopens the results after Escape when the user keeps typing', async () => {
    const { user, input } = setup();
    await user.type(input, 'pan');
    await screen.findByRole('list');
    await user.tab();
    await user.keyboard('{Escape}');
    await user.type(input, 'c');
    expect(await screen.findByRole('button', { name: 'Pancakes' })).toBeInTheDocument();
  });

  describe('result counter', () => {
    const counter = () => screen.queryByRole('status');

    it('is hidden before anything is typed', () => {
      setup();
      expect(counter()).not.toBeInTheDocument();
    });

    it('shows the number of matches once the search settles', async () => {
      const { user, input } = setup();
      await user.type(input, 'pan');
      await waitFor(() => expect(counter()).toHaveTextContent('1 result'));
      expect(counter()).not.toHaveTextContent('1 results');
    });

    it('shows 0 results when nothing matches', async () => {
      const { user, input } = setup();
      await user.type(input, 'zzz');
      await waitFor(() => expect(counter()).toHaveTextContent('0 results'));
    });

    it('keeps the last count while typing instead of flashing 0', async () => {
      const { user, input } = setup();
      await user.type(input, 'pan');
      await waitFor(() => expect(counter()).toHaveTextContent('1 result'));
      await user.type(input, 'c'); // the debounce hasn't fired yet
      expect(counter()).toHaveTextContent('1 result');
    });

    // In real browsers, Escape in an <input type="search"> clears the text natively.
    // jsdom doesn't do that, so simulate the clear directly.
    it('hides again when the search box is cleared', async () => {
      const { user, input } = setup();
      await user.type(input, 'pan');
      await waitFor(() => expect(counter()).toBeInTheDocument());
      await user.clear(input);
      expect(counter()).not.toBeInTheDocument();
    });
  });

  it('does not re-register document listeners on every keystroke', async () => {
    const spy = vi.spyOn(document, 'addEventListener');
    const { user, input } = setup();
    await user.type(input, 'pancake');
    await screen.findByRole('list');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Pancakes' })).toBeInTheDocument(),
    );
    const pointerdownAdds = spy.mock.calls.filter(([type]) => type === 'pointerdown').length;
    spy.mockRestore();
    // One registration when the results open is expected; one per render is the bug.
    expect(pointerdownAdds).toBeLessThanOrEqual(1);
  });
});
