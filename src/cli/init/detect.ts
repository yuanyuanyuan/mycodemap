// [META] since:2026-05-01 | owner:cli-team | stable:false
// [WHY] Phase 53 marker-only project type detection for `mycodemap init`.
// Detects nodejs/python/go/rust by marker files (no content sniffing); supports
// interactive disambiguation when multiple markers coexist.

import { existsSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

export type ProjectType = 'nodejs' | 'python' | 'go' | 'rust' | 'generic';

export interface DetectionCandidate {
  type: ProjectType;
  markerFile: string;
  confidence: 'high' | 'low';
}

export interface DetectionResult {
  candidates: DetectionCandidate[];
  recommended: ProjectType | null;
}

const MARKER_MAP: Record<string, ProjectType> = Object.freeze({
  'package.json': 'nodejs',
  'pyproject.toml': 'python',
  'go.mod': 'go',
  'Cargo.toml': 'rust',
});

/**
 * Detect dominant project type by marker files only.
 *
 * - 0 markers → `{ candidates: [], recommended: null }` (caller must refuse per D-04).
 * - 1 marker  → `{ candidates: [...], recommended: <type> }`.
 * - 2+ markers → `{ candidates: [...], recommended: null }` forces disambiguation per D-02.
 *
 * Pure function: synchronous existsSync; no content reads; no process.exit.
 */
export function detectProjectType(rootDir: string): DetectionResult {
  const candidates: DetectionCandidate[] = [];
  for (const [file, type] of Object.entries(MARKER_MAP)) {
    if (existsSync(path.join(rootDir, file))) {
      candidates.push({ type, markerFile: file, confidence: 'high' });
    }
  }

  if (candidates.length === 0) {
    return { candidates: [], recommended: null };
  }

  if (candidates.length === 1) {
    return { candidates, recommended: candidates[0].type };
  }

  return { candidates, recommended: null };
}

/**
 * Interactive numeric-choice prompt for multi-marker disambiguation.
 *
 * Caller must verify TTY availability (D-12) before invoking this; non-TTY
 * callers should require `--profile <name>` instead.
 */
export async function promptForProfileSelection(
  candidates: DetectionCandidate[]
): Promise<ProjectType> {
  console.log('检测到多个项目类型标记：');
  candidates.forEach((c, i) => {
    console.log(`  ${i + 1}) ${c.type} (${c.markerFile})`);
  });

  const readline = createInterface({ input, output });
  try {
    const answer = await readline.question('请选择 (输入编号): ');
    const index = parseInt(answer.trim(), 10) - 1;
    if (Number.isInteger(index) && index >= 0 && index < candidates.length) {
      return candidates[index].type;
    }
    throw new Error('无效选择');
  } finally {
    readline.close();
  }
}
