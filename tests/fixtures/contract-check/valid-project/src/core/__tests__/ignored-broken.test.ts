// [META] since:2026-04 | owner:test-fixtures | stable:false
// [WHY] Provide fixture source for contract-check rule coverage
import { describe, it, expect } from 'vitest';

describe('ignored broken test fixture', () => {
  it('is intentionally invalid for dependency-cruiser', () => {
    const = ;
    expect(true).toBe(true);
  });
});
