// [META] since:2026-05-10 | owner:cli-team | stable:false
// [WHY] Provides session-role reminder silence markers without leaking across sessions or runtimes.

import { closeSync, existsSync, mkdirSync, openSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AgentType } from './types.js';

const DEFAULT_LEDGER_ROOT = path.join(os.tmpdir(), 'codemap-env-contract-reminders');

export interface ReminderLedger {
  markFirstSeen(parentSessionId: string, role: AgentType): boolean;
}

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function buildReminderLedgerKey(parentSessionId: string, role: AgentType): string {
  return `${sanitizeSegment(parentSessionId)}__${sanitizeSegment(role)}`;
}

export class FileReminderLedger implements ReminderLedger {
  constructor(private readonly rootDir: string = DEFAULT_LEDGER_ROOT) {}

  markFirstSeen(parentSessionId: string, role: AgentType): boolean {
    if (!existsSync(this.rootDir)) {
      mkdirSync(this.rootDir, { recursive: true });
    }

    const markerPath = path.join(this.rootDir, `${buildReminderLedgerKey(parentSessionId, role)}.marker`);
    try {
      const fd = openSync(markerPath, 'wx');
      closeSync(fd);
      return true;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'EEXIST') {
        return false;
      }
      throw error;
    }
  }
}
