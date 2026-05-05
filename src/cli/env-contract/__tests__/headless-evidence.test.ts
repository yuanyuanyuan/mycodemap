// [META] since:2026-05-05 | owner:cli-team | stable:false
// [WHY] Validates headless-mode subagent evidence JSON schema and verdict semantics.
// Ensures the automated claude -p / codex exec evidence capture produces valid,
// parseable proof of retrieval-before-work.

import { describe, expect, it } from 'vitest';
import { validateProjectEnvironmentContract } from '../index.js';
import type { ProjectEnvironmentContract } from '../index.js';

// --- Verdict semantics per 58-HUMAN-UAT.md ---

const VALID_VERDICTS = ['pass', 'fail', 'waived', 'blocked'] as const;
type SubagentVerdict = (typeof VALID_VERDICTS)[number];

interface RetrievalEvidenceItem {
  command: string;
  exitCode: number;
  schemaVersion: string;
  agentType: string;
  itemsReturned: number;
  itemIds: string[];
  conflictsDetected: number;
  conflictIds: string[];
  sourceSnapshotsCount: number;
  timestamp: string;
}

interface SubagentEvidenceJson {
  platform: 'claude' | 'codex';
  attempted: boolean;
  available: boolean | null;
  commandTranscriptPath: string;
  retrievalEvidence: RetrievalEvidenceItem[];
  verdict: SubagentVerdict;
  blocker: string;
  notes: string[];
}

function isValidVerdict(value: unknown): value is SubagentVerdict {
  return typeof value === 'string' && VALID_VERDICTS.includes(value as SubagentVerdict);
}

function validateSubagentEvidence(data: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { valid: false, errors: ['Evidence must be an object'] };
  }

  const obj = data as Record<string, unknown>;

  if (obj.platform !== 'claude' && obj.platform !== 'codex') {
    errors.push('platform must be "claude" or "codex"');
  }

  if (typeof obj.attempted !== 'boolean') {
    errors.push('attempted must be boolean');
  }

  if (typeof obj.commandTranscriptPath !== 'string' || obj.commandTranscriptPath.trim() === '') {
    errors.push('commandTranscriptPath must be a non-empty string');
  }

  if (!isValidVerdict(obj.verdict)) {
    errors.push(`verdict must be one of: ${VALID_VERDICTS.join(', ')}`);
  }

  if (typeof obj.blocker !== 'string') {
    errors.push('blocker must be a string');
  }

  if (!Array.isArray(obj.retrievalEvidence)) {
    errors.push('retrievalEvidence must be an array');
  } else {
    obj.retrievalEvidence.forEach((item, index) => {
      const prefix = `retrievalEvidence[${index}]`;
      if (typeof item !== 'object' || item === null) {
        errors.push(`${prefix}: must be an object`);
        return;
      }
      const ev = item as Record<string, unknown>;
      if (typeof ev.command !== 'string' || (ev.command as string).trim().length === 0)
        errors.push(`${prefix}: command must be a non-empty string`);
      if (typeof ev.exitCode !== 'number') errors.push(`${prefix}: exitCode must be number`);
      if (typeof ev.schemaVersion !== 'string') errors.push(`${prefix}: schemaVersion must be string`);
      if (typeof ev.agentType !== 'string') errors.push(`${prefix}: agentType must be a non-empty string`);
      if (typeof ev.itemsReturned !== 'number') errors.push(`${prefix}: itemsReturned must be number`);
    });
  }

  // Verdict-specific rules from HUMAN-UAT.md
  if (obj.verdict === 'pass') {
    if (!Array.isArray(obj.retrievalEvidence) || obj.retrievalEvidence.length === 0) {
      errors.push('verdict "pass" requires at least one retrievalEvidence entry');
    }
    if (typeof obj.blocker === 'string' && obj.blocker.trim().length > 0) {
      errors.push('verdict "pass" must not have a blocker');
    }
  }

  if (obj.verdict === 'fail') {
    if (!Array.isArray(obj.retrievalEvidence) || obj.retrievalEvidence.length === 0) {
      errors.push('verdict "fail" requires retrievalEvidence (even if retrieval was missing/late)');
    }
  }

  if (obj.verdict === 'waived') {
    if (typeof obj.blocker !== 'string' || obj.blocker.trim().length === 0) {
      errors.push('verdict "waived" requires an exact blocker string');
    }
  }

  if (obj.verdict === 'blocked') {
    if (typeof obj.blocker !== 'string' || obj.blocker.trim().length === 0) {
      errors.push('verdict "blocked" requires an exact blocker string');
    }
  }

  return { valid: errors.length === 0, errors };
}

