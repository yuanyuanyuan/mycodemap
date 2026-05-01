// [META] since:2026-04-30 | owner:cli-team | stable:false
// [WHY] Tests for renderOutput — verifies JSON to stdout in json mode, renderer output in human mode

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderOutput } from '../render.js';

describe('renderOutput', () => {
  let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutWriteSpy.mockRestore();
  });

  describe('json mode', () => {
    it('writes JSON.stringify(data) to stdout', () => {
      const data = { intent: 'find', results: [{ name: 'foo' }] };
      renderOutput(data, () => 'human', 'json');

      expect(stdoutWriteSpy).toHaveBeenCalledOnce();
      const written = stdoutWriteSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(written.trim());
      expect(parsed).toEqual(data);
    });

    it('writes a trailing newline', () => {
      renderOutput({ key: 'value' }, () => 'human', 'json');

      const written = stdoutWriteSpy.mock.calls[0][0] as string;
      expect(written.endsWith('\n')).toBe(true);
    });
  });

  describe('human mode', () => {
    it('writes humanRenderer output to stdout', () => {
      const data = { intent: 'find', results: [{ name: 'foo' }] };
      const humanRenderer = (d: typeof data) => `Intent: ${d.intent}, Found: ${d.results.length}`;
      renderOutput(data, humanRenderer, 'human');

      expect(stdoutWriteSpy).toHaveBeenCalledOnce();
      const written = stdoutWriteSpy.mock.calls[0][0] as string;
      expect(written.trim()).toBe('Intent: find, Found: 1');
    });

    it('writes a trailing newline', () => {
      renderOutput({ key: 'value' }, () => 'output', 'human');

      const written = stdoutWriteSpy.mock.calls[0][0] as string;
      expect(written.endsWith('\n')).toBe(true);
    });
  });
});
