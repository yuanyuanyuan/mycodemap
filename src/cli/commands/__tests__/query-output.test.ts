// [META] since:2026-04-30 | owner:cli-team | stable:false
// [WHY] Tests for query command dual output mode — verifies JSON/human/TTY behavior

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveOutputMode } from '../../output/mode.js';
import { formatError } from '../../output/errors.js';
import { renderOutput } from '../../output/render.js';

interface QueryResult {
  type: string;
  query: string;
  count: number;
  results: Array<{ name: string; kind: string; path?: string }>;
  metrics?: { indexLoadTime: number; queryTime: number; totalTime: number; cacheHit: boolean; indexSize: number };
}

describe('query output mode integration', () => {
  describe('resolveOutputMode for query', () => {
    it('non-TTY defaults to JSON', () => {
      expect(resolveOutputMode({}, false)).toBe('json');
    });

    it('--human forces human in non-TTY', () => {
      expect(resolveOutputMode({ human: true }, false)).toBe('human');
    });
  });

  describe('renderOutput for query', () => {
    let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    });

    afterEach(() => {
      stdoutWriteSpy.mockRestore();
    });

    const mockQueryResult: QueryResult = {
      type: 'symbol',
      query: 'SourceLocation',
      count: 1,
      results: [
        { name: 'SourceLocation', kind: 'interface', path: 'src/types.ts' },
      ],
    };

    it('JSON mode writes valid JSON', () => {
      const humanRenderer = () => 'human output';
      renderOutput(mockQueryResult, humanRenderer, 'json');

      const written = stdoutWriteSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(written.trim());
      expect(parsed.type).toBe('symbol');
      expect(parsed.query).toBe('SourceLocation');
      expect(parsed.count).toBe(1);
      expect(parsed.results).toHaveLength(1);
    });

    it('JSON mode is jq-friendly', () => {
      const humanRenderer = () => 'human output';
      renderOutput(mockQueryResult, humanRenderer, 'json');

      const written = stdoutWriteSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(written.trim());
      // jq '.query' should return "SourceLocation"
      expect(parsed.query).toBe('SourceLocation');
      // jq '.count' should return 1
      expect(parsed.count).toBe(1);
    });

    it('human mode writes human renderer output', () => {
      const humanRenderer = (_data: QueryResult) => 'Query "SourceLocation" (symbol)\n   Found 1 results';
      renderOutput(mockQueryResult, humanRenderer, 'human');

      const written = stdoutWriteSpy.mock.calls[0][0] as string;
      expect(written.trim()).toContain('Query "SourceLocation"');
    });
  });

  describe('formatError for query', () => {
    it('JSON mode returns structured error for missing query type', () => {
      const error = new Error('Please specify query type') as Error & { code: string; remediation: string };
      error.code = 'MISSING_QUERY_TYPE';
      error.remediation = 'Run codemap query --symbol <name>';

      const result = formatError(error, 'json');
      const parsed = JSON.parse(result);
      expect(parsed.type).toBe('error');
      expect(parsed.code).toBe('MISSING_QUERY_TYPE');
    });
  });
});
