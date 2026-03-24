import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { GlobalSymbolIndexBuilder } from '../global-index.js';
import type { ParseResult } from '../../parser/interfaces/IParser.js';

describe('GlobalSymbolIndexBuilder', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('resolves tsconfig paths aliases with imported symbol aliases', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'codemap-global-index-'));
    tempRoots.push(root);

    mkdirSync(path.join(root, 'src/lib'), { recursive: true });
    writeFileSync(path.join(root, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        baseUrl: '.',
        paths: {
          '@lib/*': ['src/lib/*'],
        },
      },
    }, null, 2));
    writeFileSync(path.join(root, 'src/lib/util.ts'), 'export function helper() {}');
    writeFileSync(path.join(root, 'src/app.ts'), 'import { helper as aliasedHelper } from "@lib/util";');

    const utilPath = path.join(root, 'src/lib/util.ts');
    const appPath = path.join(root, 'src/app.ts');
    const results: ParseResult[] = [
      {
        path: utilPath,
        type: 'source',
        stats: { lines: 1, codeLines: 1, commentLines: 0, blankLines: 0 },
        dependencies: [],
        imports: [],
        exports: [{
          name: 'helper',
          kind: 'function',
          isDefault: false,
          isTypeOnly: false,
        }],
        symbols: [{
          id: 'sym-helper',
          name: 'helper',
          kind: 'function',
          location: { file: utilPath, line: 1, column: 0 },
          visibility: 'public',
          relatedSymbols: [],
        }],
      },
      {
        path: appPath,
        type: 'source',
        stats: { lines: 1, codeLines: 1, commentLines: 0, blankLines: 0 },
        dependencies: [],
        imports: [{
          source: '@lib/util',
          sourceType: 'alias',
          specifiers: [{
            name: 'helper',
            alias: 'aliasedHelper',
            isTypeOnly: false,
          }],
          isTypeOnly: false,
        }],
        exports: [],
        symbols: [{
          id: 'sym-run',
          name: 'run',
          kind: 'function',
          location: { file: appPath, line: 1, column: 0 },
          visibility: 'internal',
          relatedSymbols: [],
        }],
        callGraph: {
          calls: [{ caller: 'run', callee: 'aliasedHelper', line: 1 }],
          recursive: [],
          callCounts: {},
        },
      },
    ];

    const builder = new GlobalSymbolIndexBuilder(root);
    builder.build(results);

    expect(builder.getCrossFileCalls('src/app.ts')).toEqual([
      expect.objectContaining({
        callee: 'aliasedHelper',
        importPath: '@lib/util',
        resolved: true,
        calleeLocation: expect.objectContaining({
          file: 'src/lib/util.ts',
          line: 1,
        }),
      }),
    ]);
  });
});
