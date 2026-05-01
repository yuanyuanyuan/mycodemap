// Post-tsc copy step: ship non-TS assets that `tsc` does not emit into `dist/`.
// Phase 53: built-in bootstrap profile JSONs live next to the profile-loader
// and must be present at runtime in published packages (`files` ships `dist/`,
// not `src/`).

import { cpSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

const copies = [
  {
    from: path.join(repoRoot, 'src', 'cli', 'init', 'profiles'),
    to: path.join(repoRoot, 'dist', 'cli', 'init', 'profiles'),
  },
];

for (const { from, to } of copies) {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
  console.log(`[copy-build-assets] ${path.relative(repoRoot, from)} -> ${path.relative(repoRoot, to)}`);
}
