// [META] since:2026-05-01 | owner:cli-team | stable:false
// [WHY] Tests for formatError, normalizeError, createActionableError — verifies actionable error fields in both modes

import { describe, it, expect } from 'vitest';
import { formatError, createActionableError } from '../errors.js';
import { isActionableError, APPLY_SUGGESTION_CONFIDENCE_THRESHOLD } from '../types.js';
import { ErrorCodes } from '../error-codes.js';

describe('formatError', () => {
  describe('json mode', () => {
    it('returns structured JSON with actionable fields for Error', () => {
      const error = new Error('something failed') as Error & { code: string };
      error.code = 'E001';

      const result = formatError(error, 'json');
      const parsed = JSON.parse(result);

      expect(parsed.type).toBe('error');
      expect(parsed.message).toBe('something failed');
      // Now always returns actionable fields
      expect(parsed.attempted).toBeDefined();
      expect(parsed.rootCause).toBeDefined();
      expect(parsed.confidence).toBeDefined();
    });

    it('auto-detects MODULE_NOT_FOUND and assigns DEP_MODULE_NOT_FOUND', () => {
      const error = new Error("Cannot find module 'foo'") as Error & { code: string };
      error.code = 'MODULE_NOT_FOUND';

      const result = formatError(error, 'json');
      const parsed = JSON.parse(result);

      expect(parsed.code).toBe('DEP_MODULE_NOT_FOUND');
      expect(parsed.nextCommand).toBe('npm install');
      expect(parsed.confidence).toBe(0.85);
    });

    it('auto-detects EACCES and assigns FS_PERMISSION_DENIED', () => {
      const error = new Error('access denied') as Error & { code: string };
      error.code = 'EACCES';

      const result = formatError(error, 'json');
      const parsed = JSON.parse(result);

      expect(parsed.code).toBe('FS_PERMISSION_DENIED');
    });

    it('auto-detects ENOENT and assigns FS_FILE_NOT_FOUND', () => {
      const error = new Error('file not found') as Error & { code: string };
      error.code = 'ENOENT';

      const result = formatError(error, 'json');
      const parsed = JSON.parse(result);

      expect(parsed.code).toBe('FS_FILE_NOT_FOUND');
    });

    it('auto-detects tree-sitter failures as DEP_NATIVE_MISSING', () => {
      const error = new Error('tree-sitter cannot be loaded: compilation failed');

      const result = formatError(error, 'json');
      const parsed = JSON.parse(result);

      expect(parsed.code).toBe('DEP_NATIVE_MISSING');
      expect(parsed.nextCommand).toBe('codemap --wasm-fallback');
      expect(parsed.confidence).toBe(0.9);
    });

    it('auto-detects better-sqlite3 failures as DEP_NATIVE_MISSING', () => {
      const error = new Error('better-sqlite3 native module load failed');

      const result = formatError(error, 'json');
      const parsed = JSON.parse(result);

      expect(parsed.code).toBe('DEP_NATIVE_MISSING');
    });

    it('includes attempted field from formatError argument', () => {
      const error = new Error('fail');

      const result = formatError(error, 'json', 'codemap analyze');
      const parsed = JSON.parse(result);

      expect(parsed.attempted).toBe('codemap analyze');
    });

    it('handles non-Error thrown values', () => {
      const result = formatError('string error', 'json');
      const parsed = JSON.parse(result);

      expect(parsed.type).toBe('error');
      expect(parsed.message).toBe('string error');
      expect(parsed.confidence).toBe(0.1);
    });

    it('handles null thrown value', () => {
      const result = formatError(null, 'json');
      const parsed = JSON.parse(result);

      expect(parsed.message).toBe('null');
    });

    it('includes causes from error.cause chain', () => {
      const rootCause = new Error('root issue');
      const error = new Error('wrapper error', { cause: rootCause });

      const result = formatError(error, 'json');
      const parsed = JSON.parse(result);

      expect(parsed.rootCause).toBe('root issue');
      expect(parsed.causes).toBeDefined();
      expect(parsed.causes.length).toBe(1);
      expect(parsed.causes[0].message).toBe('root issue');
    });
  });

  describe('human mode', () => {
    it('returns readable error string with Attempted label', () => {
      const error = new Error('something failed');

      const result = formatError(error, 'human', 'codemap analyze');

      expect(result).toContain('something failed');
      expect(result).toContain('Attempted:');
      expect(result).toContain('codemap analyze');
    });

    it('includes Root cause label', () => {
      const rootCause = new Error('root issue');
      const error = new Error('wrapper', { cause: rootCause });

      const result = formatError(error, 'human');

      expect(result).toContain('Root cause:');
      expect(result).toContain('root issue');
    });

    it('includes Suggestion label with confidence', () => {
      const error = new Error('tree-sitter cannot be loaded');

      const result = formatError(error, 'human');

      expect(result).toContain('Suggestion:');
      expect(result).toContain('confidence');
    });

    it('includes Next label when nextCommand exists', () => {
      const error = new Error('tree-sitter cannot be loaded');

      const result = formatError(error, 'human');

      expect(result).toContain('Next:');
      expect(result).toContain('codemap --wasm-fallback');
    });

    it('handles non-Error thrown values in human mode', () => {
      const result = formatError('string error', 'human');

      expect(result).toContain('string error');
    });
  });
});

describe('createActionableError', () => {
  it('creates ActionableError with code defaults', () => {
    const error = createActionableError(
      ErrorCodes.DEP_NATIVE_MISSING,
      'tree-sitter failed',
      'loading tree-sitter'
    );

    expect(error.type).toBe('error');
    expect(error.code).toBe('DEP_NATIVE_MISSING');
    expect(error.message).toBe('tree-sitter failed');
    expect(error.attempted).toBe('loading tree-sitter');
    expect(error.confidence).toBe(0.9);
    expect(error.nextCommand).toBe('codemap --wasm-fallback');
  });

  it('allows overriding confidence and nextCommand', () => {
    const error = createActionableError(
      ErrorCodes.CFG_WORKSPACE_NOT_INITIALIZED,
      'workspace missing',
      'codemap query',
      { confidence: 0.75, nextCommand: 'codemap init --yes' }
    );

    expect(error.confidence).toBe(0.75);
    expect(error.nextCommand).toBe('codemap init --yes');
  });

  it('includes causes when provided', () => {
    const innerError = createActionableError(
      ErrorCodes.RUN_COMMAND_FAILED,
      'inner',
      'inner op'
    );
    const error = createActionableError(
      ErrorCodes.DEP_NATIVE_MISSING,
      'outer',
      'outer op',
      { causes: [innerError] }
    );

    expect(error.causes).toHaveLength(1);
    expect(error.causes![0].message).toBe('inner');
  });
});

describe('isActionableError', () => {
  it('returns true for ActionableError', () => {
    const error = createActionableError(ErrorCodes.RUN_COMMAND_FAILED, 'msg', 'op');
    expect(isActionableError(error)).toBe(true);
  });

  it('returns false for plain StructuredError', () => {
    const error: import('../types.js').StructuredError = {
      type: 'error',
      code: 'UNKNOWN',
      message: 'plain error',
    };
    expect(isActionableError(error)).toBe(false);
  });
});

describe('APPLY_SUGGESTION_CONFIDENCE_THRESHOLD', () => {
  it('is 0.8', () => {
    expect(APPLY_SUGGESTION_CONFIDENCE_THRESHOLD).toBe(0.8);
  });
});
