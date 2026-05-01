// [META] since:2026-05-01 | owner:cli-team | stable:false
// [WHY] Tests for checkAndActivateWasmFallback and createNativeDepError — verifies native/WASM detection and fallback activation

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkAndActivateWasmFallback, createNativeDepError } from '../wasm-fallback.js';
import { ErrorCodes } from '../error-codes.js';

describe('checkAndActivateWasmFallback', () => {
  it('returns fallbackActivated=false when --wasm-fallback not set', async () => {
    const result = await checkAndActivateWasmFallback('tree-sitter', { wasmFallback: false });

    expect(result.fallbackActivated).toBe(false);
    expect(result.message).toBe('--wasm-fallback not requested');
  });

  it('returns fallbackActivated=false when native is available', async () => {
    // tree-sitter is installed in this project, so native should be available
    const result = await checkAndActivateWasmFallback('tree-sitter', { wasmFallback: true });

    expect(result.nativeAvailable).toBe(true);
    expect(result.fallbackActivated).toBe(false);
    expect(result.message).toContain('Native module available');
  });

  it('returns correct module name in result', async () => {
    const result = await checkAndActivateWasmFallback('better-sqlite3', { wasmFallback: false });

    expect(result.module).toBe('better-sqlite3');
  });
});

describe('createNativeDepError', () => {
  it('returns DEP_WASM_FALLBACK_AVAILABLE with wasmAvailable=true', () => {
    const error = createNativeDepError(
      'tree-sitter',
      new Error('compilation failed'),
      true
    );

    expect(error.code).toBe(ErrorCodes.DEP_WASM_FALLBACK_AVAILABLE);
    expect(error.confidence).toBe(0.95);
    expect(error.nextCommand).toBe('codemap --wasm-fallback');
    expect(error.message).toContain('tree-sitter');
    expect(error.remediationPlan).toContain('--wasm-fallback');
    expect(error.remediationPlan).toContain('WASM module detected');
  });

  it('returns DEP_NATIVE_MISSING with wasmAvailable=false', () => {
    const error = createNativeDepError(
      'better-sqlite3',
      new Error('node-gyp failed'),
      false
    );

    expect(error.code).toBe(ErrorCodes.DEP_NATIVE_MISSING);
    expect(error.confidence).toBe(0.9);
    expect(error.nextCommand).toBe('codemap --wasm-fallback');
    expect(error.message).toContain('better-sqlite3');
    expect(error.remediationPlan).toContain('npm rebuild');
    expect(error.remediationPlan).not.toContain('WASM module detected');
  });

  it('preserves rootCause from native error', () => {
    const nativeError = new Error('specific native failure');
    const error = createNativeDepError('tree-sitter', nativeError, false);

    expect(error.rootCause).toBe('specific native failure');
  });
});
