// [META] since:2026-05 | owner:architecture-team | phase:81
// [WHY] Dependency entity unit tests for canonical edge ID normalization
// ============================================

import { describe, it, expect } from 'vitest';
import { Dependency } from '../Dependency.js';

describe('Dependency', () => {
  describe('constructor', () => {
    it('should create a dependency with valid data', () => {
      const dependency = new Dependency(
        'dep-1',
        'mod-a',
        'mod-b',
        'import',
        'module',
        'module',
        'EXTRACTED',
        'src/a.ts',
        3
      );

      expect(dependency.id).toBe('dep-1');
      expect(dependency.sourceId).toBe('mod-a');
      expect(dependency.targetId).toBe('mod-b');
      expect(dependency.type).toBe('import');
      expect(dependency.confidence).toBe('EXTRACTED');
      expect(dependency.filePath).toBe('src/a.ts');
      expect(dependency.line).toBe(3);
    });

    it('should reject invalid confidence values', () => {
      expect(() => new Dependency(
        'dep-1',
        'mod-a',
        'mod-b',
        'import',
        'module',
        'module',
        'HIGH' as never
      )).toThrow('Invalid dependency confidence: HIGH');
    });
  });

  describe('canonical helpers', () => {
    it('should preserve slash-normalized module and symbol references', () => {
      expect(Dependency.createModuleReference('src\\Feature\\Thing.ts')).toBe('src/Feature/Thing.ts');
      expect(Dependency.createSymbolReference('src\\Feature\\Thing.ts', 'DoWork', 12, 4))
        .toBe('src/Feature/Thing.ts::DoWork::12::4');
    });

    it('should create lowercase underscore-safe canonical ids from semantic references', () => {
      expect(Dependency.createCanonicalId(
        'src/Feature/A.ts::Caller::10::2',
        'src/Feature/B.ts::Callee::20::8',
        'call',
        'symbol',
        'symbol',
        'src/Feature/A.ts'
      )).toBe(
        'dep_symbol__src_feature_a_ts_caller_10_2__call__symbol__src_feature_b_ts_callee_20_8__src_feature_a_ts'
      );
    });

    it('should collapse formatting-only differences to the same canonical id', () => {
      const canonicalId = Dependency.createCanonicalId(
        'SRC/Feature/A.ts::Caller Name::10::2',
        'src\\feature\\b.ts::callee-name::20::8',
        'call',
        'symbol',
        'symbol',
        'SRC\\Feature\\A.ts'
      );

      expect(canonicalId).toBe(Dependency.createCanonicalId(
        ' src/feature/a.ts::caller-name::10::2 ',
        'src/feature/b.ts::callee name::20::8',
        'call',
        'symbol',
        'symbol',
        'src/feature/a.ts'
      ));
    });
  });
});
