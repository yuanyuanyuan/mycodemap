import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { decideReminder } from '../reminder-engine.js';
import { FileReminderLedger } from '../reminder-ledger.js';

describe('reminder-engine', () => {
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
    const root = mkdtempSync(path.join(tmpdir(), 'codemap-reminder-ledger-'));
    tempRoots.push(root);
    return new FileReminderLedger(root);
  }

  it('first role start reminds toward env-contract retrieval', async () => {
    const decision = await decideReminder(
      {
        runtime: 'claude',
        hookEventName: 'SubagentStart',
        parentSessionId: 'parent-1',
        role: 'worker',
      },
      {
        ledger: createLedger(),
        checkRetrieval: () => ({ available: true }),
      },
    );

    expect(decision.kind).toBe('remind');
    if (decision.kind !== 'remind') {
      throw new Error('expected remind decision');
    }
    expect(decision.message).toContain('mycodemap env-contract --for worker --json');
    expect(decision.message).toContain('codemap_env_contract(agentType="worker")');
  });

  it('same session role stays silent after the first reminder', async () => {
    const ledger = createLedger();
    const event = {
      runtime: 'claude' as const,
      hookEventName: 'SubagentStart' as const,
      parentSessionId: 'parent-1',
      role: 'worker' as const,
    };

    await decideReminder(event, {
      ledger,
      checkRetrieval: () => ({ available: true }),
    });
    const second = await decideReminder(event, {
      ledger,
      checkRetrieval: () => ({ available: true }),
    });

    expect(second).toEqual({
      kind: 'silent',
      reason: 'already-reminded',
    });
  });

  it('different role still reminds once inside the same parent session', async () => {
    const ledger = createLedger();

    await decideReminder(
      {
        runtime: 'claude',
        hookEventName: 'SubagentStart',
        parentSessionId: 'parent-1',
        role: 'worker',
      },
      {
        ledger,
        checkRetrieval: () => ({ available: true }),
      },
    );

    const otherRole = await decideReminder(
      {
        runtime: 'claude',
        hookEventName: 'SubagentStart',
        parentSessionId: 'parent-1',
        role: 'verify',
      },
      {
        ledger,
        checkRetrieval: () => ({ available: true }),
      },
    );

    expect(otherRole.kind).toBe('remind');
    if (otherRole.kind !== 'remind') {
      throw new Error('expected remind decision');
    }
    expect(otherRole.message).toContain('mycodemap env-contract --for verify --json');
  });

  it('warning continues when retrieval is unavailable', async () => {
    const decision = await decideReminder(
      {
        runtime: 'codex',
        hookEventName: 'UserPromptSubmit',
        parentSessionId: 'parent-1',
        role: 'worker',
      },
      {
        ledger: createLedger(),
        checkRetrieval: () => ({ available: false, detail: 'command not found' }),
      },
    );

    expect(decision.kind).toBe('warn');
    if (decision.kind !== 'warn') {
      throw new Error('expected warn decision');
    }
    expect(decision.continue).toBe(true);
    expect(decision.message).toContain('mycodemap env-contract --check');
    expect(decision.message).toContain('mycodemap env-contract --for worker --json');
    expect(decision.message).toContain('codemap_env_contract(agentType="worker")');
    expect(decision.message).toContain('command not found');
  });
});
