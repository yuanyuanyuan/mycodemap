// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] PythonParser unit tests
// ============================================

import { beforeEach, describe, expect, it } from 'vitest';
import { PythonParser } from '../implementations/PythonParser.js';

describe('PythonParser', () => {
  let parser: PythonParser;

  beforeEach(async () => {
    parser = new PythonParser();
    await parser.initialize();
  });

  it('parses imports, exports and symbols from common Python patterns', async () => {
    const content = [
      'import os as operating_system',
      'from pkg.module import helper as alias',
      '',
      'class Service(BaseService):',
      '    pass',
      '',
      'def run():',
      '    return alias()',
    ].join('\n');

    const result = await parser.parseFile('/tmp/service.py', content);

    expect(result.imports).toHaveLength(2);
    expect(result.exports.map((entry) => entry.name)).toEqual(['Service', 'run']);
    expect(result.symbols.map((entry) => entry.name)).toEqual(['Service', 'run']);
  });
});
