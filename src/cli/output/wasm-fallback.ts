// [META] since:2026-05-01 | owner:cli-team | stable:false
// [WHY] Reactive WASM fallback — intercepts native dep failures and switches to WASM loading paths

import type { ActionableError } from './types.js';
import { createActionableError } from './errors.js';
import { ErrorCodes } from './error-codes.js';

export interface WasmFallbackResult {
  nativeAvailable: boolean;
  wasmAvailable: boolean;
  fallbackActivated: boolean;
  module: 'tree-sitter' | 'better-sqlite3';
  message: string;
}

export async function checkAndActivateWasmFallback(
  mod: 'tree-sitter' | 'better-sqlite3',
  options: { wasmFallback?: boolean }
): Promise<WasmFallbackResult> {
  if (!options.wasmFallback) {
    return {
      nativeAvailable: await checkNativeModule(mod),
      wasmAvailable: false,
      fallbackActivated: false,
      module: mod,
      message: '--wasm-fallback not requested',
    };
  }

  const nativeAvailable = await checkNativeModule(mod);
  if (nativeAvailable) {
    return {
      nativeAvailable: true,
      wasmAvailable: true,
      fallbackActivated: false,
      module: mod,
      message: 'Native module available, WASM fallback not needed',
    };
  }

  const wasmAvailable = await checkWasmModule(mod);
  if (wasmAvailable) {
    const envKey = `CODEMAP_USE_WASM_${mod.replace('-', '_').toUpperCase()}`;
    process.env[envKey] = '1';

    return {
      nativeAvailable: false,
      wasmAvailable: true,
      fallbackActivated: true,
      module: mod,
      message: `Native ${mod} unavailable — activated WASM fallback`,
    };
  }

  return {
    nativeAvailable: false,
    wasmAvailable: false,
    fallbackActivated: false,
    module: mod,
    message: `Both native and WASM ${mod} unavailable — install build tools or check WASM module`,
  };
}

export function createNativeDepError(
  mod: 'tree-sitter' | 'better-sqlite3',
  nativeError: Error,
  wasmAvailable: boolean
): ActionableError {
  const suggestions: string[] = ['--wasm-fallback'];
  if (wasmAvailable) {
    suggestions.push('WASM module detected — add --wasm-fallback to activate');
  }
  suggestions.push('npm rebuild (rebuild native modules)');

  return createActionableError(
    wasmAvailable ? ErrorCodes.DEP_WASM_FALLBACK_AVAILABLE : ErrorCodes.DEP_NATIVE_MISSING,
    `${mod} cannot be loaded: ${nativeError.message}`,
    `loading ${mod}`,
    {
      rootCause: nativeError.message,
      remediationPlan: suggestions.join('; '),
      confidence: wasmAvailable ? 0.95 : 0.9,
      nextCommand: 'codemap --wasm-fallback',
    }
  );
}

async function checkNativeModule(mod: 'tree-sitter' | 'better-sqlite3'): Promise<boolean> {
  try {
    if (mod === 'tree-sitter') {
      const ts = await import('tree-sitter');
      return !!ts.default || !!ts;
    }
    const sqlite = await import('better-sqlite3');
    return !!sqlite.default || !!sqlite;
  } catch {
    return false;
  }
}

async function checkWasmModule(mod: 'tree-sitter' | 'better-sqlite3'): Promise<boolean> {
  try {
    if (mod === 'tree-sitter') {
      const wasmModule = 'web-tree-sitter';
      await import(wasmModule);
      return true;
    }
    const nodeVersion = process.versions.node.split('.').map(Number);
    if (nodeVersion[0] >= 22) {
      const sqliteModule = 'node:sqlite';
      await import(sqliteModule);
      return true;
    }
    const sqlJsModule = 'sql.js';
    await import(sqlJsModule);
    return true;
  } catch {
    return false;
  }
}
