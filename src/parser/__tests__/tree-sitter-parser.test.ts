import { describe, expect, it } from 'vitest';
import { TreeSitterParser } from '../../infrastructure/parser/implementations/TreeSitterParser.js';

describe('TreeSitterParser', () => {
  it('uses the same shared parser class for TypeScript inputs', async () => {
    const parser = new TreeSitterParser({ rootDir: process.cwd(), mode: 'tree-sitter' });
    await parser.initialize();
    const result = await parser.parseContent(
      '/tmp/example.ts',
      [
        "import { helper } from './helper';",
        'export class Service {}',
        'export function run() {',
        '  return helper();',
        '}',
      ].join('\n'),
    );

    expect(result.language).toBe('typescript');
    expect(result.parserUsed).toBe('TreeSitterParser');
    expect(result.imports.map((entry) => entry.source)).toContain('./helper');
    expect(result.exports.map((entry) => entry.name)).toContain('Service');
    expect(result.symbols.some((symbol) => symbol.name === 'run' && symbol.kind === 'function')).toBe(true);
  });

  it('uses the same shared parser class for Python inputs', async () => {
    const parser = new TreeSitterParser({ rootDir: process.cwd(), mode: 'tree-sitter' });
    await parser.initialize();
    const result = await parser.parseContent(
      '/tmp/example.py',
      [
        'from pkg.service import helper',
        '',
        '@decorator',
        'def outer():',
        '    def inner():',
        '        return helper()',
        '    return inner()',
      ].join('\n'),
    );

    expect(result.language).toBe('python');
    expect(result.parserUsed).toBe('TreeSitterParser');
    expect(result.imports.map((entry) => entry.source)).toContain('pkg.service');
    expect(result.symbols.some((symbol) => symbol.name === 'outer' && symbol.kind === 'function')).toBe(true);
    expect(result.symbols.some((symbol) => symbol.name === 'inner' && symbol.kind === 'function')).toBe(true);
    expect(result.symbols.find((symbol) => symbol.name === 'outer')?.decorators?.[0]?.name).toBe('decorator');
  });
});
