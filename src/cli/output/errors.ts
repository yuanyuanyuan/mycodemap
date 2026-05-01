// [META] since:2026-04-30 | owner:cli-team | stable:false
// [WHY] Mode-aware error formatting — structured JSON for machines, chalk-colored text for humans

import chalk from 'chalk';
import type { OutputMode, StructuredError } from './types.js';

interface ErrorWithCode extends Error {
  code?: string;
  remediation?: string;
}

/**
 * Format an error based on output mode.
 *
 * - JSON mode: returns JSON string of {type:"error", code, message, remediation?}
 * - Human mode: returns chalk-colored readable string
 */
export function formatError(error: unknown, mode: OutputMode): string {
  const normalized = normalizeError(error);

  if (mode === 'json') {
    const structured: StructuredError = {
      type: 'error',
      code: normalized.code,
      message: normalized.message,
      ...(normalized.remediation ? { remediation: normalized.remediation } : {}),
    };
    return JSON.stringify(structured);
  }

  // Human mode
  let output = chalk.red('Error: ') + normalized.message;
  if (normalized.code && normalized.code !== 'UNKNOWN') {
    output = chalk.red('Error: ') + `[${normalized.code}] ${normalized.message}`;
  }
  if (normalized.remediation) {
    output += '\n  ' + chalk.yellow('Suggestion: ') + normalized.remediation;
  }
  return output;
}

/**
 * Normalize any thrown value into a structured error shape
 */
function normalizeError(error: unknown): { code: string; message: string; remediation?: string } {
  if (error instanceof Error) {
    const err = error as ErrorWithCode;
    return {
      code: err.code ?? 'UNKNOWN',
      message: err.message,
      remediation: err.remediation,
    };
  }

  // Non-Error thrown values
  return {
    code: 'UNKNOWN',
    message: String(error),
  };
}
