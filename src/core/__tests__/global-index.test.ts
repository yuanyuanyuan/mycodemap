import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { GlobalSymbolIndexBuilder } from '../global-index.js';
import type { ParseResult } from '../../interface/types/parser.js';

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
        filePath: utilPath,
        language: 'typescript',
        module: {
          id: 'module-util',
          path: utilPath,
          absolutePath: utilPath,
          type: 'source',
          stats: { lines: 1, codeLines: 1, commentLines: 0, blankLines: 0 },
          exports: [],
          imports: [],
          symbols: [],
          dependencies: [],
          dependents: [],
        },
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
        parseTime: 1,
      },
      {
        filePath: appPath,
        language: 'typescript',
        module: {
          id: 'module-app',
          path: appPath,
          absolutePath: appPath,
          type: 'source',
          stats: { lines: 1, codeLines: 1, commentLines: 0, blankLines: 0 },
          exports: [],
          imports: [],
          symbols: [],
          dependencies: [],
          dependents: [],
        },
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
        },
        parseTime: 1,
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

  it('resolves imported Python functions and qualified class methods conservatively', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'codemap-global-index-py-'));
    tempRoots.push(root);

    mkdirSync(path.join(root, 'src'), { recursive: true });
    writeFileSync(path.join(root, 'src/helpers.py'), 'def helper_run():\n    return 1\n');
    writeFileSync(path.join(root, 'src/main.py'), 'from helpers import helper_run, Service\n');

    const helpersPath = path.join(root, 'src/helpers.py');
    const mainPath = path.join(root, 'src/main.py');
    const results: ParseResult[] = [
      {
        filePath: helpersPath,
        language: 'python',
        module: {
          id: 'module-helpers',
          path: helpersPath,
          absolutePath: helpersPath,
          type: 'source',
          stats: { lines: 4, codeLines: 4, commentLines: 0, blankLines: 0 },
          exports: [],
          imports: [],
          symbols: [],
          dependencies: [],
          dependents: [],
        },
        dependencies: [],
        imports: [],
        exports: [
          { name: 'helper_run', kind: 'function', isDefault: false, isTypeOnly: false },
          { name: 'Service', kind: 'class', isDefault: false, isTypeOnly: false },
        ],
        symbols: [
          {
            id: 'sym-helper-run',
            name: 'helper_run',
            kind: 'function',
            location: { file: helpersPath, line: 1, column: 0 },
            visibility: 'public',
            relatedSymbols: [],
          },
          {
            id: 'sym-service',
            name: 'Service',
            kind: 'class',
            location: { file: helpersPath, line: 3, column: 0 },
            visibility: 'public',
            relatedSymbols: [],
          },
          {
            id: 'sym-service-utility',
            name: 'Service.utility',
            kind: 'method',
            location: { file: helpersPath, line: 4, column: 4 },
            visibility: 'public',
            relatedSymbols: [],
          },
        ],
        parseTime: 1,
      },
      {
        filePath: mainPath,
        language: 'python',
        module: {
          id: 'module-main',
          path: mainPath,
          absolutePath: mainPath,
          type: 'source',
          stats: { lines: 4, codeLines: 4, commentLines: 0, blankLines: 0 },
          exports: [],
          imports: [],
          symbols: [],
          dependencies: [],
          dependents: [],
        },
        dependencies: [],
        imports: [{
          source: 'helpers',
          sourceType: 'absolute',
          specifiers: [
            { name: 'helper_run', isTypeOnly: false },
            { name: 'Service', isTypeOnly: false },
          ],
          isTypeOnly: false,
        }],
        exports: [],
        symbols: [{
          id: 'sym-execute',
          name: 'execute',
          kind: 'function',
          location: { file: mainPath, line: 1, column: 0 },
          visibility: 'public',
          relatedSymbols: [],
        }],
        callGraph: {
          calls: [
            { caller: 'execute', callee: 'helper_run', line: 2 },
            { caller: 'execute', callee: 'Service.utility', line: 3 },
          ],
          recursive: [],
          issues: [],
        },
        parseTime: 1,
      },
    ];

    const builder = new GlobalSymbolIndexBuilder(root);
    builder.build(results);

    expect(builder.getCrossFileCalls('src/main.py')).toEqual(expect.arrayContaining([
      expect.objectContaining({
        callee: 'helper_run',
        importPath: 'helpers',
        resolved: true,
        calleeLocation: expect.objectContaining({
          file: 'src/helpers.py',
          line: 1,
        }),
      }),
      expect.objectContaining({
        callee: 'Service.utility',
        importPath: 'helpers',
        resolved: true,
        calleeLocation: expect.objectContaining({
          file: 'src/helpers.py',
          line: 4,
        }),
      }),
    ]));
  });
});
