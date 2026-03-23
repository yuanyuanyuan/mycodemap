// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] ParserRegistry unit tests
// ============================================

import { describe, it, expect, beforeEach } from 'vitest';
import { ParserRegistry, ParserNotFoundError } from '../registry/ParserRegistry.js';
import { TypeScriptParser } from '../implementations/TypeScriptParser.js';
import { GoParser } from '../implementations/GoParser.js';

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
