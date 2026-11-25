import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

// Two recipes that share an ingredient and a step, like the real data does.
vi.mock('./recipes.json', () => ({
  default: {
    recipes: [
      {
        name: 'Lentil Stew',
        ingredients: [['1 Tbsp olive oil', '1 cup lentils']],
        instructions: ['Heat the oil', 'Simmer'],
      },
      {
        name: 'Sausage Pasta',
        ingredients: [['1 Tbsp olive oil', '1 lb sausage']],
        instructions: ['Heat the oil', 'Boil pasta'],
      },
    ],
  },
}))

afterEach(() => vi.restoreAllMocks())

describe('App', () => {
  it('picks the random first recipe only once, not on every render', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0)
    const { rerender } = render(<App />)
    rerender(<App />)
    rerender(<App />)
    expect(random).toHaveBeenCalledTimes(1)
  })

  it('resets checked items when switching to another recipe', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // start on Lentil Stew
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Lentil Stew')

    await user.click(screen.getByRole('checkbox', { name: /olive oil/ }))
    await user.click(screen.getByRole('button', { name: /Heat the oil/ }))
    expect(screen.getByRole('checkbox', { name: /olive oil/ })).toBeChecked()

    await user.type(screen.getByLabelText('Search recipes'), 'pasta')
    await user.click(await screen.findByRole('button', { name: 'Sausage Pasta' }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sausage Pasta')

    expect(screen.getByRole('checkbox', { name: /olive oil/ })).not.toBeChecked()
    expect(screen.getByRole('button', { name: /Heat the oil/ })).toHaveAttribute('aria-pressed', 'false')
  })
})
