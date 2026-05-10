// [META] since:2026-05-01 | owner:cli-team | stable:false
// [WHY] Env-var gated loader — reads CODEMAP_USE_WASM_TREE_SITTER set by Phase 45's
// checkAndActivateWasmFallback and dynamically imports the right implementation.

import { createActionableError } from '../../cli/output/errors.js';
import { ErrorCodes } from '../../cli/output/error-codes.js';

let wasmTreeSitterPromise: Promise<TreeSitterLoaderResult> | null = null;
let hasWarnedNativeFallback = false;

export interface TreeSitterLoaderResult {
  Parser: any;
  TypeScript: { typescript: any; tsx?: any };
  Python: any;
}

/**
 * Load tree-sitter implementation based on environment configuration.
 *
 * Priority:
 * 1. If CODEMAP_USE_WASM_TREE_SITTER='1' → load web-tree-sitter (WASM)
 * 2. Otherwise → load native tree-sitter
 * 3. If native fails and WASM is available → auto-fallback with warning
 */
export async function loadTreeSitter(): Promise<TreeSitterLoaderResult> {
  const forceWASM = process.env.CODEMAP_USE_WASM_TREE_SITTER === '1';

  if (forceWASM) {
    return loadWASMTreeSitter();
  }

  // Try native first
  try {
    const native = await loadNativeTreeSitter();
    return native;
  } catch (nativeError) {
    // Native failed — try WASM fallback automatically
    try {
      const wasm = await loadWASMTreeSitter();
      if (!hasWarnedNativeFallback) {
        hasWarnedNativeFallback = true;
        // eslint-disable-next-line no-console
        console.warn(
          '⚠️  Native tree-sitter unavailable, using WASM fallback. ' +
          'Add --native to force native (requires build tools).'
        );
      }
      return wasm;
    } catch (wasmError) {
      throw createTreeSitterLoaderError(nativeError as Error, wasmError as Error);
    }
  }
}

async function loadNativeTreeSitter(): Promise<TreeSitterLoaderResult> {
  const treeSitterModule = await import('tree-sitter');
  const typescriptModule = await import('tree-sitter-typescript');
  const pythonModule = await import('tree-sitter-python');
  const Parser = treeSitterModule.default;
  const pythonLanguage = (pythonModule as any).default?.language ?? (pythonModule as any).language;
  const validationParser = new Parser();

  validationParser.setLanguage(typescriptModule.typescript);
  void validationParser.parse('export const ok = 1').rootNode.type;

  validationParser.setLanguage(pythonLanguage);
  void validationParser.parse('x = 1').rootNode.type;

  return {
    Parser,
    TypeScript: typescriptModule,
    Python: pythonLanguage,
  };
}

async function loadWASMTreeSitter(): Promise<TreeSitterLoaderResult> {
  if (!wasmTreeSitterPromise) {
    wasmTreeSitterPromise = loadWASMTreeSitterUncached();
  }

  return wasmTreeSitterPromise;
}

async function loadWASMTreeSitterUncached(): Promise<TreeSitterLoaderResult> {
  try {
    const Parser = await import('web-tree-sitter');
    const wasmParser = Parser.default || Parser;

    // web-tree-sitter requires explicit init
    if (typeof wasmParser.init === 'function') {
      await wasmParser.init();
    }

    // Load TypeScript language WASM
    // web-tree-sitter languages are loaded via .wasm files
    let typescriptLanguage: any;
    let tsxLanguage: any;
    let pythonLanguage: any;
    try {
      const { createRequire } = await import('node:module');
      const require = createRequire(import.meta.url);
      // Try to load from tree-sitter-typescript's wasm file if available
      const tsWasmPath = require.resolve('tree-sitter-typescript/typescript.wasm');
      const tsxWasmPath = require.resolve('tree-sitter-typescript/tsx.wasm');
      const pyWasmPath = require.resolve('tree-sitter-python/tree-sitter-python.wasm');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Lang = (wasmParser as any).Language;
      typescriptLanguage = await Lang.load(tsWasmPath);
      tsxLanguage = await Lang.load(tsxWasmPath);
      pythonLanguage = await Lang.load(pyWasmPath);
    } catch {
      // Fallback: try to find any .wasm in tree-sitter-typescript package
      try {
        const { dirname, join } = await import('node:path');
        const { createRequire } = await import('node:module');
        const require = createRequire(import.meta.url);
        const tsPkgDir = dirname(require.resolve('tree-sitter-typescript/package.json'));
        const typescriptWasmPath = join(tsPkgDir, 'tree-sitter-typescript.wasm');
        const tsxWasmPath = join(tsPkgDir, 'tree-sitter-tsx.wasm');
        const pyWasmPath = require.resolve('tree-sitter-python/tree-sitter-python.wasm');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Lang = (wasmParser as any).Language;
        typescriptLanguage = await Lang.load(typescriptWasmPath);
        tsxLanguage = await Lang.load(tsxWasmPath);
        pythonLanguage = await Lang.load(pyWasmPath);
      } catch {
        throw new Error(
          'web-tree-sitter loaded but TypeScript/Python WASM grammars not found. ' +
          'Install: npm install web-tree-sitter tree-sitter-typescript tree-sitter-python'
        );
      }
    }

    return {
      Parser: wasmParser,
      TypeScript: { typescript: typescriptLanguage, tsx: tsxLanguage },
      Python: pythonLanguage,
    };
  } catch (error) {
    throw new Error(
      `WASM tree-sitter unavailable: ${error instanceof Error ? error.message : String(error)}. ` +
      'Install: npm install web-tree-sitter'
    );
  }
}

function createTreeSitterLoaderError(nativeError: Error, wasmError: Error): Error {
  return createActionableError(
    ErrorCodes.DEP_NATIVE_MISSING,
    `tree-sitter cannot be loaded: ${nativeError.message}`,
    'loading tree-sitter parser',
    {
      rootCause: nativeError.message,
      remediationPlan: [
        'Install build tools (python, make, gcc) and run: npm rebuild tree-sitter tree-sitter-typescript tree-sitter-python',
        'Or use WASM fallback: npm install web-tree-sitter tree-sitter-typescript tree-sitter-python',
        'Or use --wasm-fallback flag to auto-activate WASM on first run',
      ].join('; '),
      confidence: 0.9,
      nextCommand: 'codemap --wasm-fallback',
    }
  );
}
