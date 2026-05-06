// [META] since:2026-04-30 | owner:cli-team | stable:false
// [WHY] Native dependency health checker — verifies tree-sitter and better-sqlite3 can be loaded, reuses tree-sitter-check pattern

import { createRequire } from 'node:module';
import { detectTreeSitterSync } from '../tree-sitter-check.js';
import type { DiagnosticResult } from './types.js';

function hasSqliteFamilyFallback(projectRequire: ReturnType<typeof createRequire>): boolean {
  const nodeMajorVersion = Number(process.versions.node.split('.')[0] ?? '0');
  if (nodeMajorVersion >= 22) {
    return true;
  }

  try {
    projectRequire.resolve('sql.js');
    return true;
  } catch {
    return false;
  }
}

function checkBetterSqlite3(): DiagnosticResult {
  const projectRequire = createRequire(import.meta.url);

  try {
    projectRequire('better-sqlite3');
    return {
      category: 'runtime',
      severity: 'ok',
      id: 'better-sqlite3-available',
      message: 'better-sqlite3 native module loads successfully',
      remediation: 'No action needed',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const fallbackAvailable = hasSqliteFamilyFallback(projectRequire);
    return {
      category: 'runtime',
      severity: fallbackAvailable ? 'warn' : 'error',
      id: fallbackAvailable ? 'sqlite-family-fallback-available' : 'native-dep-missing',
      message: `better-sqlite3 cannot be loaded: ${errorMessage}`,
      remediation: fallbackAvailable
        ? 'SQLite-family fallback is available. Use Node.js 22+ node:sqlite or install sql.js, then rerun with --wasm-fallback if needed'
        : 'Run npm rebuild better-sqlite3, or install Node.js 22+ / sql.js to restore SQLite-family fallback options',
    };
  }
}

export function checkNativeDeps(): DiagnosticResult[] {
  const results: DiagnosticResult[] = [];

  // Check tree-sitter using existing detection pattern
  const treeSitterInfo = detectTreeSitterSync();
  if (treeSitterInfo.isAvailable) {
    results.push({
      category: 'runtime',
      severity: 'ok',
      id: 'tree-sitter-available',
      message: `tree-sitter is available${treeSitterInfo.version ? ` (v${treeSitterInfo.version})` : ''}`,
      remediation: 'No action needed',
    });
  } else {
    results.push({
      category: 'runtime',
      severity: 'error',
      id: 'native-dep-missing',
      message: `tree-sitter cannot be loaded: ${treeSitterInfo.error ?? 'unknown error'}`,
      remediation: 'Run npm install to rebuild native dependencies, or use --wasm-fallback if available',
    });
  }

  // Check better-sqlite3 using same try-import pattern
  results.push(checkBetterSqlite3());

  return results;
}
