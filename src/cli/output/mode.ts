// [META] since:2026-04-30 | owner:cli-team | stable:false
// [WHY] Unified TTY/flag detection — single source of truth for output mode resolution

import type { OutputMode, OutputModeOptions } from './types.js';

/**
 * Resolve output mode from CLI flags and TTY state.
 *
 * Priority: --json wins over --human (explicit machine-readable takes priority).
 * No flags: TTY auto-detect (human in terminal, json when piped).
 *
 * @param options - CLI flags { json?, human? }
 * @param ttyOverride - Override for process.stdout.isTTY (useful in tests). Defaults to process.stdout.isTTY.
 */
export function resolveOutputMode(
  options: OutputModeOptions = {},
  ttyOverride?: boolean
): OutputMode {
  if (options.json) {
    return 'json';
  }

  if (options.human) {
    return 'human';
  }

  // No explicit flag: auto-detect from TTY
  const isTTY = ttyOverride ?? process.stdout.isTTY;
  return isTTY ? 'human' : 'json';
}
