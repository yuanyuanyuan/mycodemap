// [META] since:2026-04-30 | owner:cli-team | stable:false
// [WHY] Progress emitter abstraction — NDJSON to stderr in JSON mode, ora spinner in human mode

import ora from 'ora';
import type { OutputMode, ProgressEmitter } from './types.js';

/**
 * Create a progress emitter appropriate for the output mode.
 *
 * - JSON mode: writes NDJSON lines {type:"progress", percent, message} to stderr
 * - Human mode: uses ora spinner on stderr (no stdout pollution)
 */
export function createProgressEmitter(
  mode: OutputMode,
  prefix?: string
): ProgressEmitter {
  if (mode === 'json') {
    return createJsonProgressEmitter();
  }
  return createHumanProgressEmitter(prefix);
}

/**
 * JSON mode: structured NDJSON progress on stderr
 */
function createJsonProgressEmitter(): ProgressEmitter {
  let lastPercent = -1;

  return {
    update(percent: number, message: string): void {
      // Rate-limit: only emit when percent changes by >= 5 or message changes
      if (Math.abs(percent - lastPercent) < 5 && lastPercent >= 0) {
        return;
      }
      lastPercent = percent;
      const line = JSON.stringify({ type: 'progress', percent, message });
      process.stderr.write(line + '\n');
    },

    complete(): void {
      const line = JSON.stringify({ type: 'progress', percent: 100, message: 'complete' });
      process.stderr.write(line + '\n');
    },

    fail(message?: string): void {
      const line = JSON.stringify({ type: 'progress', percent: -1, message: message ?? 'failed' });
      process.stderr.write(line + '\n');
    },
  };
}

/**
 * Human mode: ora spinner on stderr
 */
function createHumanProgressEmitter(prefix?: string): ProgressEmitter {
  const spinner = ora({ spinner: 'dots', prefixText: prefix });

  return {
    update(_percent: number, message: string): void {
      if (!spinner.isSpinning) {
        spinner.start();
      }
      spinner.text = message;
    },

    complete(): void {
      if (spinner.isSpinning) {
        spinner.succeed();
      }
    },

    fail(message?: string): void {
      if (spinner.isSpinning) {
        spinner.fail(message);
      }
    },
  };
}
