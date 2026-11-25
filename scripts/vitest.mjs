// Runs Vitest from the repo root, spelled with an uppercase drive letter on Windows.
//
// From a lowercase working directory (c:\..., as VS Code and Git Bash can open the folder),
// Vitest's worker and the setup file load two copies of `vitest` under the two spellings of
// the same path, and every test fails with "failed to find the current suite". Starting it
// from the uppercase spelling avoids that. Arguments pass through: `npm test -- -t "Escape"`.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const upperDrive = (p) => p.replace(/^[a-z]:/, (drive) => drive.toUpperCase());
const root = upperDrive(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

const { status, signal } = spawnSync(
  process.execPath,
  [path.join(root, 'node_modules', 'vitest', 'vitest.mjs'), ...process.argv.slice(2)],
  { cwd: root, stdio: 'inherit' },
);
process.exit(signal ? 1 : (status ?? 1));
