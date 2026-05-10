import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  normalizeClaudeDelegatedStart,
  probeCodexDelegatedStart,
  runCodexReminderHook,
  renderClaudeHookOutput,
  renderCodexHookOutput,
} from '../reminder-hook-runner.js';
import { FileReminderLedger } from '../reminder-ledger.js';

describe('reminder-hook-runner', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  function createLedger(): FileReminderLedger {
    const root = mkdtempSync(path.join(tmpdir(), 'codemap-runner-ledger-'));
    tempRoots.push(root);
    return new FileReminderLedger(root);
  }

  describe('codex seam probe', () => {
    it('accepts a delegated UserPromptSubmit signal and records prompt-backed role fields', () => {
      const result = probeCodexDelegatedStart({
        hook_event_name: 'UserPromptSubmit',
        session_id: 'session-123',
        prompt: 'Spawn a worker agent to implement the fix and wait for it.',
      });

      expect(result.usable).toBe(true);
      expect(result.hookEventName).toBe('UserPromptSubmit');
      expect(result.parentSessionId).toBe('session-123');
      expect(result.role).toBe('worker');
      expect(result.roleSource).toBe('prompt');
      expect(result.observedSessionFields).toEqual(['session_id']);
      expect(result.observedRoleFields).toEqual(['prompt']);
      expect(result.normalizedEvent).toEqual({
        runtime: 'codex',
        hookEventName: 'UserPromptSubmit',
        parentSessionId: 'session-123',
        role: 'worker',
      });
    });

    it('records a SessionStart seam payload even when it is not yet usable for delegated role routing', () => {
      const result = probeCodexDelegatedStart({
        hook_event_name: 'SessionStart',
        session_id: 'session-123',
        source: 'startup',
      });

      expect(result.usable).toBe(false);
      expect(result.hookEventName).toBe('SessionStart');
      expect(result.parentSessionId).toBe('session-123');
      expect(result.observedSessionFields).toEqual(['session_id']);
      expect(result.observedRoleFields).toEqual([]);
      expect(result.reason).toContain('recognized delegated role');
    });
  });

  it('normalizes Claude SubagentStart payloads into the shared delegated-start shape', () => {
    const normalized = normalizeClaudeDelegatedStart({
      hook_event_name: 'SubagentStart',
      session_id: 'parent-claude-session',
      agent_id: 'agent-1',
      agent_type: 'Explore',
    });

    expect(normalized).toEqual({
      runtime: 'claude',
      hookEventName: 'SubagentStart',
      parentSessionId: 'parent-claude-session',
      role: 'explore',
    });
  });

  it('renders Claude reminder output with hook-specific context for SubagentStart', () => {
    const output = renderClaudeHookOutput({
      kind: 'remind',
      message: 'Run `mycodemap env-contract --for explore --json` before delegated work.',
    });

    expect(JSON.parse(output)).toEqual({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'SubagentStart',
        additionalContext: 'Run `mycodemap env-contract --for explore --json` before delegated work.',
      },
    });
  });

  it('keeps warning transport visible and non-blocking for Claude and Codex failure paths', () => {
    const warning = 'env-contract retrieval unavailable. Run `mycodemap env-contract --check`.';
    const claudeOutput = JSON.parse(renderClaudeHookOutput({ kind: 'warn', message: warning }));
    const codexOutput = JSON.parse(renderCodexHookOutput('UserPromptSubmit', { kind: 'warn', message: warning }));

    expect(claudeOutput.continue).toBe(true);
    expect(claudeOutput.systemMessage).toBe(warning);
    expect(claudeOutput.hookSpecificOutput.additionalContext).toBe(warning);

    expect(codexOutput.continue).toBe(true);
    expect(codexOutput.systemMessage).toBe(warning);
    expect(codexOutput.hookSpecificOutput).toEqual({
      hookEventName: 'UserPromptSubmit',
      additionalContext: warning,
    });
  });

  it('wires the Codex adapter through first-remind-then-silent behavior', async () => {
    const ledger = createLedger();
    const input = {
      hook_event_name: 'UserPromptSubmit',
      session_id: 'session-123',
      prompt: 'Spawn a worker agent to implement the fix and wait for it.',
    };

    const first = JSON.parse(await runCodexReminderHook(input, {
      ledger,
      checkRetrieval: () => ({ available: true }),
    }));
    const second = await runCodexReminderHook(input, {
      ledger,
      checkRetrieval: () => ({ available: true }),
    });

    expect(first.continue).toBe(true);
    expect(first.hookSpecificOutput.additionalContext).toContain('mycodemap env-contract --for worker --json');
    expect(second).toBe('');
  });

  it('returns a visible non-blocking warning when the Codex payload cannot be normalized', async () => {
    const output = JSON.parse(await runCodexReminderHook({
      hook_event_name: 'SessionStart',
      session_id: 'session-123',
    }));

    expect(output.continue).toBe(true);
    expect(output.systemMessage).toContain('could not normalize');
    expect(output.hookSpecificOutput.hookEventName).toBe('SessionStart');
  });
});
