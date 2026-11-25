import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import SearchBox from './SearchBox'

const recipes = [
  {
    name: 'Lentil Stew',
    ingredients: [['1 cup lentils', '1 carrot']],
    instructions: ['Simmer everything'],
  },
  {
    name: 'Pancakes',
    ingredients: [['2 cups flour', '1 egg']],
    instructions: ['Whisk and fry'],
    notes: ['Great with maple syrup'],
  },
]

function setup() {
  const onSelect = vi.fn()
  const user = userEvent.setup()
  render(<SearchBox recipes={recipes} onSelect={onSelect} />)
  const input = screen.getByLabelText('Search recipes')
  return { user, input, onSelect }
}

// The overlay is a list of result buttons; it appears after the debounce delay.
const resultsList = () => screen.queryByRole('list')

describe('SearchBox', () => {
  it('shows matching recipes by name', async () => {
    const { user, input } = setup()
    await user.type(input, 'lentil')
    expect(await screen.findByRole('button', { name: 'Lentil Stew' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pancakes' })).not.toBeInTheDocument()
  })

  it('matches on ingredients, instructions, and notes', async () => {
    const { user, input } = setup()
    for (const term of ['flour', 'whisk', 'maple']) {
      await user.clear(input)
      await user.type(input, term)
      expect(await screen.findByRole('button', { name: 'Pancakes' })).toBeInTheDocument()
    }
  })

  it('selects a recipe, clears the input, and closes the results', async () => {
    const { user, input, onSelect } = setup()
    await user.type(input, 'pan')
    await user.click(await screen.findByRole('button', { name: 'Pancakes' }))
    expect(onSelect).toHaveBeenCalledWith(recipes[1])
    expect(input).toHaveValue('')
    expect(resultsList()).not.toBeInTheDocument()
  })

  it('closes the results when clicking outside', async () => {
    const { user, input } = setup()
    await user.type(input, 'pan')
    await screen.findByRole('list')
    await user.click(document.body)
    expect(resultsList()).not.toBeInTheDocument()
    expect(input).toHaveValue('')
  })

  // Escape with focus in the input: real browsers natively clear an <input type="search">,
  // which the "hides again when the search box is cleared" counter test covers. jsdom
  // doesn't do that, so these tests press Escape from a result button, where no native
  // clearing happens and SearchBox's own Escape handler is what closes the overlay.
  it('closes the results on Escape from a result and returns focus to the input', async () => {
    const { user, input } = setup()
    await user.type(input, 'pan')
    await screen.findByRole('list')
    await user.tab() // focus moves to the "Pancakes" result button
    expect(screen.getByRole('button', { name: 'Pancakes' })).toHaveFocus()
    await user.keyboard('{Escape}')
    // Give any follow-up renders a chance to reopen it before asserting.
    await new Promise((r) => setTimeout(r, 300))
    expect(resultsList()).not.toBeInTheDocument()
    expect(input).toHaveFocus()
    expect(input).toHaveValue('pan') // the search text is kept
  })

  it('reopens the results after Escape when the user keeps typing', async () => {
    const { user, input } = setup()
    await user.type(input, 'pan')
    await screen.findByRole('list')
    await user.tab()
    await user.keyboard('{Escape}')
    await user.type(input, 'c')
    expect(await screen.findByRole('button', { name: 'Pancakes' })).toBeInTheDocument()
  })

  describe('result counter', () => {
    const counter = () => screen.queryByRole('status')

    it('is hidden before anything is typed', () => {
      setup()
      expect(counter()).not.toBeInTheDocument()
    })

    it('shows the number of matches once the search settles', async () => {
      const { user, input } = setup()
      await user.type(input, 'pan')
      await waitFor(() => expect(counter()).toHaveTextContent('1 result'))
      expect(counter()).not.toHaveTextContent('1 results')
    })

    it('shows 0 results when nothing matches', async () => {
      const { user, input } = setup()
      await user.type(input, 'zzz')
      await waitFor(() => expect(counter()).toHaveTextContent('0 results'))
    })

    it('keeps the last count while typing instead of flashing 0', async () => {
      const { user, input } = setup()
      await user.type(input, 'pan')
      await waitFor(() => expect(counter()).toHaveTextContent('1 result'))
      await user.type(input, 'c') // the debounce hasn't fired yet
      expect(counter()).toHaveTextContent('1 result')
    })

    // In real browsers, Escape in an <input type="search"> clears the text natively.
    // jsdom doesn't do that, so simulate the clear directly.
    it('hides again when the search box is cleared', async () => {
      const { user, input } = setup()
      await user.type(input, 'pan')
      await waitFor(() => expect(counter()).toBeInTheDocument())
      await user.clear(input)
      expect(counter()).not.toBeInTheDocument()
    })
  })

  it('does not re-register document listeners on every keystroke', async () => {
    const spy = vi.spyOn(document, 'addEventListener')
    const { user, input } = setup()
    await user.type(input, 'pancake')
    await screen.findByRole('list')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Pancakes' })).toBeInTheDocument())
    const pointerdownAdds = spy.mock.calls.filter(([type]) => type === 'pointerdown').length
    spy.mockRestore()
    // One registration when the results open is expected; one per render is the bug.
    expect(pointerdownAdds).toBeLessThanOrEqual(1)
  })
})
