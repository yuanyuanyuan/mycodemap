// [META] since:2026-04-30 | owner:cli-team | stable:false
// [WHY] Tests for analyze command dual output mode — verifies JSON/human/TTY behavior

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveOutputMode } from '../../output/mode.js';
import { formatError } from '../../output/errors.js';
import { renderOutput } from '../../output/render.js';
import type { OutputMode } from '../../output/types.js';
import type { CodemapOutput } from '../../../orchestrator/types.js';

describe('analyze output mode integration', () => {
  describe('resolveOutputMode for analyze', () => {
    it('non-TTY defaults to JSON', () => {
      expect(resolveOutputMode({}, false)).toBe('json');
    });

    it('TTY defaults to human', () => {
      expect(resolveOutputMode({}, true)).toBe('human');
    });

    it('--human forces human in non-TTY', () => {
      expect(resolveOutputMode({ human: true }, false)).toBe('human');
    });

    it('--json forces JSON in TTY', () => {
      expect(resolveOutputMode({ json: true }, true)).toBe('json');
    });
  });

  describe('renderOutput for analyze', () => {
    let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    });

    afterEach(() => {
      stdoutWriteSpy.mockRestore();
    });

    const mockOutput: CodemapOutput = {
      schemaVersion: 'v1.0.0',
      intent: 'find',
      tool: 'codemap-orchestrated',
      confidence: { score: 0.88, level: 'high' },
      results: [
        {
          id: 'find-1',
          source: 'ast-grep',
          toolScore: 0.9,
          type: 'symbol',
          file: 'src/types.ts',
          line: 18,
          location: { file: 'src/types.ts', line: 18, column: 1 },
          content: 'Found SourceLocation',
          relevance: 0.88,
          keywords: ['SourceLocation'],
          metadata: { stability: true, riskLevel: 'low' },
        },
      ],
      metadata: { total: 1, resultCount: 1, scope: 'direct' },
    };

    it('JSON mode writes valid JSON parseable by JSON.parse', () => {
      const humanRenderer = () => 'human output';
      renderOutput(mockOutput, humanRenderer, 'json');

      const written = stdoutWriteSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(written.trim());
      expect(parsed.intent).toBe('find');
      expect(parsed.results).toHaveLength(1);
      expect(parsed.results[0].file).toBe('src/types.ts');
    });

    it('JSON mode output is jq-friendly (single object)', () => {
      const humanRenderer = () => 'human output';
      renderOutput(mockOutput, humanRenderer, 'json');

      const written = stdoutWriteSpy.mock.calls[0][0] as string;
      // Should be parseable as a single JSON object (not array)
      const parsed = JSON.parse(written.trim());
      expect(typeof parsed).toBe('object');
      expect(Array.isArray(parsed)).toBe(false);
      // Should have .intent field accessible via jq '.intent'
      expect(parsed.intent).toBe('find');
    });

    it('human mode writes human renderer output', () => {
      const humanRenderer = (_data: CodemapOutput) => 'FIND Analysis Results\n...';
      renderOutput(mockOutput, humanRenderer, 'human');

      const written = stdoutWriteSpy.mock.calls[0][0] as string;
      expect(written.trim()).toContain('FIND Analysis Results');
    });
  });

  describe('formatError for analyze', () => {
    it('JSON mode returns structured error', () => {
      const error = new Error('missing target') as Error & { code: string; remediation: string };
      error.code = 'MISSING_TARGET';
      error.remediation = 'Provide --targets flag';

      const result = formatError(error, 'json');
      const parsed = JSON.parse(result);
      expect(parsed.type).toBe('error');
      expect(parsed.code).toBe('MISSING_TARGET');
      expect(parsed.remediation).toBe('Provide --targets flag');
    });

    it('human mode returns readable error', () => {
      const error = new Error('missing target') as Error & { code: string };
      error.code = 'MISSING_TARGET';

      const result = formatError(error, 'human');
      expect(result).toContain('missing target');
      expect(result).toContain('MISSING_TARGET');
    });

    it('JSON mode includes attempted field from codemap analyze', () => {
      const error = new Error('something failed');
      const result = formatError(error, 'json', 'codemap analyze');
      const parsed = JSON.parse(result);
      expect(parsed.attempted).toBe('codemap analyze');
    });

    it('human mode includes Attempted label for codemap analyze', () => {
      const error = new Error('something failed');
      const result = formatError(error, 'human', 'codemap analyze');
      expect(result).toContain('Attempted:');
      expect(result).toContain('codemap analyze');
    });

    it('JSON mode includes rootCause and confidence', () => {
      const error = new Error('tree-sitter cannot be loaded');
      const result = formatError(error, 'json', 'codemap analyze');
      const parsed = JSON.parse(result);
      expect(parsed.rootCause).toBeDefined();
      expect(parsed.confidence).toBeDefined();
    });
  });
});
