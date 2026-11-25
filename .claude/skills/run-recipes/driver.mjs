// Drives the recipes app in headless Chrome.
//
//   node .claude/skills/run-recipes/driver.mjs [flow] [--random]
//
// flow:     a name in ./flows (default "smoke") or a path to a .mjs file whose default
//           export is `async ({ page, shot, check, consoleMsgs }) => {}`.
// --random: keep the app's random first recipe. By default Math.random() returns 0,
//           so the page opens on the first recipe in src/recipes.json.
//
// Env: RECIPES_PORT (default 5173), BROWSER_CHANNEL (default "chrome", e.g. "msedge").
// Reuses a dev server already listening on the port; otherwise starts one and stops it after.
// Screenshots go to .claude/skills/run-recipes/shots/. Exit code 0 = every check passed.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const PORT = process.env.RECIPES_PORT || '5173';
const APP_URL = `http://localhost:${PORT}/recipes/`; // vite.config.js sets base: '/recipes'
const SHOTS = path.join(HERE, 'shots');

const args = process.argv.slice(2);
const random = args.includes('--random');
const flowArg = args.find((a) => !a.startsWith('--')) || 'smoke';
const flowPath = /[\\/]|\.mjs$/.test(flowArg)
  ? path.resolve(flowArg)
  : path.join(HERE, 'flows', `${flowArg}.mjs`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isUp = async () => {
  try {
    return (await fetch(APP_URL)).ok;
  } catch {
    return false;
  }
};

// --- Dev server: reuse or start -------------------------------------------------
let server;
if (await isUp()) {
  console.log(`Reusing dev server at ${APP_URL}`);
} else {
  // Run vite directly (not `npm run dev`): no --open browser window, and killing
  // this child actually stops the server (npm wouldn't forward the signal).
  server = spawn(
    process.execPath,
    [path.join(ROOT, 'node_modules/vite/bin/vite.js'), '--port', PORT, '--strictPort'],
    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let out = '';
  server.stdout.on('data', (d) => (out += d));
  server.stderr.on('data', (d) => (out += d));
  const deadline = Date.now() + 30_000;
  while (!(await isUp())) {
    if (server.exitCode !== null || Date.now() > deadline) {
      console.error(`Dev server failed to start on port ${PORT}:\n${out}`);
      server.kill();
      process.exit(1);
    }
    await sleep(300);
  }
  console.log(`Started dev server at ${APP_URL}`);
}

// --- Browser --------------------------------------------------------------------
fs.mkdirSync(SHOTS, { recursive: true });
const results = [];
const check = (name, pass, detail = '') => results.push({ name, pass: Boolean(pass), detail });
const shot = (name) => path.join(SHOTS, name); // Playwright needs a string path, not a URL

const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
const consoleMsgs = [];
page.on('console', (m) => consoleMsgs.push(`${m.type()}: ${m.text()}`));
page.on('pageerror', (e) => consoleMsgs.push(`pageerror: ${e.message}`));
if (!random) await page.addInitScript(() => (Math.random = () => 0));

try {
  await page.goto(APP_URL);
  await page.getByLabel('Search recipes').waitFor();
  const flow = (await import(pathToFileURL(flowPath).href)).default;
  await flow({ page, shot, check, consoleMsgs });
} catch (e) {
  check('flow ran without throwing', false, e.message.split('\n')[0]);
  await page.screenshot({ path: shot('error.png') }).catch(() => {});
}

const errors = consoleMsgs.filter((m) => /^(error|pageerror)/.test(m));
check('no console errors', errors.length === 0, errors.join(' | '));

await browser.close();
server?.kill();

for (const r of results)
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  [${r.detail}]` : ''}`);
console.log(
  `\n${results.filter((r) => r.pass).length}/${results.length} passed. Screenshots: ${SHOTS}`,
);
process.exit(results.every((r) => r.pass) ? 0 : 1);
