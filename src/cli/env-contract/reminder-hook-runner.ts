// [META] since:2026-05-10 | owner:cli-team | stable:false
// [WHY] Normalizes Claude/Codex delegated-start hook payloads and renders non-blocking reminder output.

import { execFile } from 'node:child_process';
import { stdin } from 'node:process';
import { promisify } from 'node:util';
import type { AgentType } from './types.js';
import { decideReminder, type ReminderRetrievalStatus } from './reminder-engine.js';
import { FileReminderLedger, type ReminderLedger } from './reminder-ledger.js';

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
const execFileAsync = promisify(execFile);
const DEFAULT_CODEX_WARNING_EVENT: CodexSeamEventName = 'UserPromptSubmit';

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

export interface ReminderHookDependencies {
  ledger?: ReminderLedger;
  checkRetrieval?: (role: AgentType) => Promise<ReminderRetrievalStatus> | ReminderRetrievalStatus;
}

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

function toReminderAction(action: Awaited<ReturnType<typeof decideReminder>>): ReminderAction {
  if (action.kind === 'silent') {
    return { kind: 'silent' };
  }
  if (action.kind === 'warn') {
    return { kind: 'warn', message: action.message };
  }
  return { kind: 'remind', message: action.message };
}

export function buildReminderHookCommand(runtime: 'claude' | 'codex'): string {
  return `mycodemap env-contract --run-reminder-hook ${runtime}`;
}

async function defaultCheckRetrieval(role: AgentType): Promise<ReminderRetrievalStatus> {
  try {
    await execFileAsync(
      'mycodemap',
      ['env-contract', '--for', role, '--json'],
      {
        timeout: 15000,
        maxBuffer: 1024 * 1024,
      },
    );
    return { available: true };
  } catch (error) {
    const execError = error as NodeJS.ErrnoException & {
      stdout?: string;
      stderr?: string;
      code?: string | number;
    };
    const detail =
      execError.stderr?.trim() ||
      execError.stdout?.trim() ||
      execError.message ||
      String(execError.code ?? 'unknown error');
    return {
      available: false,
      detail,
    };
  }
}

function resolveDependencies(dependencies?: ReminderHookDependencies): Required<ReminderHookDependencies> {
  return {
    ledger: dependencies?.ledger ?? new FileReminderLedger(),
    checkRetrieval: dependencies?.checkRetrieval ?? defaultCheckRetrieval,
  };
}

function buildPayloadWarning(reason: string): ReminderAction {
  return {
    kind: 'warn',
    message: [
      'Delegated-start reminder hook could not normalize the runtime payload.',
      reason,
      'No hidden fallback guidance was injected; delegated work may continue.',
    ].join('\n'),
  };
}

export async function runClaudeReminderHook(
  input: unknown,
  dependencies?: ReminderHookDependencies,
): Promise<string> {
  const event = normalizeClaudeDelegatedStart(input);
  if (!event) {
    return renderClaudeHookOutput(
      buildPayloadWarning('Expected a Claude SubagentStart payload with session_id and agent_type.'),
    );
  }

  const resolved = resolveDependencies(dependencies);
  const action = await decideReminder(event, {
    ledger: resolved.ledger,
    checkRetrieval: resolved.checkRetrieval,
  });
  return renderClaudeHookOutput(toReminderAction(action));
}

export async function runCodexReminderHook(
  input: unknown,
  dependencies?: ReminderHookDependencies,
): Promise<string> {
  const probe = probeCodexDelegatedStart(input);
  if (!probe.usable || !probe.normalizedEvent) {
    return renderCodexHookOutput(
      probe.hookEventName ?? DEFAULT_CODEX_WARNING_EVENT,
      buildPayloadWarning(probe.reason ?? 'Expected a supported Codex delegated-start payload.'),
    );
  }

  const resolved = resolveDependencies(dependencies);
  const hookEventName = probe.hookEventName ?? DEFAULT_CODEX_WARNING_EVENT;
  const action = await decideReminder(probe.normalizedEvent, {
    ledger: resolved.ledger,
    checkRetrieval: resolved.checkRetrieval,
  });
  return renderCodexHookOutput(hookEventName, toReminderAction(action));
}

async function readStdinText(): Promise<string> {
  if (stdin.readableEnded) {
    return '';
  }

  return new Promise((resolve, reject) => {
    let buffer = '';
    stdin.setEncoding('utf8');
    stdin.on('data', (chunk) => {
      buffer += chunk;
    });
    stdin.on('end', () => resolve(buffer));
    stdin.on('error', reject);
  });
}

export async function runReminderHookFromStdin(
  runtime: 'claude' | 'codex',
  dependencies?: ReminderHookDependencies,
): Promise<string> {
  const rawInput = await readStdinText();
  const payload = rawInput.trim().length > 0 ? JSON.parse(rawInput) : {};
  return runtime === 'claude'
    ? runClaudeReminderHook(payload, dependencies)
    : runCodexReminderHook(payload, dependencies);
}
