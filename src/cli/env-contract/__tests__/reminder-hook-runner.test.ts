import { describe, expect, it } from 'vitest';
import {
  normalizeClaudeDelegatedStart,
  probeCodexDelegatedStart,
  renderClaudeHookOutput,
  renderCodexHookOutput,
} from '../reminder-hook-runner.js';

describe('reminder-hook-runner', () => {
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
});
