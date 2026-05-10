// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] ParserRegistry unit tests
// ============================================

import { describe, it, expect, beforeEach } from 'vitest';
import { ParserRegistry } from '../registry/ParserRegistry.js';
import { TreeSitterParser } from '../implementations/TreeSitterParser.js';
import { TypeScriptParser } from '../implementations/TypeScriptParser.js';
import { GoParser } from '../implementations/GoParser.js';
import { PythonTreeSitterParser } from '../implementations/PythonTreeSitterParser.js';
import { createDefaultParserRegistry } from '../index.js';

describe('ParserRegistry', () => {
  let registry: ParserRegistry;

  beforeEach(() => {
    registry = new ParserRegistry();
  });

  describe('register', () => {
    it('should register a parser', () => {
      const parser = new TypeScriptParser();
      registry.register(parser);
      
      expect(registry.getParser('typescript')).toBe(parser);
    });

    it('should register file extensions', () => {
      const parser = new TypeScriptParser();
      registry.register(parser);
      
      expect(registry.hasExtension('ts')).toBe(true);
      expect(registry.hasExtension('tsx')).toBe(true);
      expect(registry.hasExtension('js')).toBe(true);
    });
  });

  describe('getParserByFile', () => {
    it('should find parser by file extension', () => {
      registry.register(new TypeScriptParser());
      
      const parser = registry.getParserByFile('/path/to/file.ts');
      expect(parser).toBeDefined();
      expect(parser?.languageId).toBe('typescript');
    });

    it('should return undefined for unsupported extension', () => {
      registry.register(new TypeScriptParser());
      
      const parser = registry.getParserByFile('/path/to/file.py');
      expect(parser).toBeUndefined();
    });

    it('routes ts and py files through tree-sitter-backed parsers on the active path', async () => {
      const defaultRegistry = createDefaultParserRegistry();
      const tsParser = defaultRegistry.getParserByFile('/tmp/example.ts');
      const pyParser = defaultRegistry.getParserByFile('/tmp/example.py');

      expect(tsParser).toBeInstanceOf(TreeSitterParser);
      expect(pyParser).toBeInstanceOf(PythonTreeSitterParser);

      await tsParser!.initialize();
      await pyParser!.initialize();

      const tsResult = await tsParser!.parseFile('/tmp/example.ts', 'export function run() {}');
      const pyResult = await pyParser!.parseFile('/tmp/example.py', 'def run():\n    pass\n');

      expect(tsResult.parserUsed).toBe('TreeSitterParser');
      expect(pyResult.parserUsed).toBe('PythonTreeSitterParser');

      await tsParser!.dispose();
      await pyParser!.dispose();
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return all registered languages', () => {
      registry.register(new TypeScriptParser());
      registry.register(new GoParser());
      
      const languages = registry.getSupportedLanguages();
      expect(languages).toContain('typescript');
      expect(languages).toContain('go');
      expect(languages).toHaveLength(2);
    });
  });

  describe('unregister', () => {
    it('should remove parser', () => {
      registry.register(new TypeScriptParser());
      registry.unregister('typescript');
      
      expect(registry.getParser('typescript')).toBeUndefined();
      expect(registry.hasExtension('ts')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all parsers', () => {
      registry.register(new TypeScriptParser());
      registry.register(new GoParser());
      
      registry.clear();
      
      expect(registry.size).toBe(0);
      expect(registry.getSupportedLanguages()).toHaveLength(0);
    });
  });
});
