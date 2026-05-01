// [META] since:2026-05-01 | owner:cli-team | stable:false
// [WHY] Tests for tryApplySuggestion — verifies gate logic, execution, and stderr NDJSON logging

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tryApplySuggestion } from '../apply-suggestion.js';
import type { ActionableError } from '../types.js';
import { ErrorCodes } from '../error-codes.js';

function makeActionableError(overrides: Partial<ActionableError> = {}): ActionableError {
  return {
    type: 'error',
    code: ErrorCodes.DEP_NATIVE_MISSING,
    message: 'tree-sitter failed',
    attempted: 'loading tree-sitter',
    rootCause: 'native compilation failed',
    remediationPlan: 'Use --wasm-fallback',
    confidence: 0.9,
    nextCommand: 'echo hello',
    ...overrides,
  };
}

describe('tryApplySuggestion', () => {
  let stderrWrite: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  it('returns success:false when apply-suggestion flag not set', async () => {
    const error = makeActionableError();
    const result = await tryApplySuggestion(error, { applySuggestion: false }, 'json');

    expect(result.success).toBe(false);
    expect(result.data).toEqual({ reason: 'apply-suggestion flag not set' });
  });

  it('returns success:false when confidence below threshold', async () => {
    const error = makeActionableError({ confidence: 0.5 });
    const result = await tryApplySuggestion(error, { applySuggestion: true }, 'json');

    expect(result.success).toBe(false);
    const data = result.data as { reason: string };
    expect(data.reason).toContain('below threshold');
  });

  it('returns success:false when no nextCommand', async () => {
    const error = makeActionableError({ nextCommand: undefined });
    const result = await tryApplySuggestion(error, { applySuggestion: true }, 'json');

    expect(result.success).toBe(false);
    expect(result.data).toEqual({ reason: 'no nextCommand available' });
  });

  it('attempts execution when all gates pass', async () => {
    const error = makeActionableError({ nextCommand: 'echo test-output' });
    const result = await tryApplySuggestion(error, { applySuggestion: true }, 'json');

    expect(result.success).toBe(true);
    expect(result.attemptedCommand).toBe('echo test-output');
  });

  it('returns success:false on execution failure without retry', async () => {
    const error = makeActionableError({ nextCommand: 'false' });
    const result = await tryApplySuggestion(error, { applySuggestion: true }, 'json');

    expect(result.success).toBe(false);
    expect(result.attemptedCommand).toBe('false');
  });

  it('logs attempt and result to stderr NDJSON', async () => {
    const error = makeActionableError({ nextCommand: 'echo ok' });
    await tryApplySuggestion(error, { applySuggestion: true }, 'json');

    const logCalls = stderrWrite.mock.calls.map((args) => args[0] as string);
    const attemptLog = logCalls.find((l) => l.includes('"action":"attempt"'));
    expect(attemptLog).toBeDefined();
    expect(JSON.parse(attemptLog!.trim()).type).toBe('apply-suggestion');
  });
});
