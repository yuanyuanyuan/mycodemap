// [META] since:2026-05-10 | owner:cli-team | stable:false
// [WHY] Centralizes first-remind-then-silent decisions and visible retrieval failure messaging.

import type { AgentType } from './types.js';
import type { ReminderLedger } from './reminder-ledger.js';
import type { NormalizedReminderEvent } from './reminder-hook-runner.js';

export interface ReminderRetrievalTarget {
  cliCommand: string;
  mcpToolCall: string;
  checkCommand: string;
}

export interface ReminderRetrievalStatus {
  available: boolean;
  detail?: string;
}

export type ReminderDecision =
  | { kind: 'silent'; reason: 'already-reminded' }
  | { kind: 'remind'; message: string; target: ReminderRetrievalTarget }
  | { kind: 'warn'; message: string; target: ReminderRetrievalTarget; continue: true };

export interface ReminderDecisionDependencies {
  ledger: ReminderLedger;
  checkRetrieval: (role: AgentType) => Promise<ReminderRetrievalStatus> | ReminderRetrievalStatus;
}

export function buildReminderRetrievalTarget(role: AgentType): ReminderRetrievalTarget {
  return {
    cliCommand: `mycodemap env-contract --for ${role} --json`,
    mcpToolCall: `codemap_env_contract(agentType="${role}")`,
    checkCommand: 'mycodemap env-contract --check',
  };
}

export function buildReminderMessage(role: AgentType, target: ReminderRetrievalTarget): string {
  return [
    `Before starting delegated ${role} work, retrieve the project environment contract.`,
    `CLI: ${target.cliCommand}`,
    `MCP: ${target.mcpToolCall}`,
  ].join('\n');
}

export function buildReminderWarning(
  role: AgentType,
  target: ReminderRetrievalTarget,
  detail?: string,
): string {
  const lines = [
    `env-contract retrieval is currently unavailable for delegated ${role} work.`,
    `Check: ${target.checkCommand}`,
    `Retry: ${target.cliCommand}`,
    `Fallback MCP: ${target.mcpToolCall}`,
    'Delegated work may continue, but the reminder was not silently replaced.',
  ];
  if (detail) {
    lines.push(`Failure: ${detail}`);
  }
  return lines.join('\n');
}

export async function decideReminder(
  event: NormalizedReminderEvent,
  dependencies: ReminderDecisionDependencies,
): Promise<ReminderDecision> {
  const firstSeen = dependencies.ledger.markFirstSeen(event.parentSessionId, event.role);
  if (!firstSeen) {
    return { kind: 'silent', reason: 'already-reminded' };
  }

  const target = buildReminderRetrievalTarget(event.role);
  const retrievalStatus = await dependencies.checkRetrieval(event.role);
  if (!retrievalStatus.available) {
    return {
      kind: 'warn',
      continue: true,
      target,
      message: buildReminderWarning(event.role, target, retrievalStatus.detail),
    };
  }

  return {
    kind: 'remind',
    target,
    message: buildReminderMessage(event.role, target),
  };
}
