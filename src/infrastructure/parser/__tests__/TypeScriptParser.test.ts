// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] TypeScriptParser unit tests
// ============================================

import { describe, it, expect, beforeEach } from 'vitest';
import { TypeScriptParser } from '../implementations/TypeScriptParser.js';

describe('TypeScriptParser', () => {
  let parser: TypeScriptParser;

  beforeEach(async () => {
    parser = new TypeScriptParser();
    await parser.initialize();
  });

  describe('parseFile', () => {
    it('should parse a simple TypeScript file', async () => {
      const content = `
        export class TestClass {
          public name: string;
        }
      `;
      
      const result = await parser.parseFile('/test.ts', content);
      
      expect(result.filePath).toBe('/test.ts');
      expect(result.language).toBe('typescript');
      expect(result.symbols.length).toBeGreaterThan(0);
    });

    it('should extract imports', async () => {
      const content = `
        import { foo } from './foo';
        import * as bar from 'bar';
      `;
      
      const result = await parser.parseFile('/test.ts', content);
      
      expect(result.imports.length).toBe(2);
    });

    it('should extract exports', async () => {
      const content = `
        export class Foo {}
        export function bar() {}
      `;
      
      const result = await parser.parseFile('/test.ts', content);
      
      expect(result.exports.length).toBe(2);
      expect(result.exports[0]?.kind).toBe('class');
      expect(result.exports[1]?.kind).toBe('function');
    });

    it('should calculate stats', async () => {
      const content = [
        '// Comment',
        'export class Foo {}',
        '',
        'const x = 1;',
      ].join('\n');
      
      const result = await parser.parseFile('/test.ts', content);
      
      expect(result.module.stats.lines).toBe(4);
      expect(result.module.stats.commentLines).toBe(1);
    });
  });

  describe('extractImports', () => {
    it('should extract ES6 imports', async () => {
      const content = `import { foo, bar as baz } from './module';`;
      const imports = await parser.extractImports(content);
      
      expect(imports).toHaveLength(1);
      expect(imports[0]?.source).toBe('./module');
      expect(imports[0]?.specifiers).toHaveLength(2);
    });
  });

  describe('supportsFeature', () => {
    it('should support TypeScript features', () => {
      expect(parser.supportsFeature('type-inference')).toBe(true);
      expect(parser.supportsFeature('generic-types')).toBe(true);
      expect(parser.supportsFeature('decorators')).toBe(true);
    });
  });
});