function validRetrievalEvidence(
  overrides: Partial<RetrievalEvidenceItem> = {},
): RetrievalEvidenceItem {
  return {
    command: 'mycodemap env-contract --for explore --json',
    exitCode: 0,
    schemaVersion: 'env-contract.v1',
    agentType: 'explore',
    itemsReturned: 2,
    itemIds: ['codemap-query-priority', 'real-scenario-validation'],
    conflictsDetected: 1,
    conflictIds: ['commit-tag-case'],
    sourceSnapshotsCount: 5,
    timestamp: '2026-05-05T09:42:36.284Z',
    ...overrides,
  };
}

function validClaudeEvidence(
  overrides: Partial<SubagentEvidenceJson> = {},
): SubagentEvidenceJson {
  return {
    platform: 'claude',
    attempted: true,
    available: true,
    commandTranscriptPath: 'docs/generated/phase-58/subagent-evidence/claude-session.md',
    retrievalEvidence: [validRetrievalEvidence()],
    verdict: 'pass',
    blocker: '',
    notes: ['Retrieval happened as the first action before any substantive work.'],
    ...overrides,
  };
}

// --- Headless mode command validation ---

interface HeadlessCommandConfig {
  platform: 'claude' | 'codex';
  command: string;
  expectedFlags: string[];
  forbiddenFlags: string[];
}

const CLAUDE_HEADLESS_COMMANDS: HeadlessCommandConfig[] = [
  {
    platform: 'claude',
    command: 'claude -p "Delegate to env-contract-verifier agent" --allowedTools "Agent,Read,Bash,Grep,Glob" --output-format json --max-turns 10',
    expectedFlags: ['-p', '--allowedTools', '--output-format'],
    forbiddenFlags: ['--bare'],
  },
  {
    platform: 'claude',
    command: 'claude -p "Verify Phase 58" --output-format stream-json --allowedTools "Agent,Read,Bash,Grep,Glob" --permission-mode acceptEdits',
    expectedFlags: ['-p', '--output-format', '--allowedTools', '--permission-mode'],
    forbiddenFlags: ['--bare'],
  },
  {
    platform: 'codex',
    command: 'codex exec --sandbox workspace-write --ask-for-approval never --json --model gpt-5.4-mini "Use the env-contract-verifier agent to verify Phase 58"',
    expectedFlags: ['exec', '--sandbox', '--ask-for-approval', '--json', '--model'],
    forbiddenFlags: ['--full-auto', '--agent'],
  },
];

function validateHeadlessCommand(config: HeadlessCommandConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const parts = config.command.split(/\s+/);

  if (config.platform === 'claude' && parts[0] !== 'claude') {
    errors.push('Claude command must start with "claude"');
  }
  if (config.platform === 'codex' && (parts[0] !== 'codex' || parts[1] !== 'exec')) {
    errors.push('Codex command must start with "codex exec"');
  }

  for (const flag of config.expectedFlags) {
    if (!parts.includes(flag)) {
      errors.push(`Missing required flag: ${flag}`);
    }
  }

  for (const flag of config.forbiddenFlags) {
    if (parts.includes(flag)) {
      errors.push(`Forbidden flag present: ${flag}`);
    }
  }

  if (config.platform === 'claude' && !parts.includes('-p') && !parts.includes('--print')) {
    errors.push('Claude headless mode requires -p or --print flag');
  }

  if (config.platform === 'codex' && parts.includes('--full-auto')) {
    errors.push('--full-auto is deprecated; use --sandbox workspace-write instead');
  }

  if (config.platform === 'codex' && parts.includes('--agent')) {
    errors.push('--agent flag does not exist in Codex CLI');
  }

  return { valid: errors.length === 0, errors };
}

