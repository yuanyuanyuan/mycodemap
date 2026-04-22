import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

function resolveGsdToolsPath(): string {
  const candidates = [
    path.join(repoRoot, '.claude/get-shit-done/bin/gsd-tools.cjs'),
    path.join(process.env.HOME ?? '', '.claude/get-shit-done/bin/gsd-tools.cjs'),
    path.join(process.env.HOME ?? '', '.codex/get-shit-done/bin/gsd-tools.cjs'),
  ];

  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

const gsdToolsPath = resolveGsdToolsPath();

function write(root: string, relativePath: string, content: string): void {
  const fullPath = path.join(root, relativePath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content);
}

function createFollowupFixture(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'codemap-gsd-followup-'));

  write(root, '.planning/config.json', JSON.stringify({ commit_docs: true }, null, 2));
  write(root, '.planning/PROJECT.md', '# Project\n');
  write(root, '.planning/REQUIREMENTS.md', '# Requirements\n\n- [x] **ARC-01**: Follow-up requirement fixture\n');
  write(root, '.planning/STATE.md', `---
gsd_state_version: 1.0
milestone: post-v1.4
milestone_name: arcadedb-node-feasibility-follow-up
current_phase: 21
current_phase_name: evaluate arcadedb node integration feasibility
status: completed
last_updated: "2026-03-28T16:58:58+08:00"
last_activity: 2026-03-28
progress:
  total_phases: 1
  completed_phases: 1
  total_plans: 2
  completed_plans: 2
  percent: 100
---

# Session State
`);
  write(root, '.planning/ROADMAP.md', `# Roadmap: Fixture

## Milestones

- ✅ **v1.4 设计契约与 Agent Handoff** — Phases 17-20 (shipped 2026-03-26)
- ✅ **post-v1.4 ArcadeDB Node feasibility follow-up** — Phase 21 (completed 2026-03-28)

## Overview

Fixture roadmap for follow-up milestone parsing.

## post-v1.4 ArcadeDB Node feasibility follow-up

## Phases

- [x] **Phase 21: Evaluate ArcadeDB Node integration feasibility** - current follow-up scope

### Phase 21: Evaluate ArcadeDB Node integration feasibility
**Goal**: Validate a post-v1.4 follow-up without folding it back into v1.4
**Depends on**: \`v1.4\` shipped
**Plans**: 2 plans completed on active surface
`);
  write(root, '.planning/MILESTONES.md', `# Project Milestones: Fixture

## post-v1.4 ArcadeDB Node feasibility follow-up (Shipped: 2026-03-28)

**Delivered:** Follow-up fixture

---

## v1.4 设计契约与 Agent Handoff (Shipped: 2026-03-26)

**Delivered:** Prior milestone fixture

---
`);

  for (const phase of ['17-design-contract-surface', '18-design-to-code-mapping', '19-handoff-package-human-gates', '20-design-drift-verification-docs-sync']) {
    const phaseNumber = phase.split('-')[0];
    write(root, `.planning/phases/${phase}/${phaseNumber}-01-PLAN.md`, `# ${phaseNumber}-01 Plan\n`);
    write(root, `.planning/phases/${phase}/${phaseNumber}-01-SUMMARY.md`, `# ${phaseNumber}-01 Summary\n`);
  }

  write(root, '.planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-01-PLAN.md', '# 21-01 Plan\n');
  write(root, '.planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-02-PLAN.md', '# 21-02 Plan\n');
  write(root, '.planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-01-SUMMARY.md', '# 21-01 Summary\n');
  write(root, '.planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-02-SUMMARY.md', '# 21-02 Summary\n');

  return root;
}

function runGsd(root: string, args: string[]): unknown {
  return JSON.parse(execFileSync('node', [gsdToolsPath, ...args, '--raw'], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'pipe',
  }));
}

