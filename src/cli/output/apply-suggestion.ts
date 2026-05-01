// [META] since:2026-05-01 | owner:cli-team | stable:false
// [WHY] Safety-gated auto-remediation engine — executes nextCommand only when confidence >= threshold and --apply-suggestion flag set

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { OutputMode, ActionableError } from './types.js';
import { APPLY_SUGGESTION_CONFIDENCE_THRESHOLD } from './types.js';

const execAsync = promisify(exec);

export interface SuggestionResult {
  type: 'result';
  success: boolean;
  data?: unknown;
  attemptedCommand?: string;
}

export async function tryApplySuggestion(
  error: ActionableError,
  options: { applySuggestion?: boolean; wasmFallback?: boolean },
  _mode: OutputMode
): Promise<SuggestionResult> {
  if (!options.applySuggestion) {
    return { type: 'result', success: false, data: { reason: 'apply-suggestion flag not set' } };
  }

  if (error.confidence < APPLY_SUGGESTION_CONFIDENCE_THRESHOLD) {
    return { type: 'result', success: false, data: { reason: `confidence ${error.confidence} below threshold ${APPLY_SUGGESTION_CONFIDENCE_THRESHOLD}` } };
  }

  if (!error.nextCommand) {
    return { type: 'result', success: false, data: { reason: 'no nextCommand available' } };
  }

  process.stderr.write(JSON.stringify({ type: 'apply-suggestion', action: 'attempt', command: error.nextCommand, confidence: error.confidence }) + '\n');

  try {
    const { stdout } = await execAsync(error.nextCommand, { timeout: 30000 });
    process.stderr.write(JSON.stringify({ type: 'apply-suggestion', action: 'success', command: error.nextCommand }) + '\n');
    return { type: 'result', success: true, data: { stdout: stdout.trim() }, attemptedCommand: error.nextCommand };
  } catch (execError) {
    const msg = execError instanceof Error ? execError.message : String(execError);
    process.stderr.write(JSON.stringify({ type: 'apply-suggestion', action: 'failed', command: error.nextCommand, error: msg }) + '\n');
    return { type: 'result', success: false, data: { error: msg }, attemptedCommand: error.nextCommand };
  }
}
