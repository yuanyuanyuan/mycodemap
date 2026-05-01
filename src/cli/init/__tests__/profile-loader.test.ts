import { describe, expect, it } from 'vitest';
import path from 'node:path';

import { loadProfile, resolveProfilePath } from '../profile-loader.js';

describe('loadProfile', () => {
  it('loads and validates nodejs profile', () => {
    const profile = loadProfile('nodejs');

    expect(Array.isArray(profile.parser.include)).toBe(true);
    expect(profile.parser.include.length).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(profile.parser.extensions)).toBe(true);
    expect(profile.parser.extensions.length).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(profile.ignore)).toBe(true);
    expect(profile.analysis_depth).toBe('standard');
    expect(profile.parser.extensions).toContain('ts');
  });

  it('loads and validates python profile', () => {
    const profile = loadProfile('python');

    expect(profile.parser.include.length).toBeGreaterThanOrEqual(1);
    expect(profile.parser.extensions).toContain('py');
    expect(Array.isArray(profile.ignore)).toBe(true);
    expect(profile.analysis_depth).toBe('standard');
  });

  it('loads and validates go profile', () => {
    const profile = loadProfile('go');

    expect(profile.parser.include.length).toBeGreaterThanOrEqual(1);
    expect(profile.parser.extensions).toContain('go');
    expect(Array.isArray(profile.ignore)).toBe(true);
    expect(profile.analysis_depth).toBe('standard');
  });

  it('loads and validates rust profile', () => {
    const profile = loadProfile('rust');

    expect(profile.parser.include.length).toBeGreaterThanOrEqual(1);
    expect(profile.parser.extensions).toContain('rs');
    expect(Array.isArray(profile.ignore)).toBe(true);
    expect(profile.analysis_depth).toBe('standard');
  });

  it('loads and validates generic profile', () => {
    const profile = loadProfile('generic');

    expect(profile.parser.include.length).toBeGreaterThanOrEqual(1);
    expect(profile.parser.extensions.length).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(profile.ignore)).toBe(true);
    expect(profile.analysis_depth).toBe('shallow');
  });

  it('rejects unknown profile names', () => {
    expect(() => loadProfile('unknown')).toThrow(/未知 profile/);
  });

  it('rejects path traversal in profile name', () => {
    // Allow-list rejects this first with "未知 profile" since the
    // traversal string is not in ALLOWED_PROFILE_NAMES.
    expect(() => loadProfile('../etc/passwd')).toThrow(/未知 profile/);
  });

  it('rejects profile names with path separators', () => {
    expect(() => loadProfile('foo/bar')).toThrow(/未知 profile/);
  });
});

describe('resolveProfilePath', () => {
  it('returns correct path for nodejs', () => {
    const p = resolveProfilePath('nodejs');

    expect(p.endsWith(`${path.sep}nodejs.json`)).toBe(true);
    expect(p.includes(`${path.sep}profiles${path.sep}`)).toBe(true);
  });

  it('returns correct path for generic', () => {
    const p = resolveProfilePath('generic');

    expect(p.endsWith(`${path.sep}generic.json`)).toBe(true);
    expect(p.includes(`${path.sep}profiles${path.sep}`)).toBe(true);
  });
});
