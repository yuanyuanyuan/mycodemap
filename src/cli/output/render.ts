// [META] since:2026-04-30 | owner:cli-team | stable:false
// [WHY] Mode-aware stdout writer — JSON.stringify in json mode, human renderer in human mode

import type { OutputMode } from './types.js';

/**
 * Render data to stdout based on output mode.
 *
 * - JSON mode: writes JSON.stringify(data) + newline to stdout
 * - Human mode: writes humanRenderer(data) + newline to stdout
 *
 * Uses process.stdout.write (not console.log) for predictable output formatting.
 */
export function renderOutput<T>(
  data: T,
  humanRenderer: (data: T) => string,
  mode: OutputMode
): void {
  if (mode === 'json') {
    process.stdout.write(JSON.stringify(data) + '\n');
    return;
  }

  process.stdout.write(humanRenderer(data) + '\n');
}
