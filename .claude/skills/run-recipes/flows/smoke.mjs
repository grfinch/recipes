// Smoke test: the page renders, search finds a recipe, selecting it shows it,
// and an ingredient can be checked off.
export default async function smoke({ page, shot, check }) {
  const heading = page.getByRole('heading', { level: 1 })
  check('a recipe renders on load', (await heading.textContent()).trim().length > 0, await heading.textContent())
  await page.screenshot({ path: shot('smoke-1-loaded.png') })

  const input = page.getByLabel('Search recipes')
  await input.pressSequentially('pasta', { delay: 30 })
  const result = page.getByRole('button', { name: 'Instant-pot Creamy Sausage Pasta' })
  await result.waitFor()
  check('search shows a matching result', true)
  await page.screenshot({ path: shot('smoke-2-search.png') })

  await result.click()
  await page.getByRole('heading', { level: 1, name: 'Instant-pot Creamy Sausage Pasta' }).waitFor()
  check('selecting a result shows that recipe', true)

  const oil = page.getByRole('checkbox', { name: /olive oil/ })
  await oil.check()
  check('an ingredient can be checked', await oil.isChecked())
  await page.screenshot({ path: shot('smoke-3-selected.png') })
}
