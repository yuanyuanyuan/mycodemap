import { describe, expect, it } from 'vitest';
import {
  CONTRACT_CATEGORIES,
  CONTRACT_SEVERITIES,
  validateContractItem,
  validateProjectEnvironmentContract,
} from '../index.js';
import type { ContractItem, ProjectEnvironmentContract } from '../index.js';

function validItem(overrides: Partial<ContractItem> = {}): ContractItem {
  return {
    id: 'shell-rtk-wrapper',
    category: 'execution',
    severity: 'critical',
    content: 'Shell commands must be wrapped with rtk.',
    sources: [
      {
        file: 'AGENTS.md',
        hash: 'sha256:test',
        authority: 'governance',
      },
    ],
    ...overrides,
  };
}

function validContract(
  overrides: Partial<ProjectEnvironmentContract> = {},
): ProjectEnvironmentContract {
  return {
    schemaVersion: 'env-contract.v1',
    generatedAt: '2026-05-02T00:00:00.000Z',
    projectProfile: {
      name: 'nodejs',
      source: 'package.json',
      confidence: 'high',
    },
    items: [validItem()],
    conflicts: [],
    sourceSnapshots: [
      {
        file: 'AGENTS.md',
        hash: 'sha256:test',
        lastModified: '2026-05-02T00:00:00.000Z',
      },
    ],
    ...overrides,
  };
}

describe('validateContractItem', () => {
  it('accepts all canonical categories and severities from the injected validator coverage', () => {
    const items = CONTRACT_CATEGORIES.flatMap((category) =>
      CONTRACT_SEVERITIES.map((severity) => validItem({ category, severity })),
    );

    for (const [index, item] of items.entries()) {
      const result = validateContractItem(item, index);
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    }
  });

  it('rejects invalid category', () => {
    const result = validateContractItem({
      ...validItem(),
      category: 'security',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('invalid category');
  });

  it('rejects invalid severity', () => {
    const result = validateContractItem({
      ...validItem(),
      severity: 'urgent',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('invalid severity');
  });

  it('rejects empty content', () => {
    const result = validateContractItem(validItem({ content: '   ' }));

    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('content must not be empty');
  });

  it('rejects missing source', () => {
    const result = validateContractItem(validItem({ sources: [] }));

    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('sources must include at least one source');
  });

  it('rejects source without file, hash, or valid authority', () => {
    const result = validateContractItem({
      ...validItem(),
      sources: [{ file: '', hash: '', authority: 'notes' }],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('file is required');
    expect(result.errors.join('\n')).toContain('hash is required');
    expect(result.errors.join('\n')).toContain('invalid authority');
  });
});

describe('validateProjectEnvironmentContract', () => {
  it('accepts a valid env-contract.v1 contract', () => {
    const result = validateProjectEnvironmentContract(validContract());

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects wrong schemaVersion', () => {
    const result = validateProjectEnvironmentContract({
      ...validContract(),
      schemaVersion: 'env-contract.seed.v1',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('schemaVersion must be "env-contract.v1"');
  });
});