// --- Stream-JSON event validation for evidence extraction ---

interface StreamEvent {
  type: string;
  name?: string;
  [key: string]: unknown;
}

function extractAgentToolCalls(events: StreamEvent[]): StreamEvent[] {
  return events.filter(
    (e) => e.type === 'tool_use' && (e.name === 'Agent' || e.name === 'Task'),
  );
}

function extractBashCommands(events: StreamEvent[]): string[] {
  return events
    .filter((e) => e.type === 'tool_use' && e.name === 'Bash')
    .map((e) => {
      const input = e.input as Record<string, unknown> | undefined;
      return typeof input?.command === 'string' ? input.command : '';
    })
    .filter((cmd) => cmd.length > 0);
}

function verifyRetrievalBeforeWork(
  bashCommands: string[],
  retrievalPatterns: RegExp[],
): { retrievalFirst: boolean; retrievalIndex: number; workIndex: number } {
  let retrievalIndex = -1;
  let workIndex = -1;

  for (let i = 0; i < bashCommands.length; i++) {
    const isRetrieval = retrievalPatterns.some((p) => p.test(bashCommands[i]));
    if (isRetrieval) {
      if (retrievalIndex === -1) retrievalIndex = i;
    } else {
      if (workIndex === -1) workIndex = i;
    }
  }

  return {
    retrievalFirst: retrievalIndex !== -1 && (workIndex === -1 || retrievalIndex < workIndex),
    retrievalIndex,
    workIndex,
  };
}

// === TESTS ===

