// [META] since:2026-05-02 | owner:cli-team | stable:false
// [WHY] Agent-type filtering for Project Environment Contract items by category.

import type {
  AgentType,
  ContractCategory,
  ContractItem,
  ProjectEnvironmentContract,
} from './types.js';

export const DEFAULT_AGENT_FILTERS: Record<AgentType, readonly ContractCategory[]> = {
  explore: ['retrieval', 'validation'],
  plan: ['retrieval', 'validation'],
  edit: ['execution', 'commit', 'style', 'validation'],
  worker: ['execution', 'commit', 'style', 'validation'],
  review: ['retrieval', 'validation', 'style'],
  verify: ['execution', 'validation'],
  default: ['execution', 'commit', 'retrieval', 'validation', 'style'],
} as const;

/**
 * Filter contract items by agent type and optional category override.
 *
 * If `agentType` is unknown, falls back to 'default'.
 * If `categoryOverride` is provided, it overrides the agent's default category set.
 */
export function filterContractForAgent(
  contract: ProjectEnvironmentContract,
  agentType: string,
  categoryOverride?: ContractCategory[],
): ContractItem[] {
  const effectiveType: AgentType =
    agentType in DEFAULT_AGENT_FILTERS ? (agentType as AgentType) : 'default';

  const allowedCategories = categoryOverride ?? DEFAULT_AGENT_FILTERS[effectiveType];

  return contract.items.filter((item) =>
    (allowedCategories as readonly string[]).includes(item.category),
  );
}
