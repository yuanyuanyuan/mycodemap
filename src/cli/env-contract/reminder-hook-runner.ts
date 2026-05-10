// [META] since:2026-05-10 | owner:cli-team | stable:false
// [WHY] Normalizes Claude/Codex delegated-start hook payloads and renders non-blocking reminder output.

import type { AgentType } from './types.js';

const KNOWN_ROLES: readonly AgentType[] = [
  'explore',
  'plan',
  'edit',
  'worker',
  'review',
  'verify',
  'default',
];

const CODEX_SEAM_EVENTS = ['SessionStart', 'UserPromptSubmit'] as const;

type CodexSeamEventName = (typeof CODEX_SEAM_EVENTS)[number];

export interface NormalizedReminderEvent {
  runtime: 'claude' | 'codex';
  hookEventName: 'SubagentStart' | CodexSeamEventName;
  parentSessionId: string;
  role: AgentType;
}

export interface CodexSeamProbeResult {
  hookEventName: CodexSeamEventName | null;
  usable: boolean;
  observedSessionFields: string[];
  observedRoleFields: string[];
  parentSessionId?: string;
  role?: AgentType;
  roleSource?: string;
  reason?: string;
  normalizedEvent?: NormalizedReminderEvent;
}

export type ReminderAction =
  | { kind: 'silent' }
  | { kind: 'remind'; message: string }
  | { kind: 'warn'; message: string };

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function getString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeRole(candidate?: string): AgentType | undefined {
  if (!candidate) return undefined;
  const normalized = candidate.trim().toLowerCase();
  if (KNOWN_ROLES.includes(normalized as AgentType)) {
    return normalized as AgentType;
  }
  if (normalized === 'general-purpose') {
    return 'default';
  }
  return undefined;
}

function extractRoleFromPrompt(prompt?: string): AgentType | undefined {
  if (!prompt) return undefined;
  const lowerPrompt = prompt.toLowerCase();
  for (const role of KNOWN_ROLES) {
    const patterns = [
      new RegExp(`\\b${role}\\b`),
      new RegExp(`\\b${role}[ -]agent\\b`),
      new RegExp(`\\bagent[ -]${role}\\b`),
    ];
    if (patterns.some((pattern) => pattern.test(lowerPrompt))) {
      return role;
    }
  }
  return undefined;
}

function collectPresentFields(record: Record<string, unknown>, keys: readonly string[]): string[] {
  return keys.filter((key) => getString(record, key) !== undefined);
}

function resolveCodexRole(record: Record<string, unknown>): { role?: AgentType; source?: string } {
  const directRoleFields = ['agent_type', 'role', 'subagent_type', 'agent_role', 'agent'];
  for (const key of directRoleFields) {
    const role = normalizeRole(getString(record, key));
    if (role) {
      return { role, source: key };
    }
  }

  const promptRole = extractRoleFromPrompt(getString(record, 'prompt'));
  if (promptRole) {
    return { role: promptRole, source: 'prompt' };
  }

  return {};
}

export function probeCodexDelegatedStart(input: unknown): CodexSeamProbeResult {
  const record = asRecord(input);
  if (!record) {
    return {
      hookEventName: null,
      usable: false,
      observedSessionFields: [],
      observedRoleFields: [],
      reason: 'Hook payload is not an object.',
    };
  }

  const hookEventName = getString(record, 'hook_event_name');
  if (!hookEventName || !CODEX_SEAM_EVENTS.includes(hookEventName as CodexSeamEventName)) {
    return {
      hookEventName: null,
      usable: false,
      observedSessionFields: collectPresentFields(record, ['session_id', 'parent_session_id', 'thread_id']),
      observedRoleFields: collectPresentFields(record, ['agent_type', 'role', 'subagent_type', 'agent_role', 'agent', 'prompt']),
      reason: 'Payload is not one of the accepted Codex delegated-start seam events.',
    };
  }

  const observedSessionFields = collectPresentFields(record, ['session_id', 'parent_session_id', 'thread_id']);
  const observedRoleFields = collectPresentFields(record, ['agent_type', 'role', 'subagent_type', 'agent_role', 'agent', 'prompt']);
  const parentSessionId =
    getString(record, 'parent_session_id') ??
    getString(record, 'session_id') ??
    getString(record, 'thread_id');
  const { role, source } = resolveCodexRole(record);

  if (!parentSessionId || !role) {
    return {
      hookEventName: hookEventName as CodexSeamEventName,
      usable: false,
      observedSessionFields,
      observedRoleFields,
      parentSessionId,
      role,
      roleSource: source,
      reason: 'Payload did not expose both a parent session id and a recognized delegated role.',
    };
  }

  return {
    hookEventName: hookEventName as CodexSeamEventName,
    usable: true,
    observedSessionFields,
    observedRoleFields,
    parentSessionId,
    role,
    roleSource: source,
    normalizedEvent: {
      runtime: 'codex',
      hookEventName: hookEventName as CodexSeamEventName,
      parentSessionId,
      role,
    },
  };
}

export function normalizeClaudeDelegatedStart(input: unknown): NormalizedReminderEvent | undefined {
  const record = asRecord(input);
  if (!record || getString(record, 'hook_event_name') !== 'SubagentStart') {
    return undefined;
  }

  const parentSessionId = getString(record, 'session_id');
  const role = normalizeRole(getString(record, 'agent_type'));
  if (!parentSessionId || !role) {
    return undefined;
  }

  return {
    runtime: 'claude',
    hookEventName: 'SubagentStart',
    parentSessionId,
    role,
  };
}

function buildHookSpecificOutput(
  hookEventName: string,
  additionalContext: string,
): { hookEventName: string; additionalContext: string } {
  return {
    hookEventName,
    additionalContext,
  };
}

export function renderClaudeHookOutput(action: ReminderAction): string {
  if (action.kind === 'silent') {
    return '';
  }

  const payload: Record<string, unknown> = {
    continue: true,
    hookSpecificOutput: buildHookSpecificOutput('SubagentStart', action.message),
  };
  if (action.kind === 'warn') {
    payload.systemMessage = action.message;
  }
  return JSON.stringify(payload, null, 2);
}

export function renderCodexHookOutput(
  hookEventName: CodexSeamEventName,
  action: ReminderAction,
): string {
  if (action.kind === 'silent') {
    return '';
  }

  const payload: Record<string, unknown> = {
    continue: true,
    hookSpecificOutput: buildHookSpecificOutput(hookEventName, action.message),
  };
  if (action.kind === 'warn') {
    payload.systemMessage = action.message;
  }
  return JSON.stringify(payload, null, 2);
}
