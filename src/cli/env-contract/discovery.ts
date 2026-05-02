// [META] since:2026-05-02 | owner:cli-team | stable:false
// [WHY] Discover project environment contract items by scanning governance and executable source files.

import { existsSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import type {
  ContractCategory,
  ContractConflict,
  ContractItem,
  ContractSeverity,
  ContractSource,
  ProjectEnvironmentContract,
  SourceAuthority,
} from './types.js';

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
    filePath.startsWith('.githooks/') ||
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

// ─── Commit hook parsing ────────────────────────────────────────────

function parseCommitHookTags(content: string): string[] {
  const match = content.match(/VALID_TAGS="([^"]+)"/);
  if (!match) return [];
  return match[1].split(/\s+/).filter(Boolean);
}

function parseCommitHookFormat(content: string): string {
  // Extract format description from comment or echo lines
  const formatMatch = content.match(/Format:\s*(.+)$/m);
  if (formatMatch) return formatMatch[1].trim();
  return '[TAG] scope: message';
}

// ─── Item builders ──────────────────────────────────────────────────

function buildRtkItem(rootDir: string): ContractItem | undefined {
  // RTK wrapper is documented in AGENTS.md or docs/rules/
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

function buildCommitFormatItem(rootDir: string): ContractItem | undefined {
  const hookPath = '.githooks/commit-msg';
  const hookContent = safeReadFile(path.join(rootDir, hookPath));
  if (!hookContent) return undefined;

  const hookSource = makeSource(rootDir, hookPath);
  if (!hookSource) return undefined;

  const tags = parseCommitHookTags(hookContent);
  const format = parseCommitHookFormat(hookContent);

  return {
    id: 'commit-format',
    category: 'commit',
    severity: 'critical',
    content: `Commit messages must use ${format} format with uppercase tags.`,
    metadata: { validTags: tags },
    sources: [hookSource],
  };
}

function buildTestEntryItem(rootDir: string): ContractItem | undefined {
  // Check package.json for test script
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

  // Check commit tag case: hook enforces uppercase, docs might show lowercase
  const hookContent = safeReadFile(path.join(rootDir, '.githooks/commit-msg'));
  const agentsContent = safeReadFile(path.join(rootDir, 'AGENTS.md'));

  if (hookContent && agentsContent) {
    const hookTags = parseCommitHookTags(hookContent);
    const hasUppercase = hookTags.every((tag) => tag === tag.toUpperCase());
    if (hasUppercase && hookTags.length > 0) {
      // Check if AGENTS.md or other docs reference lowercase tags
      const lowerCaseRef = agentsContent.match(/\b(feat|fix|docs|test|refactor|config)\b/i);
      if (lowerCaseRef) {
        conflicts.push({
          id: 'commit-tag-case',
          severity: 'medium',
          description: 'Commit tag case mismatch between hook and documentation',
          sources: [
            { file: '.githooks/commit-msg', value: hookTags.join(' ') },
            { file: 'AGENTS.md', value: lowerCaseRef[0] },
          ],
          recommendation: 'Hook enforces uppercase tags; documentation should align with hook enforcement.',
        });
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
  const snapshots: SourceSnapshot[] = [];

  // Collect source snapshots for known source files
  const knownSources = [
    'AGENTS.md',
    '.githooks/commit-msg',
    'package.json',
    'docs/rules/testing.md',
    'vitest.config.ts',
  ];

  for (const relPath of knownSources) {
    const snapshot = makeSnapshot(rootDir, relPath);
    if (snapshot) snapshots.push(snapshot);
  }

  // Build contract items
  const rtkItem = buildRtkItem(rootDir);
  if (rtkItem) items.push(rtkItem);

  const commitItem = buildCommitFormatItem(rootDir);
  if (commitItem) items.push(commitItem);

  const testItem = buildTestEntryItem(rootDir);
  if (testItem) items.push(testItem);

  const queryItem = buildQueryPriorityItem(rootDir);
  if (queryItem) items.push(queryItem);

  const validationItem = buildRealScenarioValidationItem(rootDir);
  if (validationItem) items.push(validationItem);

  // Detect conflicts
  const conflicts = detectConflicts(rootDir);

  // Determine project profile
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