describe('gsd follow-up milestone routing', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) rmSync(root, { recursive: true, force: true });
    }
  });

  it('keeps post-v milestone identity in init milestone-op', () => {
    const root = createFollowupFixture();
    tempRoots.push(root);

    const result = runGsd(root, ['init', 'milestone-op']) as {
      milestone_version: string;
      milestone_name: string;
      phase_count: number;
      completed_phases: number;
    };

    expect(result.milestone_version).toBe('post-v1.4');
    expect(result.milestone_name).toBe('ArcadeDB Node feasibility follow-up');
    expect(result.phase_count).toBe(1);
    expect(result.completed_phases).toBe(1);
  });

  it('filters progress output to the active follow-up phase only', () => {
    const root = createFollowupFixture();
    tempRoots.push(root);

    const result = runGsd(root, ['progress']) as {
      milestone_version: string;
      milestone_name: string;
      phases: Array<{ number: string }>;
      total_plans: number;
      total_summaries: number;
    };

    expect(result.milestone_version).toBe('post-v1.4');
    expect(result.milestone_name).toBe('ArcadeDB Node feasibility follow-up');
    expect(result.phases.map(phase => phase.number)).toEqual(['21']);
    expect(result.total_plans).toBe(2);
    expect(result.total_summaries).toBe(2);
  });

  it('reports the follow-up milestone label in roadmap analyze', () => {
    const root = createFollowupFixture();
    tempRoots.push(root);

    const result = runGsd(root, ['roadmap', 'analyze']) as {
      milestones: Array<{ heading: string; version: string }>;
      phase_count: number;
    };

    expect(result.milestones).toEqual([
      {
        heading: 'post-v1.4 ArcadeDB Node feasibility follow-up',
        version: 'post-v1.4',
      },
    ]);
    expect(result.phase_count).toBe(1);
  });

  it('archives follow-up milestones without forcing a v-prefix', () => {
    const root = createFollowupFixture();
    tempRoots.push(root);

    const result = runGsd(root, ['milestone', 'complete', 'post-v1.4', '--name', 'ArcadeDB Node feasibility follow-up']) as {
      version: string;
      archived: {
        roadmap: boolean;
        requirements: boolean;
      };
    };

    expect(result.version).toBe('post-v1.4');
    expect(result.archived.roadmap).toBe(true);
    expect(result.archived.requirements).toBe(true);
    expect(() => runGsd(root, ['roadmap', 'analyze'])).not.toThrow();

    const archivedRoadmap = path.join(root, '.planning/milestones/post-v1.4-ROADMAP.md');
    const archivedRequirements = path.join(root, '.planning/milestones/post-v1.4-REQUIREMENTS.md');
    const wrongPrefixedRoadmap = path.join(root, '.planning/milestones/vpost-v1.4-ROADMAP.md');

    expect(existsSync(archivedRoadmap)).toBe(true);
    expect(existsSync(archivedRequirements)).toBe(true);
    expect(existsSync(wrongPrefixedRoadmap)).toBe(false);
  });

  it('surfaces dormant seeds and keeps post-v follow-up as latest completed milestone in init new-milestone', () => {
    const root = createFollowupFixture();
    tempRoots.push(root);

    write(root, '.planning/seeds/SEED-001-evaluate-isolated-arcadedb-server-backed-prototype.md', `---
id: SEED-001
status: dormant
planted: 2026-03-28
planted_during: post-v1.4 milestone archive
trigger_when: A future milestone explicitly needs server-backed graph storage evidence
scope: Large
---

# SEED-001: Evaluate isolated ArcadeDB server-backed prototype
`);
    write(root, '.planning/seeds/SEED-002-old-seed.md', `---
id: SEED-002
status: consumed
planted: 2026-03-20
trigger_when: Old trigger
scope: Medium
---

# SEED-002: Old seed
`);

    const result = runGsd(root, ['init', 'new-milestone']) as {
      latest_completed_milestone: string;
      latest_completed_milestone_name: string;
      phase_archive_path: string;
      available_seed_count: number;
      available_seeds: Array<{
        id: string;
        status: string;
        title: string;
        trigger_when: string;
        scope: string;
        planted: string;
        planted_during: string;
        path: string;
      }>;
    };

    expect(result.latest_completed_milestone).toBe('post-v1.4');
    expect(result.latest_completed_milestone_name).toBe('ArcadeDB Node feasibility follow-up');
    expect(result.phase_archive_path).toBe('.planning/milestones/post-v1.4-phases');
    expect(result.available_seed_count).toBe(1);
    expect(result.available_seeds).toEqual([
      {
        id: 'SEED-001',
        status: 'dormant',
        title: 'Evaluate isolated ArcadeDB server-backed prototype',
        trigger_when: 'A future milestone explicitly needs server-backed graph storage evidence',
        scope: 'Large',
        planted: '2026-03-28',
        planted_during: 'post-v1.4 milestone archive',
        path: '.planning/seeds/SEED-001-evaluate-isolated-arcadedb-server-backed-prototype.md',
      },
    ]);
    expect(result.matching_seed_count).toBe(0);
    expect(result.matching_seeds).toEqual([]);
  });

  it('pre-ranks matching dormant seeds when new milestone hint is provided', () => {
    const root = createFollowupFixture();
    tempRoots.push(root);

    write(root, '.planning/seeds/SEED-001-evaluate-isolated-arcadedb-server-backed-prototype.md', `---
id: SEED-001
status: dormant
planted: 2026-03-28
planted_during: post-v1.4 milestone archive
trigger_when: A future milestone explicitly needs server-backed graph storage evidence and ArcadeDB prototype validation
scope: Large
---

# SEED-001: Evaluate isolated ArcadeDB server-backed prototype
`);
    write(root, '.planning/seeds/SEED-002-kuzu-docs-cleanup.md', `---
id: SEED-002
status: dormant
planted: 2026-03-20
trigger_when: When docs cleanup becomes the main milestone
scope: Small
---

# SEED-002: Clean up kuzu docs drift
`);

    const result = runGsd(root, ['init', 'new-milestone', 'ArcadeDB', 'server-backed', 'prototype']) as {
      seed_match_query: string;
      matching_seed_count: number;
      matching_seeds: Array<{
        id: string;
        match_score: number;
        matched_terms: string[];
        title: string;
      }>;
    };

    expect(result.seed_match_query).toBe('ArcadeDB server-backed prototype');
    expect(result.matching_seed_count).toBe(1);
    expect(result.matching_seeds).toEqual([
      {
        id: 'SEED-001',
        status: 'dormant',
        title: 'Evaluate isolated ArcadeDB server-backed prototype',
        trigger_when: 'A future milestone explicitly needs server-backed graph storage evidence and ArcadeDB prototype validation',
        scope: 'Large',
        planted: '2026-03-28',
        planted_during: 'post-v1.4 milestone archive',
        path: '.planning/seeds/SEED-001-evaluate-isolated-arcadedb-server-backed-prototype.md',
        matched_terms: ['arcadedb', 'server', 'backed', 'prototype'],
        match_score: 4,
      },
    ]);
  });
});
