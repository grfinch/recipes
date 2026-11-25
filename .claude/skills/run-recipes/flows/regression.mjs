// Browser checks for behavior jsdom can't reproduce, plus the bug fixes from Nov 2026:
// native Escape clearing, the result counter, focus handling, accessible step names,
// checked state across recipes, and React key warnings. Expects the default
// (non --random) start on the first recipe, Instant-pot Lentil Stew.
export default async function regression({ page, shot, check, consoleMsgs }) {
  const input = page.getByLabel('Search recipes')
  const status = page.getByRole('status')
  const resultsList = page.getByRole('list').filter({ has: page.locator('button') })
  const main = page.getByRole('main')
  const STEW = 'Instant-pot Lentil Stew'
  const PASTA = 'Instant-pot Creamy Sausage Pasta'

  // Record every text the counter shows, so a brief "0 results" flash can't hide.
  await page.evaluate(() => {
    window.__counts = []
    new MutationObserver(() => {
      const el = document.querySelector('[role="status"]')
      const text = el ? el.textContent.trim() : '(hidden)'
      if (window.__counts.at(-1) !== text) window.__counts.push(text)
    }).observe(document.body, { subtree: true, childList: true, characterData: true })
  })

  check('starts on the first recipe', (await page.getByRole('heading', { level: 1 }).textContent()).trim() === STEW)

  // Result counter
  check('counter hidden on load', (await status.count()) === 0)
  await input.pressSequentially('instant', { delay: 60 })
  await status.filter({ hasText: '2 results' }).waitFor()
  await input.pressSequentially(' pot', { delay: 60 })
  await page.waitForTimeout(400)
  const counts = await page.evaluate(() => window.__counts)
  check('counter shows "2 results"', (await status.textContent()).trim() === '2 results')
  check('no "0 results" flash while typing', !counts.includes('0 results'), `history: ${JSON.stringify(counts)}`)
  await page.screenshot({ path: shot('regression-1-search.png') })

  // Escape in the input: Chrome natively clears <input type="search">
  await input.press('Escape')
  await page.waitForTimeout(400)
  check('Escape in the input clears it (native)', (await input.inputValue()) === '')
  check('counter hidden after the input is cleared', (await status.count()) === 0)
  check('results closed after Escape in the input', (await resultsList.count()) === 0)

  // Escape from a focused result: SearchBox's own handler
  await input.pressSequentially('pasta', { delay: 30 })
  await page.getByRole('button', { name: PASTA }).waitFor()
  await page.keyboard.press('Tab')
  const focused = await page.evaluate(() => document.activeElement?.textContent?.trim())
  check('Tab moves focus into the results', focused === PASTA, `focused: ${JSON.stringify(focused)}`)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  check('Escape from a result closes the overlay', (await resultsList.count()) === 0)
  check('focus returns to the input', await input.evaluate((el) => el === document.activeElement))
  check('search text kept', (await input.inputValue()) === 'pasta')
  await input.fill('')

  // Accessible names from Chrome's accessibility tree
  const stepButtons = (await main.ariaSnapshot()).split('\n').filter((l) => l.includes('button'))
  check(
    'instruction steps are named by their text',
    stepButtons.length > 0 && stepButtons.every((l) => /button "\d+\. .{5,}"/.test(l)),
    stepButtons[0]?.trim(),
  )

  // Checked state doesn't carry over (both recipes share "1 Tbsp olive oil" and step 1)
  const oil = page.getByRole('checkbox', { name: /olive oil/ })
  await oil.check()
  await main.getByRole('button').first().click()
  check('olive oil and step 1 checked', (await oil.isChecked()) && (await main.getByRole('button').first().getAttribute('aria-pressed')) === 'true')
  await page.screenshot({ path: shot('regression-2-checked.png') })
  await input.pressSequentially('sausage', { delay: 30 })
  await page.getByRole('button', { name: PASTA }).click()
  await page.getByRole('heading', { level: 1, name: PASTA }).waitFor()
  check('olive oil unchecked after switching recipe', !(await oil.isChecked()))
  check('step 1 unpressed after switching recipe', (await main.getByRole('button').first().getAttribute('aria-pressed')) === 'false')
  await page.screenshot({ path: shot('regression-3-switched.png') })

  const keyWarnings = consoleMsgs.filter((m) => /same key|unique "key"/i.test(m))
  check('no React key warnings', keyWarnings.length === 0, keyWarnings.join(' | '))
}
