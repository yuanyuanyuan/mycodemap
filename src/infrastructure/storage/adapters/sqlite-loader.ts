// [META] since:2026-05-01 | owner:cli-team | stable:false
// [WHY] Env-var gated loader — reads CODEMAP_USE_WASM_BETTER_SQLITE3 set by Phase 45's
// checkAndActivateWasmFallback and dynamically imports the right SQLite implementation.

import { createActionableError } from '../../../cli/output/errors.js';
import { ErrorCodes } from '../../../cli/output/error-codes.js';

interface SQLiteStatementLike {
  run: (...params: unknown[]) => unknown;
  get: (...params: unknown[]) => Record<string, unknown> | undefined;
  all: (...params: unknown[]) => Array<Record<string, unknown>>;
}

interface SQLiteDatabaseLike {
  exec: (sql: string) => unknown;
  prepare: (sql: string) => SQLiteStatementLike;
  pragma?: (pragma: string) => unknown;
  close: () => void;
}

export type SQLiteConstructor = new (filename: string) => SQLiteDatabaseLike;

/**
 * Load SQLite implementation based on environment configuration.
 *
 * Priority:
 * 1. If CODEMAP_USE_WASM_BETTER_SQLITE3='1' → load node:sqlite (Node 22+) or sql.js (fallback)
 * 2. Otherwise → load native better-sqlite3
 * 3. If native fails and WASM is available → auto-fallback with warning
 */
export async function loadSQLite(): Promise<SQLiteConstructor> {
  const forceWASM = process.env.CODEMAP_USE_WASM_BETTER_SQLITE3 === '1';

  if (forceWASM) {
    return loadWASMSQLite();
  }

  // Try native first
  try {
    return loadNativeSQLite();
  } catch (nativeError) {
    // Native failed — try WASM fallback automatically
    try {
      const wasmCtor = await loadWASMSQLite();
      // eslint-disable-next-line no-console
      console.warn(
        '⚠️  Native better-sqlite3 unavailable, using WASM fallback. ' +
        'Add --native to force native (requires build tools).'
      );
      return wasmCtor;
    } catch (wasmError) {
      throw createSQLiteLoaderError(nativeError as Error, wasmError as Error);
    }
  }
}

