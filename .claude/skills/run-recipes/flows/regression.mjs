// Browser checks for behavior jsdom can't reproduce, plus the bug fixes from Nov 2026:
// native Escape clearing, the result counter, focus handling, accessible step names,
// checked state across recipes, and React key warnings. Expects the default
// (non --random) start on the first recipe by name, Creamy Sausage Pasta.
export default async function regression({ page, shot, check, consoleMsgs }) {
  const input = page.getByLabel('Search recipes');
  const status = page.getByRole('status');
  // Scoped to the header: instruction steps in <main> are buttons in a list too.
  const resultsList = page
    .getByRole('banner')
    .getByRole('list')
    .filter({ has: page.locator('button') });
  const main = page.getByRole('main');
  // Step buttons sit in list items; "Reset checklist" is a button outside the lists.
  const stepOne = main.getByRole('listitem').getByRole('button').first();
  // FIRST opens on load (recipes are sorted by name); the flow then switches to OTHER
  const FIRST = 'Creamy Sausage Pasta';
  const OTHER = 'Lentil Stew';

  // Record every text the counter shows, so a brief "0 results" flash can't hide.
  await page.evaluate(() => {
    window.__counts = [];
    new MutationObserver(() => {
      const el = document.querySelector('[role="status"]');
      const text = el ? el.textContent.trim() : '(hidden)';
      if (window.__counts.at(-1) !== text) window.__counts.push(text);
    }).observe(document.body, { subtree: true, childList: true, characterData: true });
  });

  check(
    'starts on the first recipe',
    (await page.getByRole('heading', { level: 1 }).textContent()).trim() === FIRST,
  );

  // Result counter
  check('counter hidden on load', (await status.count()) === 0);
  await input.pressSequentially('instant', { delay: 60 });
  // "instant" matches every recipe (cooking method Instant-pot, and "instant pot" in the steps)
  await status.filter({ hasText: '3 results' }).waitFor();
  await input.pressSequentially(' pot', { delay: 60 });
  await page.waitForTimeout(400);
  const counts = await page.evaluate(() => window.__counts);
  check('counter shows "3 results"', (await status.textContent()).trim() === '3 results');
  check(
    'no "0 results" flash while typing',
    !counts.includes('0 results'),
    `history: ${JSON.stringify(counts)}`,
  );
  await page.screenshot({ path: shot('regression-1-search.png') });

  // Escape in the input: Chrome natively clears <input type="search">
  await input.press('Escape');
  await page.waitForTimeout(400);
  check('Escape in the input clears it (native)', (await input.inputValue()) === '');
  check('counter hidden after the input is cleared', (await status.count()) === 0);
  check('results closed after Escape in the input', (await resultsList.count()) === 0);

  // Escape from a focused result: SearchBox's own handler
  await input.pressSequentially('lentil', { delay: 30 });
  await page.getByRole('button', { name: OTHER }).waitFor();
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.textContent?.trim());
  check(
    'Tab moves focus into the results',
    focused === OTHER,
    `focused: ${JSON.stringify(focused)}`,
  );
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  check('Escape from a result closes the overlay', (await resultsList.count()) === 0);
  check('focus returns to the input', await input.evaluate((el) => el === document.activeElement));
  check('search text kept', (await input.inputValue()) === 'lentil');
  await input.fill('');

  // Accessible names from Chrome's accessibility tree
  const stepButtons = (await main.ariaSnapshot())
    .split('\n')
    .filter((l) => l.includes('button') && !l.includes('"Reset checklist"'));
  check(
    'instruction steps are named by their text',
    stepButtons.length > 0 && stepButtons.every((l) => /button "\d+\. .{5,}"/.test(l)),
    stepButtons[0]?.trim(),
  );

  // Checked state doesn't carry over (both recipes share "1 Tbsp olive oil" and step 1)
  const oil = page.getByRole('checkbox', { name: /olive oil/ });
  await oil.check();
  await stepOne.click();
  check(
    'olive oil and step 1 checked',
    (await oil.isChecked()) && (await stepOne.getAttribute('aria-pressed')) === 'true',
  );
  await page.screenshot({ path: shot('regression-2-checked.png') });
  const h1Left = () =>
    page.getByRole('heading', { level: 1 }).evaluate((el) => el.getBoundingClientRect().left);
  const leftBefore = await h1Left();
  await input.pressSequentially('stew', { delay: 30 });
  await page.getByRole('button', { name: OTHER }).click();
  await page.getByRole('heading', { level: 1, name: OTHER }).waitFor();
  const leftAfter = await h1Left();
  check(
    'content left edge stays put when switching recipe',
    leftBefore === leftAfter,
    `${leftBefore}px -> ${leftAfter}px`,
  );
  check('olive oil unchecked after switching recipe', !(await oil.isChecked()));
  check(
    'step 1 unpressed after switching recipe',
    (await stepOne.getAttribute('aria-pressed')) === 'false',
  );
  await page.screenshot({ path: shot('regression-3-switched.png') });

  // Accessibility styling (CSS isn't applied in jsdom, so it's checked here)
  const firstBox = main.getByRole('checkbox').first();
  const checkTransform = () =>
    firstBox.evaluate((el) => getComputedStyle(el, '::before').transform);
  check(
    'unchecked box shows no checkmark',
    /matrix\(0, 0, 0, 0/.test(await checkTransform()),
    await checkTransform(),
  );
  await firstBox.check();
  await page.waitForTimeout(200); // let the 120ms transition finish
  check(
    'checked box shows a checkmark shape',
    (await checkTransform()) === 'matrix(1, 0, 0, 1, 0, 0)',
    await checkTransform(),
  );
  await page.screenshot({ path: shot('regression-4-checkmark.png') });

  await input.focus();
  // Tab past the header controls and "Reset checklist" to the first ingredient checkbox
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    const onIngredient = await page.evaluate(
      () => document.activeElement?.matches('main li input[type="checkbox"]') ?? false,
    );
    if (onIngredient) break;
  }
  const boxOutline = await page.evaluate(() => {
    const s = getComputedStyle(document.activeElement);
    return `${document.activeElement.type} ${s.outlineStyle} ${s.outlineWidth}`;
  });
  check(
    'keyboard focus on a checkbox shows a solid outline',
    boxOutline === 'checkbox solid 3px',
    boxOutline,
  );
  await page.screenshot({ path: shot('regression-5-focus.png') });

  const snapshot = await main.ariaSnapshot();
  check('no "---" separator text between groups', !snapshot.includes('---'));

  // Contrast of muted UI in both color schemes (WCAG: text 4.5:1, UI borders 3:1)
  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.waitForTimeout(300); // colors have 120ms CSS transitions; measure after they finish
    const ratios = await page.evaluate(() => {
      const rgb = (c) =>
        c
          .match(/[\d.]+/g)
          .slice(0, 3)
          .map(Number);
      const lum = (c) => {
        const [r, g, b] = rgb(c).map((v) => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const ratio = (a, b) => {
        const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
        return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
      };
      const bg = getComputedStyle(document.documentElement).backgroundColor;
      const stepNumber = [...document.querySelectorAll('main li button span')].at(-2);
      const box = [...document.querySelectorAll('main input[type="checkbox"]')].at(-1);
      return {
        stepNumber: ratio(getComputedStyle(stepNumber).color, bg),
        checkboxBorder: ratio(getComputedStyle(box).borderTopColor, bg),
      };
    });
    check(
      `${scheme}: step numbers reach 4.5:1`,
      ratios.stepNumber >= 4.5,
      `${ratios.stepNumber}:1`,
    );
    check(
      `${scheme}: checkbox borders reach 3:1`,
      ratios.checkboxBorder >= 3,
      `${ratios.checkboxBorder}:1`,
    );
    await page.screenshot({ path: shot(`regression-6-${scheme}.png`) });
  }
  await page.emulateMedia({ colorScheme: null });

  const keyWarnings = consoleMsgs.filter((m) => /same key|unique "key"/i.test(m));
  check('no React key warnings', keyWarnings.length === 0, keyWarnings.join(' | '));
}
