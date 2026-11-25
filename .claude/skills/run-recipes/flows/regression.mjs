// Browser-only checks: things jsdom can't test because they need real CSS or native browser
// behavior. Everything else (search, counts, focus, checklists, links) is covered by the
// Vitest tests. Runs in CI (.github/workflows/ci.yml) and in the pre-push hook.
//
// This flow must never name a recipe or depend on how many there are. It works from whatever
// the page shows, so adding or editing recipes can't break it.
export default async function regression({ page, shot, check, consoleMsgs }) {
  const input = page.getByLabel('Search recipes');
  const main = page.getByRole('main');
  const h1 = page.getByRole('heading', { level: 1 });
  const resultsList = page.getByRole('banner').getByRole('list');
  const firstName = (await h1.textContent()).trim();

  // 1. Native Escape: Chrome clears an <input type="search"> on Escape, and the app must
  //    then close its results. Searching for a word of the open recipe's name always matches.
  await input.fill(firstName.split(/\s+/)[0]);
  await resultsList.waitFor();
  await input.press('Escape');
  await page.waitForTimeout(400); // past the 200ms search debounce
  check('Escape clears the search box (native)', (await input.inputValue()) === '');
  check('results close after Escape', (await resultsList.count()) === 0);

  // 2. No sideways jump when switching between recipes of different lengths (scrollbar
  //    appearing or disappearing). Opens another recipe from the All recipes page.
  const left = () => h1.evaluate((el) => Math.round(el.getBoundingClientRect().left));
  const leftBefore = await left();
  await page.getByRole('link', { name: 'All recipes' }).click();
  const links = main.getByRole('link');
  await links.first().waitFor();
  const names = (await links.allTextContents()).map((n) => n.trim());
  const other = names.find((n) => n !== firstName);
  if (other) {
    await main.getByRole('link', { name: other, exact: true }).click();
    await h1.filter({ hasText: other }).waitFor();
    const leftAfter = await left();
    check(
      'no sideways jump between recipes',
      leftBefore === leftAfter,
      `${leftBefore} -> ${leftAfter}px`,
    );
  } else {
    check('no sideways jump between recipes', true, 'skipped: only one recipe');
  }

  // 3. Checkbox checkmark: drawn with CSS, hidden (scale 0) until checked.
  const box = main.getByRole('checkbox').first();
  const mark = () => box.evaluate((el) => getComputedStyle(el, '::before').transform);
  check('unchecked box shows no checkmark', /matrix\(0, 0, 0, 0/.test(await mark()), await mark());
  await box.check();
  await page.waitForTimeout(200); // the 120ms transition
  check(
    'checked box shows a checkmark',
    (await mark()) === 'matrix(1, 0, 0, 1, 0, 0)',
    await mark(),
  );
  await box.uncheck();

  // 4. Keyboard focus is visible: Tab from the search box to the first ingredient checkbox.
  await input.focus();
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    const onCheckbox = await page.evaluate(() =>
      document.activeElement?.matches('main input[type="checkbox"]'),
    );
    if (onCheckbox) break;
  }
  const outline = await page.evaluate(() => {
    const el = document.activeElement;
    const s = getComputedStyle(el);
    return `${el.type} ${s.outlineStyle} ${s.outlineWidth}`;
  });
  check('keyboard focus shows a solid outline', outline === 'checkbox solid 3px', outline);
  await page.screenshot({ path: shot('regression-focus.png') });

  // 5. Contrast in both color schemes (WCAG 2.2 AA: text 4.5:1, UI component borders 3:1).
  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.waitForTimeout(300); // colors have 120ms transitions
    const ratios = await page.evaluate(() => {
      const lum = (color) => {
        const [r, g, b] = color
          .match(/[\d.]+/g)
          .slice(0, 3)
          .map((v) => {
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
      const color = (selector, prop) => getComputedStyle(document.querySelector(selector))[prop];
      return {
        // The step number is the first span inside a step button
        stepNumber: ratio(color('main li button span', 'color'), bg),
        link: ratio(color('header a', 'color'), bg),
        checkboxBorder: ratio(color('main input[type="checkbox"]', 'borderTopColor'), bg),
        footer: ratio(color('footer', 'color'), bg),
      };
    });
    check(`${scheme}: footer text reaches 4.5:1`, ratios.footer >= 4.5, `${ratios.footer}:1`);
    check(
      `${scheme}: step numbers reach 4.5:1`,
      ratios.stepNumber >= 4.5,
      `${ratios.stepNumber}:1`,
    );
    check(`${scheme}: links reach 4.5:1`, ratios.link >= 4.5, `${ratios.link}:1`);
    check(
      `${scheme}: checkbox borders reach 3:1`,
      ratios.checkboxBorder >= 3,
      `${ratios.checkboxBorder}:1`,
    );
    await page.screenshot({ path: shot(`regression-${scheme}.png`), fullPage: true });
  }
  await page.emulateMedia({ colorScheme: null });

  // React reports duplicate keys in the console; this catches them with the real recipe data.
  const keyWarnings = consoleMsgs.filter((m) => /same key|unique "key"/i.test(m));
  check('no React key warnings', keyWarnings.length === 0, keyWarnings.join(' | '));
}
