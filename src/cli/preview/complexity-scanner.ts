// [META] since:2026-05-02 | owner:cli-team | stable:false
// [WHY] escomplex-based file-level cyclomatic complexity scoring for codemap preview —
// lightweight alternative to tree-sitter-based ast-complexity-analyzer.ts, no native deps
// required. Per-file try-catch prevents individual parse failures from aborting the scan.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import escomplex from 'typhonjs-escomplex';

export interface ComplexityHotspot {
  file: string;
  score: number;
  functions: number;
}

/**
 * Only feed JS/TS files to escomplex — it cannot parse Python, Go, Rust, etc.
 * Prevents RESEARCH Pitfall 6 (escomplex barfs on non-JS/TS files).
 */
const JS_TS_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);

/**
 * Scan a single file's cyclomatic complexity via escomplex.
 * Returns null for non-JS/TS files, missing files, or parse errors.
 * Never throws — individual file failures are silently skipped.
 */
export function scanFileComplexity(
  filePath: string,
  rootDir: string,
): ComplexityHotspot | null {
  const ext = path.extname(filePath);
  if (!JS_TS_EXTENSIONS.has(ext)) {
    return null;
  }

  try {
    const source = readFileSync(filePath, 'utf8');
    const report = escomplex.analyzeModule(source);
    return {
      file: path.relative(rootDir, filePath),
      score: report.aggregate.cyclomatic,
      functions: report.methods.length,
    };
  } catch {
    // Skip individual file failures — do NOT throw
    return null;
  }
}

/**
 * Scan multiple files and return the top-5 cyclomatic complexity hotspots.
 * Filters out null results (non-JS/TS files and parse failures),
 * sorts by score descending, and caps at 5 results (per D-08).
 *
 * This function is synchronous because escomplex is synchronous
 * and readFileSync is synchronous.
 */
export function scanComplexity(
  files: string[],
  rootDir: string,
): ComplexityHotspot[] {
  return files
    .map((file) => scanFileComplexity(file, rootDir))
    .filter((h): h is ComplexityHotspot => h !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
