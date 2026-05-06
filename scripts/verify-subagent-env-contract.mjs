#!/usr/bin/env node

/**
 * [META] since:2026-05-02 | owner:cli-team | stable:false
 * [WHY] Prepare Phase 58 subagent verification fixtures and evidence templates.
 * Stages build output, helper snippets, agent definitions, and manual-checkpoint assets.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const CLI_PATH = path.join(REPO_ROOT, 'dist', 'cli', 'index.js');
const PHASE_DIR = path.join(
  REPO_ROOT,
  '.planning',
  'phases',
  '58-subagent-environment-contract-injection'
);
const EVIDENCE_DIR = path.join(REPO_ROOT, 'docs', 'generated', 'phase-58', 'subagent-evidence');
const HUMAN_UAT_PATH = path.join(PHASE_DIR, '58-HUMAN-UAT.md');
const CLAUDE_AGENT_PATH = path.join(REPO_ROOT, '.claude', 'agents', 'env-contract-verifier.md');
const CODEX_AGENT_PATH = path.join(REPO_ROOT, '.codex', 'agents', 'env-contract-verifier.toml');
const MANIFEST_PATH = path.join(EVIDENCE_DIR, 'verification-manifest.json');
const CLAUDE_HOOK_EXAMPLE_PATH = path.join(EVIDENCE_DIR, 'claude-hook-example.json');
const CODEX_AGENT_EXAMPLE_PATH = path.join(EVIDENCE_DIR, 'codex-agent-example.toml');
const CLAUDE_EVIDENCE_PATH = path.join(EVIDENCE_DIR, 'claude-subagent.json');
const CODEX_EVIDENCE_PATH = path.join(EVIDENCE_DIR, 'codex-subagent.json');
const CLAUDE_SESSION_PATH = path.join(EVIDENCE_DIR, 'claude-session.md');
const CODEX_SESSION_PATH = path.join(EVIDENCE_DIR, 'codex-session.md');

const REQUIRED_ARTIFACTS = [
  relativePath(HUMAN_UAT_PATH),
  relativePath(CLAUDE_AGENT_PATH),
  relativePath(CODEX_AGENT_PATH),
  relativePath(MANIFEST_PATH),
  relativePath(CLAUDE_HOOK_EXAMPLE_PATH),
  relativePath(CODEX_AGENT_EXAMPLE_PATH),
  relativePath(CLAUDE_EVIDENCE_PATH),
  relativePath(CODEX_EVIDENCE_PATH),
  relativePath(CLAUDE_SESSION_PATH),
  relativePath(CODEX_SESSION_PATH),
];

function relativePath(filePath) {
  return path.relative(REPO_ROOT, filePath).replaceAll(path.sep, '/');
}

function ensureParentDir(filePath) {
  mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeText(filePath, content) {
  ensureParentDir(filePath);
  writeFileSync(filePath, content, 'utf8');
  console.log(`  wrote ${relativePath(filePath)}`);
}

function writeJson(filePath, value) {
  writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function captureCommand(command, args) {
  return execFileSync(command, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    env: { ...process.env, NO_COLOR: '1' },
  });
}

function runStreaming(command, args) {
  execFileSync(command, args, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    env: { ...process.env, NO_COLOR: '1' },
  });
}

function buildClaudeVerifierAgent() {
  return `---
name: env-contract-verifier
description: Phase 58 verification-only agent. Confirm env-contract retrieval happens before any substantive work.
tools: Read, Bash, Grep, Glob
model: haiku
---

You are a verification-only subagent for Phase 58.

Before any substantive work, retrieve the project environment contract.
Primary path:
1. Run \`mycodemap env-contract --for explore --json\`
Alternate path only if CLI retrieval is unavailable:
1. Call \`codemap_env_contract(agentType="explore")\`

After retrieval:
2. Report the retrieval command and output first.
3. List the contract items you observed, including \`shell-rtk-wrapper\`, \`commit-format\`, and \`test-entry-vitest\`.
4. Stop after reporting whether retrieval happened before any other substantive work.

Do not edit repository files.
Do not skip the retrieval step.
If retrieval fails, report the exact blocker and stop.
`;
}

function buildCodexVerifierAgent() {
  return `name = "env-contract-verifier"
description = "Phase 58 verification-only agent. Confirm env-contract retrieval happens before any substantive work."
developer_instructions = """
You are a verification-only subagent for Phase 58.

Before any substantive work, retrieve the project environment contract.
Primary path:
1. Run: mycodemap env-contract --for worker --json
Alternate path only if CLI retrieval is unavailable:
1. Call: codemap_env_contract(agentType="worker")

After retrieval:
2. Report the retrieval command and output first.
3. List the contract items you observed, including shell-rtk-wrapper, commit-format, and test-entry-vitest.
4. Stop after reporting whether retrieval happened before any other substantive work.

Do not edit repository files.
Do not skip the retrieval step.
If retrieval fails, report the exact blocker and stop.
"""
`;
}

function buildEvidenceTemplate(platform, transcriptPath, notes) {
  return {
    platform,
    attempted: false,
    available: null,
    commandTranscriptPath: transcriptPath,
    retrievalEvidence: [],
    verdict: 'pending',
    blocker: '',
    notes,
  };
}

function hasManualEvidence(filePath) {
  if (!existsSync(filePath)) {
    return false;
  }

  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
    const verdicts = new Set(['pass', 'fail', 'waived', 'blocked']);
    const retrievalEvidence =
      typeof parsed.retrievalEvidence === 'string'
        ? parsed.retrievalEvidence.trim().length > 0
        : Array.isArray(parsed.retrievalEvidence) && parsed.retrievalEvidence.length > 0;
    const blocker = typeof parsed.blocker === 'string' && parsed.blocker.trim().length > 0;
    return verdicts.has(parsed.verdict) && (retrievalEvidence || blocker);
  } catch {
    return false;
  }
}

function writeEvidenceTemplate(filePath, value) {
  if (hasManualEvidence(filePath)) {
    console.log(`  preserved ${relativePath(filePath)} (manual evidence already present)`);
    return;
  }

  writeJson(filePath, value);
}

function writeSessionPlaceholder(filePath, title) {
  const placeholder = `# ${title}

Paste the relevant transcript here after running the manual protocol in \`${relativePath(HUMAN_UAT_PATH)}\`.

- Keep the retrieval step and its output.
- Keep the first substantive work item after retrieval.
- Note any blocker inline if the path could not be completed.
`;

  if (existsSync(filePath)) {
    const current = readFileSync(filePath, 'utf8');
    if (!current.includes('Paste the relevant transcript here after running the manual protocol')) {
      console.log(`  preserved ${relativePath(filePath)} (non-placeholder content already present)`);
      return;
    }
  }

  writeText(filePath, placeholder);
}

function writeHelperSnippets() {
  const hookExample = captureCommand('rtk', [
    'node',
    'dist/cli/index.js',
    'env-contract',
    '--for',
    'explore',
    '--as-hook-config',
  ]);
  const codexExample = captureCommand('rtk', [
    'node',
    'dist/cli/index.js',
    'env-contract',
    '--for',
    'worker',
    '--as-codex-agent',
  ]);

  writeText(CLAUDE_HOOK_EXAMPLE_PATH, hookExample.endsWith('\n') ? hookExample : `${hookExample}\n`);
  writeText(CODEX_AGENT_EXAMPLE_PATH, codexExample.endsWith('\n') ? codexExample : `${codexExample}\n`);
}

function writeManifest() {
  writeJson(MANIFEST_PATH, {
    phase: '58',
    preparedAt: new Date().toISOString(),
    claudeRequired: true,
    codexOptional: true,
    requiredArtifacts: REQUIRED_ARTIFACTS,
    protocolDoc: relativePath(HUMAN_UAT_PATH),
  });
}

function printChecklist() {
  console.log('\nManual checkpoint checklist:');
  console.log(`1. Read ${relativePath(HUMAN_UAT_PATH)}.`);
  console.log('2. Open an authenticated Claude Code session in this repository and delegate to `env-contract-verifier`.');
  console.log(`3. Paste the transcript into ${relativePath(CLAUDE_SESSION_PATH)}.`);
  console.log(`4. Update ${relativePath(CLAUDE_EVIDENCE_PATH)} with pass/fail evidence.`);
  console.log('5. If Codex is available, run the optional parity path and update the Codex session + JSON files.');
  console.log('6. Resume the phase only after the Claude evidence file records retrieval-before-work or an exact blocker.');
}

function main() {
  console.log('=== Phase 58 Verification Preparation ===\n');

  console.log('[1/4] Building CLI output...');
  runStreaming('rtk', ['npm', 'run', 'build']);
  if (!existsSync(CLI_PATH)) {
    throw new Error(`Missing built CLI at ${relativePath(CLI_PATH)}`);
  }

  console.log('\n[2/4] Generating helper snippets from the built CLI...');
  writeHelperSnippets();

  console.log('\n[3/4] Writing verification agent fixtures and evidence templates...');
  writeText(CLAUDE_AGENT_PATH, buildClaudeVerifierAgent());
  writeText(CODEX_AGENT_PATH, buildCodexVerifierAgent());
  writeManifest();
  writeEvidenceTemplate(
    CLAUDE_EVIDENCE_PATH,
    buildEvidenceTemplate('claude', relativePath(CLAUDE_SESSION_PATH), [
      'Set verdict to "pass" only if an env-contract retrieval call appears before any other substantive work.',
      'If the Claude path cannot be run, use "fail" or "blocked" and record the exact blocker.',
    ]),
  );
  writeEvidenceTemplate(
    CODEX_EVIDENCE_PATH,
    buildEvidenceTemplate('codex', relativePath(CODEX_SESSION_PATH), [
      'Codex parity is optional for Phase 58 closure.',
      'Use verdict "waived" only when the exact environment blocker is recorded.',
    ]),
  );
  writeSessionPlaceholder(CLAUDE_SESSION_PATH, 'Claude Session Evidence');
  writeSessionPlaceholder(CODEX_SESSION_PATH, 'Codex Session Evidence');

  console.log('\n[4/4] Preparation complete.');
  printChecklist();
}

try {
  main();
} catch (error) {
  console.error('Fatal error:', error);
  process.exit(1);
}
