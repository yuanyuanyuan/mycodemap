// [META] since:2026-05-02 | owner:cli-team | stable:false
// [WHY] Tests for filterContractForAgent — verifies agent-type category filtering and fallback.

import { describe, expect, it } from 'vitest';
import { filterContractForAgent, DEFAULT_AGENT_FILTERS } from '../filters.js';
import type { ContractItem, ProjectEnvironmentContract } from '../types.js';

function makeItem(category: ContractItem['category'], id = `item-${category}`): ContractItem {
  return {
    id,
    category,
    severity: 'high',
    content: `Test item for ${category}`,
    sources: [{ file: 'test.md', hash: 'sha256:test', authority: 'governance' }],
  };
}

function makeContract(items: ContractItem[]): ProjectEnvironmentContract {
  return {
    schemaVersion: 'env-contract.v1',
    generatedAt: '2026-05-02T00:00:00.000Z',
    projectProfile: { name: 'test', source: 'test', confidence: 'high' },
    items,
    conflicts: [],
    sourceSnapshots: [],
  };
}

describe('filterContractForAgent', () => {
  const allCategories: ContractItem['category'][] = [
    'execution',
    'commit',
    'retrieval',
    'validation',
    'style',
  ];
  const contract = makeContract(allCategories.map(makeItem));

  it('explore returns only retrieval and validation', () => {
    const filtered = filterContractForAgent(contract, 'explore');
    const categories = filtered.map((item) => item.category);
    expect(categories).toEqual(['retrieval', 'validation']);
  });

  it('plan returns only retrieval and validation', () => {
    const filtered = filterContractForAgent(contract, 'plan');
    const categories = filtered.map((item) => item.category);
    expect(categories).toEqual(['retrieval', 'validation']);
  });

  it('edit returns execution, commit, style, and validation', () => {
    const filtered = filterContractForAgent(contract, 'edit');
    const categories = filtered.map((item) => item.category);
    expect(categories).toEqual(['execution', 'commit', 'validation', 'style']);
  });

  it('worker returns execution, commit, style, and validation', () => {
    const filtered = filterContractForAgent(contract, 'worker');
    const categories = filtered.map((item) => item.category);
    expect(categories).toEqual(['execution', 'commit', 'validation', 'style']);
  });

  it('review returns retrieval, validation, and style', () => {
    const filtered = filterContractForAgent(contract, 'review');
    const categories = filtered.map((item) => item.category);
    expect(categories).toEqual(['retrieval', 'validation', 'style']);
  });

  it('verify returns execution and validation', () => {
    const filtered = filterContractForAgent(contract, 'verify');
    const categories = filtered.map((item) => item.category);
    expect(categories).toEqual(['execution', 'validation']);
  });

  it('default returns all categories', () => {
    const filtered = filterContractForAgent(contract, 'default');
    const categories = filtered.map((item) => item.category);
    expect(categories).toEqual(allCategories);
  });

  it('unknown agent type falls back to default', () => {
    const filtered = filterContractForAgent(contract, 'unknown-agent');
    const defaultFiltered = filterContractForAgent(contract, 'default');
    expect(filtered).toEqual(defaultFiltered);
  });

  it('categoryOverride overrides agent default', () => {
    const filtered = filterContractForAgent(contract, 'explore', ['execution']);
    const categories = filtered.map((item) => item.category);
    expect(categories).toEqual(['execution']);
  });

  it('DEFAULT_AGENT_FILTERS has entries for all 7 agent types', () => {
    const expectedTypes = [
      'explore',
      'plan',
      'edit',
      'worker',
      'review',
      'verify',
      'default',
    ];
    for (const agentType of expectedTypes) {
      expect(DEFAULT_AGENT_FILTERS).toHaveProperty(agentType);
    }
  });
});
