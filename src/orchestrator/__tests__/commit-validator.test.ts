import { describe, it, expect } from 'vitest';
import { validateCommitMessage, VALID_TAGS } from '../commit-validator';

describe('commit-validator', () => {
  it('accepts [TAG] scope: message format with uppercase tags', () => {
    const result = validateCommitMessage('[FEATURE] ci: align gateway checks');

    expect(result.valid).toBe(true);
    expect(result.tag).toBe('FEATURE');
    expect(result.commitMessage).toBe('ci: align gateway checks');
  });

  it('rejects lowercase tags', () => {
    const result = validateCommitMessage('[feat] ci: align gateway checks');

    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe('E0007');
  });

  it('rejects missing scope', () => {
    const result = validateCommitMessage('[FEATURE] : align gateway checks');

    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe('E0007');
  });

  it('keeps tag list aligned with CI design', () => {
    expect(VALID_TAGS).toEqual(['BUGFIX', 'FEATURE', 'REFACTOR', 'CONFIG', 'DOCS', 'DELETE']);
  });
});
