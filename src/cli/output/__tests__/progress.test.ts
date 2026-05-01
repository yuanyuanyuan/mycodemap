// [META] since:2026-04-30 | owner:cli-team | stable:false
// [WHY] Tests for createProgressEmitter — verifies NDJSON on stderr in json mode, ora in human mode

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createProgressEmitter } from '../progress.js';
import type { ProgressEmitter } from '../types.js';

describe('createProgressEmitter', () => {
  describe('json mode', () => {
    let stderrWriteSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      stderrWriteSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    });

    afterEach(() => {
      stderrWriteSpy.mockRestore();
    });

    it('writes NDJSON to stderr on update', () => {
      const emitter = createProgressEmitter('json');
      emitter.update(50, 'halfway');

      expect(stderrWriteSpy).toHaveBeenCalled();
      const lastCall = stderrWriteSpy.mock.calls.at(-1);
      const written = lastCall?.[0] as string;
      const parsed = JSON.parse(written.trim());
      expect(parsed).toEqual({ type: 'progress', percent: 50, message: 'halfway' });
    });

    it('writes final progress 100% on complete', () => {
      const emitter = createProgressEmitter('json');
      emitter.complete();

      expect(stderrWriteSpy).toHaveBeenCalled();
      const lastCall = stderrWriteSpy.mock.calls.at(-1);
      const written = lastCall?.[0] as string;
      const parsed = JSON.parse(written.trim());
      expect(parsed).toEqual({ type: 'progress', percent: 100, message: 'complete' });
    });

    it('writes failure message on fail', () => {
      const emitter = createProgressEmitter('json');
      emitter.fail('something went wrong');

      expect(stderrWriteSpy).toHaveBeenCalled();
      const lastCall = stderrWriteSpy.mock.calls.at(-1);
      const written = lastCall?.[0] as string;
      const parsed = JSON.parse(written.trim());
      expect(parsed).toEqual({ type: 'progress', percent: -1, message: 'something went wrong' });
    });

    it('rate-limits updates: only emits when percent changes by >= 5', () => {
      const emitter = createProgressEmitter('json');
      stderrWriteSpy.mockClear();

      emitter.update(10, 'ten percent');
      emitter.update(12, 'twelve percent'); // <5 change, should be suppressed
      emitter.update(15, 'fifteen percent'); // >=5 change, should emit

      expect(stderrWriteSpy).toHaveBeenCalledTimes(2);

      // First call: percent=10
      const firstCall = stderrWriteSpy.mock.calls[0];
      const firstParsed = JSON.parse((firstCall?.[0] as string).trim());
      expect(firstParsed.percent).toBe(10);

      // Second call: percent=15 (12 was suppressed)
      const secondCall = stderrWriteSpy.mock.calls[1];
      const secondParsed = JSON.parse((secondCall?.[0] as string).trim());
      expect(secondParsed.percent).toBe(15);
    });

    it('fail with no message defaults to "failed"', () => {
      const emitter = createProgressEmitter('json');
      emitter.fail();

      const lastCall = stderrWriteSpy.mock.calls.at(-1);
      const written = lastCall?.[0] as string;
      const parsed = JSON.parse(written.trim());
      expect(parsed.message).toBe('failed');
    });
  });

  describe('human mode', () => {
    it('does not write to stderr on update (ora handles it internally)', () => {
      const stderrWriteSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      const emitter = createProgressEmitter('human', 'Processing...');

      // update should not write raw text to stderr
      emitter.update(50, 'halfway');

      // ora may write ANSI codes but not our NDJSON
      const ndjsonCalls = stderrWriteSpy.mock.calls.filter(call => {
        const text = call[0] as string;
        return text.includes('"type":"progress"');
      });
      expect(ndjsonCalls).toHaveLength(0);

      stderrWriteSpy.mockRestore();
    });

    it('returns a ProgressEmitter with update/complete/fail methods', () => {
      const emitter: ProgressEmitter = createProgressEmitter('human');
      expect(typeof emitter.update).toBe('function');
      expect(typeof emitter.complete).toBe('function');
      expect(typeof emitter.fail).toBe('function');
    });
  });
});
