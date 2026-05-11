// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] GoParser unit tests
// ============================================

import { beforeEach, describe, expect, it } from 'vitest';
import { GoParser } from '../implementations/GoParser.js';

describe('GoParser', () => {
  let parser: GoParser;

  beforeEach(async () => {
    parser = new GoParser();
    await parser.initialize();
  });

  it('parses imports, exported declarations and symbols from Go files', async () => {
    const content = [
      'package service',
      '',
      'import (',
      '  "fmt"',
      '  "example/internal/helper"',
      ')',
      '',
      'type Service struct {}',
      '',
      'func Handle() {}',
      'func local() {}',
    ].join('\n');

    const result = await parser.parseFile('/tmp/service.go', content);

    expect(result.imports.map((entry) => entry.source)).toEqual(['fmt', 'example/internal/helper']);
    expect(result.exports.map((entry) => entry.name)).toEqual(['Service', 'Handle']);
    expect(result.symbols.map((entry) => entry.name)).toEqual(['Handle', 'local', 'Service']);
  });

  it('returns canonical complexity truth when includeComplexity is requested', async () => {
    const content = [
      'package service',
      '',
      'func Handle(items []int) int {',
      '  total := 0',
      '  for _, item := range items {',
      '    if item > 0 && item < 10 {',
      '      total += item',
      '    }',
      '  }',
      '  return total',
      '}',
    ].join('\n');

    const result = await parser.parseFile('/tmp/service.go', content, { includeComplexity: true });

    expect(result.complexity).toEqual(expect.objectContaining({
      cyclomatic: expect.any(Number),
      cognitive: expect.any(Number),
      maintainability: expect.any(Number),
      details: expect.objectContaining({
        functions: expect.arrayContaining([
          expect.objectContaining({ name: 'Handle', cyclomatic: expect.any(Number) }),
        ]),
      }),
    }));
  });
});
