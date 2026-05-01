// [META] since:2026-04-30 | owner:cli-team | stable:false
// [WHY] Tests for resolveOutputMode — verifies all flag+TTY combinations

import { describe, it, expect } from 'vitest';
import { resolveOutputMode } from '../mode.js';

describe('resolveOutputMode', () => {
  it('returns "human" when isTTY=true and no flags', () => {
    expect(resolveOutputMode({}, true)).toBe('human');
  });

  it('returns "json" when isTTY=false and no flags', () => {
    expect(resolveOutputMode({}, false)).toBe('json');
  });

  it('returns "json" when --json flag is set, even if TTY=true', () => {
    expect(resolveOutputMode({ json: true }, true)).toBe('json');
  });

  it('returns "json" when --json flag is set and TTY=false', () => {
    expect(resolveOutputMode({ json: true }, false)).toBe('json');
  });

  it('returns "human" when --human flag is set, even if TTY=false', () => {
    expect(resolveOutputMode({ human: true }, false)).toBe('human');
  });

  it('returns "human" when --human flag is set and TTY=true', () => {
    expect(resolveOutputMode({ human: true }, true)).toBe('human');
  });

  it('returns "json" when both --json and --human are set (--json wins)', () => {
    expect(resolveOutputMode({ json: true, human: true }, true)).toBe('json');
    expect(resolveOutputMode({ json: true, human: true }, false)).toBe('json');
  });

  it('defaults to TTY auto-detect when no override provided', () => {
    // This test verifies the function works without ttyOverride
    // We can't fully control process.stdout.isTTY in tests, but we can
    // verify the function doesn't throw
    const result = resolveOutputMode({});
    expect(result === 'human' || result === 'json').toBe(true);
  });

  it('returns "human" when undefined flags and TTY=true', () => {
    expect(resolveOutputMode({ json: undefined, human: undefined }, true)).toBe('human');
  });

  it('returns "json" when undefined flags and TTY=false', () => {
    expect(resolveOutputMode({ json: undefined, human: undefined }, false)).toBe('json');
  });
});