function loadNativeSQLite(): SQLiteConstructor {
  try {
    const betterSqlite3 = require('better-sqlite3');
    return betterSqlite3.default || betterSqlite3;
  } catch (error) {
    throw new Error(
      `better-sqlite3 cannot be loaded: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function loadWASMSQLite(): Promise<SQLiteConstructor> {
  // Prefer node:sqlite on Node.js 22+
  const nodeVersion = process.versions.node.split('.').map(Number);
  if (nodeVersion[0] >= 22) {
    try {
      return loadNodeSqlite();
    } catch {
      // Fall through to sql.js
    }
  }

  // Fallback to sql.js
  return loadSqlJs();
}

function loadNodeSqlite(): SQLiteConstructor {
  try {
    const { DatabaseSync } = require('node:sqlite');

    // Wrap DatabaseSync to match SQLiteDatabaseLike interface
    return class NodeSqliteWrapper implements SQLiteDatabaseLike {
      private db: InstanceType<typeof DatabaseSync>;

      constructor(filename: string) {
        this.db = new DatabaseSync(filename);
      }

      exec(sql: string): void {
        this.db.exec(sql);
      }

      prepare(sql: string) {
        const stmt = this.db.prepare(sql);
        return {
          run: (...params: unknown[]): unknown => {
            const result = stmt.run(...params as [unknown]);
            return result;
          },
          get: (...params: unknown[]): Record<string, unknown> | undefined => {
            const result = stmt.get(...params as [unknown]);
            return result as Record<string, unknown> | undefined;
          },
          all: (...params: unknown[]): Array<Record<string, unknown>> => {
            const result = stmt.all(...params as [unknown]);
            return result as Array<Record<string, unknown>>;
          },
        };
      }

      pragma(pragma: string): unknown {
        // node:sqlite doesn't have a dedicated pragma method.
        // Use exec for PRAGMA statements that don't return results,
        // or prepare+get for those that do.
        if (pragma.includes('=')) {
          this.db.exec(`PRAGMA ${pragma}`);
          return undefined;
        }
        const stmt = this.db.prepare(`PRAGMA ${pragma}`);
        return stmt.get();
      }

      close(): void {
        this.db.close();
      }
    } as unknown as SQLiteConstructor;
  } catch (error) {
    throw new Error(
      `node:sqlite unavailable: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function loadSqlJs(): Promise<SQLiteConstructor> {
  try {
    const SQL = await import('sql.js');
    const sqlJsModule = SQL.default || SQL;

    return class SqlJsWrapper implements SQLiteDatabaseLike {
      private db: InstanceType<typeof sqlJsModule.Database>;
      private filename: string;

      constructor(filename: string) {
        this.filename = filename;
        if (filename === ':memory:') {
          this.db = new sqlJsModule.Database();
        } else {
          const fs = require('node:fs');
          const data = fs.existsSync(filename) ? fs.readFileSync(filename) : null;
          this.db = new sqlJsModule.Database(data);
        }
      }

      exec(sql: string): void {
        this.db.run(sql);
      }

      prepare(sql: string) {
        return {
          run: (...params: unknown[]): unknown => {
            // sql.js exec returns [{ columns: [], values: [] }]
            // For INSERT/UPDATE/DELETE, we just execute and return a compatible shape
            try {
              this.db.run(sql, params);
              return { changes: 1 };
            } catch {
              // Try without params binding (sql.js binding is different)
              this.db.run(sql);
              return { changes: 1 };
            }
          },
          get: (...params: unknown[]): Record<string, unknown> | undefined => {
            const result = this.db.exec(sql, params);
            if (!result || result.length === 0) return undefined;
            const { columns, values } = result[0];
            if (!values || values.length === 0) return undefined;
            const row: Record<string, unknown> = {};
            columns.forEach((col: string, i: number) => {
              row[col] = values[0][i];
            });
            return row;
          },
          all: (...params: unknown[]): Array<Record<string, unknown>> => {
            const result = this.db.exec(sql, params);
            if (!result || result.length === 0) return [];
            const { columns, values } = result[0];
            if (!values) return [];
            return values.map((val: unknown[]) => {
              const row: Record<string, unknown> = {};
              columns.forEach((col: string, i: number) => {
                row[col] = val[i];
              });
              return row;
            });
          },
        };
      }

      pragma(pragma: string): unknown {
        const result = this.db.exec(`PRAGMA ${pragma}`);
        if (!result || result.length === 0) return undefined;
        return result[0];
      }

      close(): void {
        // Persist to disk if not :memory:
        if (this.filename !== ':memory:') {
          const fs = require('node:fs');
          const data = this.db.export();
          fs.writeFileSync(this.filename, Buffer.from(data));
        }
        this.db.close();
      }
    } as unknown as SQLiteConstructor;
  } catch (error) {
    throw new Error(
      `sql.js unavailable: ${error instanceof Error ? error.message : String(error)}. ` +
      'Install: npm install sql.js'
    );
  }
}

function createSQLiteLoaderError(nativeError: Error, wasmError: Error): Error {
  return createActionableError(
    ErrorCodes.DEP_NATIVE_MISSING,
    `better-sqlite3 cannot be loaded: ${nativeError.message}`,
    'loading better-sqlite3 storage',
    {
      rootCause: nativeError.message,
      remediationPlan: [
        'Install build tools (python, make, gcc) and run: npm rebuild better-sqlite3',
        'Or use Node.js 22+ (has built-in node:sqlite — no install needed)',
        'Or use WASM fallback: npm install sql.js',
        'Or use --wasm-fallback flag to auto-activate WASM on first run',
      ].join('; '),
      confidence: 0.9,
      nextCommand: 'codemap --wasm-fallback',
    }
  );
}