describe('Headless mode evidence validation', () => {
  describe('SubagentEvidenceJson verdict semantics', () => {
    it('accepts a valid Claude pass evidence', () => {
      const result = validateSubagentEvidence(validClaudeEvidence());
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('accepts a valid Codex waived evidence with blocker', () => {
      const evidence = validClaudeEvidence({
        platform: 'codex',
        verdict: 'waived',
        blocker: 'Codex CLI not available in this environment',
        retrievalEvidence: [],
      });
      const result = validateSubagentEvidence(evidence);
      expect(result.valid).toBe(true);
    });

    it('accepts a valid fail evidence with retrieval showing missing retrieval', () => {
      const evidence = validClaudeEvidence({
        verdict: 'fail',
        retrievalEvidence: [validRetrievalEvidence({ exitCode: 0, itemsReturned: 0 })],
        notes: ['Retrieval was attempted but returned 0 items — contract missing or empty.'],
      });
      const result = validateSubagentEvidence(evidence);
      expect(result.valid).toBe(true);
    });

    it('rejects pass verdict without retrievalEvidence', () => {
      const evidence = validClaudeEvidence({ retrievalEvidence: [] });
      const result = validateSubagentEvidence(evidence);
      expect(result.valid).toBe(false);
      expect(result.errors.join('\n')).toContain(
        'verdict "pass" requires at least one retrievalEvidence entry',
      );
    });

    it('rejects pass verdict with a blocker', () => {
      const evidence = validClaudeEvidence({ blocker: 'some blocker' });
      const result = validateSubagentEvidence(evidence);
      expect(result.valid).toBe(false);
      expect(result.errors.join('\n')).toContain('verdict "pass" must not have a blocker');
    });

    it('rejects waived verdict without blocker', () => {
      const evidence = validClaudeEvidence({
        verdict: 'waived',
        blocker: '',
        retrievalEvidence: [],
      });
      const result = validateSubagentEvidence(evidence);
      expect(result.valid).toBe(false);
      expect(result.errors.join('\n')).toContain('verdict "waived" requires an exact blocker');
    });

    it('rejects blocked verdict without blocker', () => {
      const evidence = validClaudeEvidence({
        verdict: 'blocked',
        blocker: '',
        retrievalEvidence: [],
      });
      const result = validateSubagentEvidence(evidence);
      expect(result.valid).toBe(false);
      expect(result.errors.join('\n')).toContain('verdict "blocked" requires an exact blocker');
    });

    it('rejects invalid verdict value', () => {
      const evidence = validClaudeEvidence({ verdict: 'unknown' as SubagentVerdict });
      const result = validateSubagentEvidence(evidence);
      expect(result.valid).toBe(false);
      expect(result.errors.join('\n')).toContain('verdict must be one of');
    });

    it('rejects evidence with invalid platform', () => {
      const evidence = validClaudeEvidence({ platform: 'gemini' as 'claude' });
      const result = validateSubagentEvidence(evidence);
      expect(result.valid).toBe(false);
      expect(result.errors.join('\n')).toContain('platform must be "claude" or "codex"');
    });

    it('rejects evidence with missing commandTranscriptPath', () => {
      const evidence = validClaudeEvidence({ commandTranscriptPath: '' });
      const result = validateSubagentEvidence(evidence);
      expect(result.valid).toBe(false);
      expect(result.errors.join('\n')).toContain('commandTranscriptPath must be a non-empty string');
    });

    it('rejects retrievalEvidence item with missing command', () => {
      const evidence = validClaudeEvidence({
        retrievalEvidence: [validRetrievalEvidence({ command: '' as string })],
      });
      const result = validateSubagentEvidence(evidence);
      expect(result.valid).toBe(false);
      expect(result.errors.join('\n')).toContain('command must be a non-empty string');
    });

    it('rejects fail verdict without retrievalEvidence', () => {
      const evidence = validClaudeEvidence({
        verdict: 'fail',
        retrievalEvidence: [],
      });
      const result = validateSubagentEvidence(evidence);
      expect(result.valid).toBe(false);
      expect(result.errors.join('\n')).toContain(
        'verdict "fail" requires retrievalEvidence',
      );
    });
  });

  describe('Headless command validation', () => {
    it('validates Claude -p command with Agent tool for subagent delegation', () => {
      const config = CLAUDE_HEADLESS_COMMANDS[0];
      const result = validateHeadlessCommand(config);
      expect(result.valid).toBe(true);
    });

    it('validates Claude stream-json command for evidence capture', () => {
      const config = CLAUDE_HEADLESS_COMMANDS[1];
      const result = validateHeadlessCommand(config);
      expect(result.valid).toBe(true);
    });

    it('validates Codex exec command with gpt-5.4-mini for cost savings', () => {
      const config = CLAUDE_HEADLESS_COMMANDS[2];
      const result = validateHeadlessCommand(config);
      expect(result.valid).toBe(true);
    });

    it('rejects Claude headless without -p flag', () => {
      const config: HeadlessCommandConfig = {
        platform: 'claude',
        command: 'claude --allowedTools "Agent,Read" "verify Phase 58"',
        expectedFlags: [],
        forbiddenFlags: [],
      };
      const result = validateHeadlessCommand(config);
      expect(result.valid).toBe(false);
      expect(result.errors.join('\n')).toContain('requires -p or --print');
    });

    it('rejects Claude headless with --bare (would skip hooks)', () => {
      const config: HeadlessCommandConfig = {
        platform: 'claude',
        command: 'claude --bare -p "verify Phase 58" --allowedTools "Agent,Read"',
        expectedFlags: ['-p'],
        forbiddenFlags: ['--bare'],
      };
      const result = validateHeadlessCommand(config);
      expect(result.valid).toBe(false);
      expect(result.errors.join('\n')).toContain('Forbidden flag present: --bare');
    });

    it('rejects Codex with deprecated --full-auto flag', () => {
      const config: HeadlessCommandConfig = {
        platform: 'codex',
        command: 'codex exec --full-auto "verify Phase 58"',
        expectedFlags: ['exec'],
        forbiddenFlags: [],
      };
      const result = validateHeadlessCommand(config);
      expect(result.valid).toBe(false);
      expect(result.errors.join('\n')).toContain('--full-auto is deprecated');
    });

    it('rejects Codex with non-existent --agent flag', () => {
      const config: HeadlessCommandConfig = {
        platform: 'codex',
        command: 'codex exec --agent env-contract-verifier "verify Phase 58"',
        expectedFlags: ['exec'],
        forbiddenFlags: ['--agent'],
      };
      const result = validateHeadlessCommand(config);
      expect(result.valid).toBe(false);
      expect(result.errors.join('\n')).toContain('--agent flag does not exist');
    });

    it('ensures Codex uses workspace-write sandbox for command execution', () => {
      const config: HeadlessCommandConfig = {
        platform: 'codex',
        command: 'codex exec --sandbox workspace-write --ask-for-approval never --json --model gpt-5.4-mini "verify"',
        expectedFlags: ['--sandbox'],
        forbiddenFlags: [],
      };
      const result = validateHeadlessCommand(config);
      expect(result.valid).toBe(true);
    });

    it('ensures Codex model is gpt-5.4-mini for cost savings', () => {
      const config = CLAUDE_HEADLESS_COMMANDS[2]; // codex with --model gpt-5.4-mini
      const parts = config.command.split(/\s+/);
      const modelIdx = parts.indexOf('--model');
      expect(modelIdx).toBeGreaterThan(-1);
      expect(parts[modelIdx + 1]).toBe('gpt-5.4-mini');
    });
  });

  describe('Stream-JSON event extraction for evidence', () => {
    it('extracts Agent tool calls from stream events', () => {
      const events: StreamEvent[] = [
        { type: 'system/init', model: 'claude-sonnet-4-6' },
        { type: 'tool_use', name: 'Agent', input: { prompt: 'verify Phase 58' } },
        { type: 'tool_use', name: 'Read', input: { file_path: '/some/file.ts' } },
        { type: 'tool_use', name: 'Agent', input: { prompt: 'check another thing' } },
      ];
      const agentCalls = extractAgentToolCalls(events);
      expect(agentCalls.length).toBe(2);
    });

    it('recognizes Task as alias for Agent tool', () => {
      const events: StreamEvent[] = [
        { type: 'tool_use', name: 'Task', input: { prompt: 'verify Phase 58' } },
      ];
      const agentCalls = extractAgentToolCalls(events);
      expect(agentCalls.length).toBe(1);
    });

    it('extracts Bash commands from stream events', () => {
      const events: StreamEvent[] = [
        {
          type: 'tool_use',
          name: 'Bash',
          input: { command: 'mycodemap env-contract --for explore --json' },
        },
        {
          type: 'tool_use',
          name: 'Bash',
          input: { command: 'cat /some/file.ts' },
        },
      ];
      const commands = extractBashCommands(events);
      expect(commands.length).toBe(2);
      expect(commands[0]).toContain('mycodemap env-contract');
    });

    it('verifies retrieval-before-work from bash command sequence', () => {
      const commands = [
        'mycodemap env-contract --for explore --json',
        'cat /some/file.ts',
        'grep -r "pattern" src/',
      ];
      const retrievalPatterns = [/mycodemap env-contract/, /codemap_env_contract/];
      const result = verifyRetrievalBeforeWork(commands, retrievalPatterns);
      expect(result.retrievalFirst).toBe(true);
      expect(result.retrievalIndex).toBe(0);
    });

    it('detects retrieval NOT before work (violation)', () => {
      const commands = [
        'cat /some/file.ts',
        'grep -r "pattern" src/',
        'mycodemap env-contract --for explore --json',
      ];
      const retrievalPatterns = [/mycodemap env-contract/, /codemap_env_contract/];
      const result = verifyRetrievalBeforeWork(commands, retrievalPatterns);
      expect(result.retrievalFirst).toBe(false); // retrieval at index 2, work at index 0
      expect(result.retrievalIndex).toBe(2); // retrieval is late
      expect(result.workIndex).toBe(0); // work happened first
    });

    it('detects completely missing retrieval', () => {
      const commands = ['cat /some/file.ts', 'grep -r "pattern" src/'];
      const retrievalPatterns = [/mycodemap env-contract/, /codemap_env_contract/];
      const result = verifyRetrievalBeforeWork(commands, retrievalPatterns);
      expect(result.retrievalFirst).toBe(false);
      expect(result.retrievalIndex).toBe(-1);
    });

    it('recognizes MCP tool call as retrieval', () => {
      const commands = [
        'codemap_env_contract(agentType="explore")',
        'cat /some/file.ts',
      ];
      const retrievalPatterns = [/mycodemap env-contract/, /codemap_env_contract/];
      const result = verifyRetrievalBeforeWork(commands, retrievalPatterns);
      expect(result.retrievalFirst).toBe(true);
      expect(result.retrievalIndex).toBe(0);
    });
  });

  describe('RetrievalEvidenceItem validation against env-contract schema', () => {
    it('validates that retrieved contract items pass env-contract schema validation', () => {
      // Simulate the contract JSON returned by the retrieval command
      const contractData: ProjectEnvironmentContract = {
        schemaVersion: 'env-contract.v1',
        generatedAt: '2026-05-05T09:42:36.284Z',
        projectProfile: {
          name: 'nodejs',
          source: 'package.json',
          confidence: 'high',
        },
        items: [
          {
            id: 'codemap-query-priority',
            category: 'retrieval',
            severity: 'high',
            content: 'CodeMap CLI query should be tried before raw grep.',
            sources: [
              { file: 'AGENTS.md', hash: 'sha256:abc', authority: 'governance' },
            ],
          },
          {
            id: 'real-scenario-validation',
            category: 'validation',
            severity: 'high',
            content: 'Real evidence required, not mocks only.',
            sources: [
              { file: 'docs/rules/testing.md', hash: 'sha256:def', authority: 'governance' },
            ],
          },
        ],
        conflicts: [
          {
            id: 'commit-tag-case',
            severity: 'medium',
            description: 'Commit tag case mismatch',
            sources: [
              { file: '.githooks/commit-msg', value: 'BUGFIX FEATURE' },
              { file: 'AGENTS.md', value: 'docs' },
            ],
            recommendation: 'Hook enforces uppercase tags.',
          },
        ],
        sourceSnapshots: [
          {
            file: 'AGENTS.md',
            hash: 'sha256:abc',
            lastModified: '2026-05-05T09:42:24.811Z',
          },
        ],
      };

      const result = validateProjectEnvironmentContract(contractData);
      expect(result.valid).toBe(true);
    });

    it('rejects contract with wrong schema version in retrieval evidence', () => {
      const contractData = {
        schemaVersion: 'env-contract.seed.v1',
        generatedAt: '2026-05-05T09:42:36.284Z',
        projectProfile: { name: 'nodejs', source: 'package.json', confidence: 'high' },
        items: [],
        conflicts: [],
        sourceSnapshots: [],
      };

      const result = validateProjectEnvironmentContract(contractData);
      expect(result.valid).toBe(false);
      expect(result.errors.join('\n')).toContain('schemaVersion must be "env-contract.v1"');
    });
  });

  describe('Codex gpt-5.4-mini cost optimization', () => {
    it('ensures Codex headless command uses gpt-5.4-mini model', () => {
      const codexConfig = CLAUDE_HEADLESS_COMMANDS[2];
      expect(codexConfig.command).toContain('--model gpt-5.4-mini');
    });

    it('gpt-5.4-mini is NOT the default model', () => {
      // Default model is typically gpt-5.4 or similar; gpt-5.4-mini is explicit cost savings
      const parts = CLAUDE_HEADLESS_COMMANDS[2].command.split(/\s+/);
      const modelIdx = parts.indexOf('--model');
      expect(modelIdx).toBeGreaterThan(-1);
      expect(parts[modelIdx + 1]).toBe('gpt-5.4-mini');
      expect(parts[modelIdx + 1]).not.toBe('gpt-5.4');
    });
  });
});
