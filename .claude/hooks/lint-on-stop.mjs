// Claude Code Stop hook: when Claude finishes a reply, lint any changed JS/JSX files.
// Exit 0 lets Claude stop. Exit 2 blocks the stop and sends stderr back to Claude to fix.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const input = JSON.parse(readFileSync(0, 'utf8') || '{}');

// Loop guard: if this stop was already blocked once, let it through.
if (input.stop_hook_active) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const git = (...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    .split('\n')
    .filter(Boolean);

// Changed since the last commit (staged or not), plus new untracked files.
let changed;
try {
  changed = [
    ...git('diff', '--name-only', 'HEAD'),
    ...git('ls-files', '--others', '--exclude-standard'),
  ];
} catch {
  process.exit(0); // not a git repo or no commits yet: nothing to compare against
}

const files = [...new Set(changed)].filter(
  (f) => /\.(js|jsx|mjs|cjs)$/.test(f) && existsSync(path.join(root, f)),
);
if (files.length === 0) process.exit(0); // no code changed this reply

// Run ESLint through Node directly: no shell, so it behaves the same on Windows.
const eslint = path.join(root, 'node_modules', 'eslint', 'bin', 'eslint.js');
const result = spawnSync(process.execPath, [eslint, '--no-warn-ignored', ...files], {
  cwd: root,
  encoding: 'utf8',
});

if (result.status === 0) process.exit(0);

process.stderr.write(
  `ESLint failed on changed files. Fix these before finishing:\n${result.stdout}${result.stderr}`,
);
process.exit(2);
