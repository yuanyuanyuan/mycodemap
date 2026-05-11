// [META] since:2026-05-02 | owner:cli-team | stable:false
// [WHY] Discover project environment contract items by scanning governance and executable source files.

import { existsSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import type {
  ContractConflict,
  ContractItem,
  ContractSource,
  ProjectEnvironmentContract,
  SourceAuthority,
} from './types.js';

const MANAGED_HOOK_DIR = '.mycodemap/hooks';
const LEGACY_HOOK_DIR = '.githooks';
const TEMPLATE_HOOK_DIR = 'scripts/hooks/templates';

type HookName = 'commit-msg' | 'pre-commit';

interface ResolvedHookContent {
  path: string;
  content: string;
}

// ─── Source snapshot ────────────────────────────────────────────────

export interface SourceSnapshot {
  file: string;
  hash: string;
  lastModified: string;
}

function sha256(content: string): string {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

function safeReadFile(filePath: string): string | undefined {
  if (!existsSync(filePath)) return undefined;
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return undefined;
  }
}

function makeSnapshot(rootDir: string, relativePath: string): SourceSnapshot | undefined {
  const fullPath = path.join(rootDir, relativePath);
  if (!existsSync(fullPath)) return undefined;
  try {
    const content = readFileSync(fullPath, 'utf8');
    const stat = statSync(fullPath);
    return {
      file: relativePath,
      hash: sha256(content),
      lastModified: stat.mtime.toISOString(),
    };
  } catch {
    return undefined;
  }
}

// ─── Source authority mapping ───────────────────────────────────────

function classifyAuthority(filePath: string): SourceAuthority {
  if (
    filePath.startsWith(`${MANAGED_HOOK_DIR}/`) ||
    filePath.startsWith(`${LEGACY_HOOK_DIR}/`) ||
    filePath.startsWith(`${TEMPLATE_HOOK_DIR}/`) ||
    filePath === 'package.json' ||
    filePath.startsWith('vitest') ||
    filePath.endsWith('.config.ts')
  ) {
    return 'executable';
  }
  if (
    filePath === 'AGENTS.md' ||
    filePath.startsWith('docs/rules/') ||
    filePath.startsWith('.mycodemap/rules/')
  ) {
    return 'governance';
  }
  if (filePath.startsWith('.mycodemap/assistants/')) {
    return 'generated';
  }
  return 'example';
}

function makeSource(rootDir: string, relativePath: string, line?: number): ContractSource | undefined {
  const fullPath = path.join(rootDir, relativePath);
  if (!existsSync(fullPath)) return undefined;
  try {
    const content = readFileSync(fullPath, 'utf8');
    return {
      file: relativePath,
      line,
      hash: sha256(content),
      authority: classifyAuthority(relativePath),
    };
  } catch {
    return undefined;
  }
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function findLineNumber(content: string, pattern: RegExp | string): number | undefined {
  const regex = typeof pattern === 'string' ? new RegExp(escapeRegex(pattern), 'u') : pattern;
  const lines = content.split(/\r?\n/u);

  for (let index = 0; index < lines.length; index += 1) {
    if (regex.test(lines[index] ?? '')) {
      return index + 1;
    }
  }

  return undefined;
}

function uniqueSources(sources: Array<ContractSource | undefined>): ContractSource[] {
  const seen = new Map<string, ContractSource>();

  for (const source of sources) {
    if (!source) continue;
    const key = `${source.file}:${source.line ?? 0}`;
    if (!seen.has(key)) {
      seen.set(key, source);
    }
  }

  return [...seen.values()];
}

// ─── Hook source resolution and parsing ─────────────────────────────

function resolveHookContent(rootDir: string, hookName: HookName): ResolvedHookContent | undefined {
  // Discovery reads from project sources only — not from `.mycodemap/hooks/`,
  // which is an init-managed output directory. This ensures idempotency:
  // env-contract extracted before/after init produces the same result.
  const candidates = [
    path.join(LEGACY_HOOK_DIR, hookName),
    path.join(TEMPLATE_HOOK_DIR, hookName),
  ];

  for (const relativePath of candidates) {
    const content = safeReadFile(path.join(rootDir, relativePath));
    if (content) {
      return { path: relativePath, content };
    }
  }

  return undefined;
}

function parseCommitHookTags(content: string): string[] {
  const match = content.match(/VALID_TAGS="([^"]+)"/u);
  if (!match) return [];
  return match[1].split(/\s+/u).filter(Boolean);
}

function parseCommitHookFormat(content: string): string {
  const formatMatch = content.match(/Format:\s*(.+)$/mu);
  if (!formatMatch) return '[TAG] scope: message';

  return formatMatch[1].trim().replace(/^["']|["']$/gu, '');
}

function parseShellNumericAssignment(content: string, variableName: string): number | undefined {
  const match = content.match(new RegExp(`${escapeRegex(variableName)}=(\\d+)`, 'u'));
  if (!match) return undefined;
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) ? value : undefined;
}

function parseDocsGuardrailTargets(content: string): string[] {
  const match = content.match(/DOC_GUARDRAIL_FILES=.*grep -E '([^']+)'/u);
  if (!match) return [];

  return match[1]
    .replace(/^\^\(/u, '')
    .replace(/\)\$$/u, '')
    .split('|')
    .map((token) => token.replace(/\\\./gu, '.').replace(/^\^/u, '').replace(/\$$/u, ''))
    .filter(Boolean);
}

function normalizeCommitTags(tags: string[]): string[] {
  return [...new Set(
    tags
      .map((tag) => tag.replace(/[^A-Za-z0-9_-]/gu, '').toUpperCase())
      .filter((tag) => tag.length > 0 && tag !== 'TAG'),
  )].sort();
}

function parseDocumentedCommitTags(content: string): string[][] {
  const tagSets: string[][] = [];

  for (const match of content.matchAll(/Valid tags:\s*([^\n]+)/gu)) {
    const tags = [...match[1].matchAll(/`?\[?([A-Za-z][A-Za-z0-9_-]*)\]?`?/gu)].map((item) => item[1]);
    if (tags.length > 0) {
      tagSets.push(tags);
    }
  }

  for (const match of content.matchAll(/支持的提交 TAG 类型：([^\n]+)/gu)) {
    const tags = [...match[1].matchAll(/\[([A-Za-z][A-Za-z0-9_-]*)\]/gu)].map((item) => item[1]);
    if (tags.length > 0) {
      tagSets.push(tags);
    }
  }

  return tagSets;
}

function haveSameCommitTags(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((tag, index) => tag === right[index]);
}

function detectHookEntrypoints(rootDir: string): string[] {
  const candidates = [
    '.git/hooks/pre-commit',
    '.git/hooks/commit-msg',
    '.githooks/pre-commit',
    '.githooks/commit-msg',
  ];

  return candidates.filter((relativePath) => existsSync(path.join(rootDir, relativePath)));
}

// ─── Item builders ──────────────────────────────────────────────────

function buildRtkItem(rootDir: string): ContractItem | undefined {
  const agentsSource = makeSource(rootDir, 'AGENTS.md');
  if (!agentsSource) return undefined;

  return {
    id: 'shell-rtk-wrapper',
    category: 'execution',
    severity: 'critical',
    content: 'Shell commands must be wrapped with `rtk` for token-optimized execution. Prefix commands like `rtk git status`, `rtk npm run build`, `rtk npx vitest run`.',
    sources: [agentsSource],
  };
}

function buildHookRuntimeTopologyItem(rootDir: string): ContractItem | undefined {
  const commitHook = resolveHookContent(rootDir, 'commit-msg');
  const preCommitHook = resolveHookContent(rootDir, 'pre-commit');
  if (!commitHook && !preCommitHook) return undefined;

  const sources = uniqueSources([
    commitHook ? makeSource(rootDir, commitHook.path, findLineNumber(commitHook.content, 'HOOK_SOURCE=')) : undefined,
    preCommitHook ? makeSource(rootDir, preCommitHook.path, findLineNumber(preCommitHook.content, 'HOOK_SOURCE=')) : undefined,
  ]);

  return {
    id: 'hook-runtime-topology',
    category: 'execution',
    severity: 'critical',
    content:
      'Managed Git hook rules are sourced from `.githooks/` or `scripts/hooks/templates/`; `.mycodemap/hooks/` is an init-managed output and is excluded from discovery to ensure idempotency. Git entrypoints may be `.git/hooks/*` or `.githooks/*` shims.',
    metadata: {
      canonicalPayloadDir: MANAGED_HOOK_DIR,
      activeRuleSources: [commitHook?.path, preCommitHook?.path].filter(Boolean),
      detectedEntrypoints: detectHookEntrypoints(rootDir),
    },
    sources,
  };
}

function buildCommitFormatItem(rootDir: string): ContractItem | undefined {
  const hook = resolveHookContent(rootDir, 'commit-msg');
  if (!hook) return undefined;

  const hookSource = makeSource(
    rootDir,
    hook.path,
    findLineNumber(hook.content, /VALID_TAGS=|print_blocked_rule/u),
  );
  if (!hookSource) return undefined;

  const tags = parseCommitHookTags(hook.content);
  const format = parseCommitHookFormat(hook.content);

  return {
    id: 'commit-format',
    category: 'commit',
    severity: 'critical',
    content:
      `Commit messages must use ${format} with uppercase tags whenever staged files include non-dot paths. Dot-directory-only commits skip this format check.`,
    metadata: {
      validTags: tags,
      format,
      dotDirectoryExemption: true,
      hookSourcePath: hook.path,
      recoveryHint: 'Rewrite the first line to match `[TAG] scope: message`, or unstage non-dot files if you intended the dot-directory exemption.',
    },
    sources: [hookSource],
  };
}

function buildStagedFileLimitItem(rootDir: string): ContractItem | undefined {
  const hook = resolveHookContent(rootDir, 'pre-commit');
  if (!hook) return undefined;

  const maxFilesPerCommit = parseShellNumericAssignment(hook.content, 'MAX_FILES_PER_COMMIT');
  const maxFilesWithDocs = parseShellNumericAssignment(hook.content, 'MAX_FILES_WITH_DOCS');
  if (!maxFilesPerCommit || !maxFilesWithDocs) return undefined;

  const hookSource = makeSource(
    rootDir,
    hook.path,
    findLineNumber(hook.content, 'MAX_FILES_PER_COMMIT='),
  );
  if (!hookSource) return undefined;

  return {
    id: 'staged-file-limit',
    category: 'commit',
    severity: 'high',
    content:
      `Non-initial commits may stage at most ${maxFilesPerCommit} files, or ${maxFilesWithDocs} files when documentation is included. Dot-directory-only commits skip this limit.`,
    metadata: {
      maxFilesPerCommit,
      maxFilesWithDocs,
      initialCommitExempt: true,
      dotDirectoryExemption: true,
      hookSourcePath: hook.path,
      recoveryHint: 'Split the staged changes into smaller commits, then retry.',
    },
    sources: [hookSource],
  };
}

function buildHeaderRequirementItem(rootDir: string): ContractItem | undefined {
  const hook = resolveHookContent(rootDir, 'pre-commit');
  if (!hook || !hook.content.includes('[META]') || !hook.content.includes('[WHY]')) return undefined;

  const hookSource = makeSource(
    rootDir,
    hook.path,
    findLineNumber(hook.content, '[META]'),
  );
  if (!hookSource) return undefined;

  return {
    id: 'source-file-headers',
    category: 'style',
    severity: 'high',
    content:
      'Non-test, non-`.d.ts` TypeScript source files staged outside dot-directories must include `[META]` and `[WHY]` headers within the first 10 lines.',
    metadata: {
      requiredHeaders: ['[META]', '[WHY]'],
      appliesTo: 'staged TypeScript source files outside dot-directories, excluding `.test.ts` and `.d.ts`',
      headerTemplate: [
        '// [META] since:YYYY-MM | owner:team | stable:false',
        '// [WHY] Explain why this file exists',
      ],
      hookSourcePath: hook.path,
    },
    sources: [hookSource],
  };
}

function buildDocsGuardrailItem(rootDir: string): ContractItem | undefined {
  const hook = resolveHookContent(rootDir, 'pre-commit');
  if (!hook) return undefined;

  const triggerPaths = parseDocsGuardrailTargets(hook.content);
  if (triggerPaths.length === 0) return undefined;

  const hookSource = makeSource(
    rootDir,
    hook.path,
    findLineNumber(hook.content, 'DOC_GUARDRAIL_FILES='),
  );
  if (!hookSource) return undefined;

  return {
    id: 'docs-guardrail',
    category: 'commit',
    severity: 'high',
    content:
      'Staging README/package metadata, docs, CLI entrypoints, vitest config, or the CI gateway workflow triggers `npm run docs:check` before the commit may proceed.',
    metadata: {
      command: 'npm run docs:check',
      triggerPaths,
      hookSourcePath: hook.path,
      recoveryHint: 'Run `npm run docs:check`, resolve the reported documentation drift, then retry the commit.',
    },
    sources: [hookSource],
  };
}

function buildTestEntryItem(rootDir: string): ContractItem | undefined {
  const pkgContent = safeReadFile(path.join(rootDir, 'package.json'));
  if (!pkgContent) return undefined;

  try {
    const pkg = JSON.parse(pkgContent) as Record<string, unknown>;
    const scripts = pkg.scripts as Record<string, string> | undefined;
    if (!scripts?.test) return undefined;

    const pkgSource = makeSource(rootDir, 'package.json');
    if (!pkgSource) return undefined;

    return {
      id: 'test-entry-vitest',
      category: 'execution',
      severity: 'critical',
      content: `Tests run with \`${scripts.test}\`. Use \`${scripts.test}\` or \`npx vitest run\` directly, not \`npm test\` when RTK is available.`,
      metadata: {
        scriptName: 'test',
        scriptValue: scripts.test,
      },
      sources: [pkgSource],
    };
  } catch {
    return undefined;
  }
}

function buildQueryPriorityItem(rootDir: string): ContractItem | undefined {
  const agentsSource = makeSource(rootDir, 'AGENTS.md');
  if (!agentsSource) return undefined;

  return {
    id: 'codemap-query-priority',
    category: 'retrieval',
    severity: 'high',
    content: 'CodeMap CLI query/analyze/deps/impact should be tried before raw grep/rg for code search. Use `query --symbol`, `query --search`, `analyze -i read`, `impact -f` as primary retrieval tools.',
    sources: [agentsSource],
  };
}

function buildRealScenarioValidationItem(rootDir: string): ContractItem | undefined {
  const testingSource = makeSource(rootDir, 'docs/rules/testing.md');
  if (!testingSource) return undefined;

  return {
    id: 'real-scenario-validation',
    category: 'validation',
    severity: 'high',
    content: 'Real filesystem/subprocess or transport evidence and at least one failure scenario are required. Pure mock-only tests are not sufficient verification.',
    sources: [testingSource],
  };
}

// ─── Conflict detection ─────────────────────────────────────────────

function detectConflicts(rootDir: string): ContractConflict[] {
  const conflicts: ContractConflict[] = [];
  const hook = resolveHookContent(rootDir, 'commit-msg');
  const documentedTagSources = [
    'README.zh-CN.md',
    'docs/DEVELOPMENT.md',
    'docs/AI_ASSISTANT_SETUP.md',
    'docs/SETUP_GUIDE.md',
  ];

  if (hook) {
    const hookTags = normalizeCommitTags(parseCommitHookTags(hook.content));
    if (hookTags.length > 0) {
      for (const relativePath of documentedTagSources) {
        const documentedContent = safeReadFile(path.join(rootDir, relativePath));
        if (!documentedContent) continue;

        const documentedTagSets = parseDocumentedCommitTags(documentedContent);
        for (const documentedTagsRaw of documentedTagSets) {
          const documentedTags = normalizeCommitTags(documentedTagsRaw);
          if (!haveSameCommitTags(hookTags, documentedTags)) {
            conflicts.push({
              id: 'commit-tag-case',
              severity: 'medium',
              description: 'Commit tag list mismatch between hook and documentation',
              sources: [
                { file: hook.path, value: hookTags.join(' ') },
                { file: relativePath, value: documentedTags.join(' ') },
              ],
              recommendation: 'Hook-enforced tags and the documented valid tag list should describe the same set.',
            });
            return conflicts;
          }
        }
      }
    }
  }

  return conflicts;
}

// ─── Main discovery function ────────────────────────────────────────

export interface DiscoveryOptions {
  profileName?: string;
  generatedAt?: string;
}

export function discoverProjectEnvironmentContract(
  rootDir: string,
  options?: DiscoveryOptions,
): ProjectEnvironmentContract {
  const items: ContractItem[] = [];

  const itemBuilders = [
    buildRtkItem,
    buildHookRuntimeTopologyItem,
    buildCommitFormatItem,
    buildStagedFileLimitItem,
    buildHeaderRequirementItem,
    buildDocsGuardrailItem,
    buildTestEntryItem,
    buildQueryPriorityItem,
    buildRealScenarioValidationItem,
  ];

  for (const buildItem of itemBuilders) {
    const item = buildItem(rootDir);
    if (item) items.push(item);
  }

  const snapshotFiles = new Set<string>([
    'AGENTS.md',
    'package.json',
    'docs/rules/testing.md',
    'vitest.config.ts',
  ]);

  for (const item of items) {
    for (const source of item.sources) {
      snapshotFiles.add(source.file);
    }
  }

  const snapshots: SourceSnapshot[] = [];
  for (const relativePath of snapshotFiles) {
    const snapshot = makeSnapshot(rootDir, relativePath);
    if (snapshot) snapshots.push(snapshot);
  }

  const conflicts = detectConflicts(rootDir);

  const profileName = options?.profileName ?? 'generic';
  const projectSource = existsSync(path.join(rootDir, 'package.json'))
    ? 'package.json'
    : existsSync(path.join(rootDir, 'pyproject.toml'))
      ? 'pyproject.toml'
      : 'not-detected';

  return {
    schemaVersion: 'env-contract.v1',
    generatedAt: options?.generatedAt ?? new Date().toISOString(),
    projectProfile: {
      name: profileName,
      source: projectSource,
      confidence: projectSource !== 'not-detected' ? 'high' : 'none',
    },
    items,
    conflicts,
    sourceSnapshots: snapshots,
  };
}
