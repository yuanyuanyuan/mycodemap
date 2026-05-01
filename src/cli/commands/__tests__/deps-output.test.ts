// [META] since:2026-04-30 | owner:cli-team | stable:false
// [WHY] Tests for deps command dual output mode — verifies JSON/human/TTY behavior

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveOutputMode } from '../../output/mode.js';
import { formatError } from '../../output/errors.js';
import { renderOutput } from '../../output/render.js';

describe('deps output mode integration', () => {
  describe('resolveOutputMode for deps', () => {
    it('non-TTY defaults to JSON', () => {
      expect(resolveOutputMode({}, false)).toBe('json');
    });

    it('--human forces human in non-TTY', () => {
      expect(resolveOutputMode({ human: true }, false)).toBe('human');
    });

    it('--json forces JSON in TTY', () => {
      expect(resolveOutputMode({ json: true }, true)).toBe('json');
    });
  });

  describe('renderOutput for deps', () => {
    let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    });

    afterEach(() => {
      stdoutWriteSpy.mockRestore();
    });

    const mockDepsData = {
      modules: [
        {
          path: '/repo/src/cli/index.ts',
          relativePath: 'src/cli/index.ts',
          dependencies: ['src/server/index.ts'],
          dependents: ['src/app.ts'],
        },
      ],
    };

    it('JSON mode writes valid JSON', () => {
      const humanRenderer = () => 'human output';
      renderOutput(mockDepsData, humanRenderer, 'json');

      const written = stdoutWriteSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(written.trim());
      expect(parsed.modules).toHaveLength(1);
      expect(parsed.modules[0].relativePath).toBe('src/cli/index.ts');
    });

    it('JSON mode is jq-friendly', () => {
      const humanRenderer = () => 'human output';
      renderOutput(mockDepsData, humanRenderer, 'json');

      const written = stdoutWriteSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(written.trim());
      // jq '.modules[0].dependencies' should work
      expect(parsed.modules[0].dependencies).toContain('src/server/index.ts');
    });

    it('human mode writes human renderer output', () => {
      const humanRenderer = (_data: typeof mockDepsData) => 'Project Dependency Analysis\n...';
      renderOutput(mockDepsData, humanRenderer, 'human');

      const written = stdoutWriteSpy.mock.calls[0][0] as string;
      expect(written.trim()).toContain('Project Dependency Analysis');
    });
  });

  describe('formatError for deps', () => {
    it('JSON mode returns structured error for missing codemap', () => {
      const error = new Error('Code map not found') as Error & { code: string; remediation: string };
      error.code = 'INDEX_NOT_FOUND';
      error.remediation = 'Run codemap generate first';

      const result = formatError(error, 'json');
      const parsed = JSON.parse(result);
      expect(parsed.type).toBe('error');
      expect(parsed.code).toBe('INDEX_NOT_FOUND');
      expect(parsed.remediation).toBe('Run codemap generate first');
    });

    it('JSON mode includes attempted field from codemap deps', () => {
      const error = new Error('Code map not found');
      const result = formatError(error, 'json', 'codemap deps');
      const parsed = JSON.parse(result);
      expect(parsed.attempted).toBe('codemap deps');
    });

    it('human mode includes Attempted label for codemap deps', () => {
      const error = new Error('Code map not found');
      const result = formatError(error, 'human', 'codemap deps');
      expect(result).toContain('Attempted:');
      expect(result).toContain('codemap deps');
    });
  });
});
