#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function readText(relativePath) {
  const absolutePath = path.join(process.cwd(), relativePath);
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf8') : '';
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/u);
  if (!match) {
    return {};
  }

  const result = {};
  for (const line of match[1].split(/\r?\n/u)) {
    if (!line || line.startsWith(' ') || !line.includes(':')) {
      continue;
    }

    const separatorIndex = line.indexOf(':');
    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    result[key] = rawValue.replace(/^"(.*)"$/u, '$1');
  }
  return result;
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
}

function readState() {
  return parseFrontmatter(readText('.planning/STATE.md'));
}

function readRoadmap() {
  return readText('.planning/ROADMAP.md');
}

function findMilestoneHeading(roadmap, version) {
  const matches = roadmap.matchAll(/^- \S+\s+\*\*([^*]+)\*\*/gmu);
  for (const match of matches) {
    const heading = match[1]?.trim();
    if (heading && heading.startsWith(`${version} `)) {
      return heading;
    }
  }

  const headingMatch = roadmap.match(new RegExp(`^##\\s+(${escapeRegExp(version)}\\s+.+)$`, 'mu'));
  return headingMatch?.[1]?.trim() ?? version;
}

function milestoneNameFromHeading(heading, version) {
  if (heading.startsWith(`${version} `)) {
    return heading.slice(version.length).trim();
  }
  return heading;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function findPhaseDir(phaseNumber) {
  const phasesRoot = path.join(process.cwd(), '.planning/phases');
  if (!fs.existsSync(phasesRoot)) {
    return null;
  }

  for (const entry of fs.readdirSync(phasesRoot, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name.startsWith(`${phaseNumber}-`)) {
      return entry.name;
    }
  }

  return null;
}

function countPhaseArtifacts(phaseDir) {
  if (!phaseDir) {
    return { plans: 0, summaries: 0 };
  }

  const absoluteDir = path.join(process.cwd(), '.planning/phases', phaseDir);
  const files = fs.existsSync(absoluteDir) ? fs.readdirSync(absoluteDir) : [];
  return {
    plans: files.filter((file) => file.endsWith('-PLAN.md')).length,
    summaries: files.filter((file) => file.endsWith('-SUMMARY.md')).length,
  };
}

function extractPhaseSection(roadmap, phaseNumber) {
  const pattern = new RegExp(
    `^###\\s+Phase\\s+${escapeRegExp(phaseNumber)}:\\s+(.+)$([\\s\\S]*?)(?=^###\\s+Phase\\s+\\d+:|$)`,
    'mu'
  );
  const match = roadmap.match(pattern);
  if (!match) {
    return null;
  }

  return {
    heading: match[1].trim(),
    body: match[2],
  };
}

function extractPhaseGoal(sectionBody) {
  return sectionBody.match(/^\*\*Goal\*\*:\s*(.+)$/mu)?.[1]?.trim() ?? null;
}

function extractPhaseDependsOn(sectionBody) {
  return sectionBody.match(/^\*\*Depends on\*\*:\s*(.+)$/mu)?.[1]?.trim() ?? null;
}

function listDormantSeeds() {
  const seedsRoot = path.join(process.cwd(), '.planning/seeds');
  if (!fs.existsSync(seedsRoot)) {
    return [];
  }

  return fs.readdirSync(seedsRoot)
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const relativePath = `.planning/seeds/${file}`;
      const text = readText(relativePath);
      const frontmatter = parseFrontmatter(text);
      const title = text.match(/^#\s+(?:SEED-[^:]+:\s+)?(.+)$/mu)?.[1]?.trim() ?? file;
      return {
        id: frontmatter.id,
        status: frontmatter.status,
        title,
        trigger_when: frontmatter.trigger_when,
        scope: frontmatter.scope,
        planted: frontmatter.planted,
        planted_during: frontmatter.planted_during,
        path: relativePath,
      };
    })
    .filter((seed) => seed.status === 'dormant')
    .sort((left, right) => left.id.localeCompare(right.id));
}

function rankSeeds(seeds, query) {
  const terms = Array.from(new Set(
    query.toLowerCase().split(/[^a-z0-9]+/u).filter(Boolean)
  ));

  return seeds
    .map((seed) => {
      const haystack = `${seed.title} ${seed.trigger_when}`.toLowerCase();
      const matchedTerms = terms.filter((term) => haystack.includes(term));
      return {
        ...seed,
        matched_terms: matchedTerms,
        match_score: matchedTerms.length,
      };
    })
    .filter((seed) => seed.match_score > 0)
    .sort((left, right) => right.match_score - left.match_score || left.id.localeCompare(right.id));
}

function buildMilestoneOp() {
  const state = readState();
  const roadmap = readRoadmap();
  const version = state.milestone;
  const heading = findMilestoneHeading(roadmap, version);
  const name = milestoneNameFromHeading(heading, version);

  return {
    commit_docs: readConfig().commit_docs,
    milestone_version: version,
    milestone_name: name,
    milestone_slug: slugify(name),
    phase_count: state.current_phase ? 1 : 0,
    completed_phases: state.status === 'completed' && state.current_phase ? 1 : 0,
    all_phases_complete: state.status === 'completed',
    archived_milestones: [],
    archive_count: 0,
    project_exists: fs.existsSync(path.join(process.cwd(), '.planning/PROJECT.md')),
    roadmap_exists: fs.existsSync(path.join(process.cwd(), '.planning/ROADMAP.md')),
    state_exists: fs.existsSync(path.join(process.cwd(), '.planning/STATE.md')),
    archive_exists: fs.existsSync(path.join(process.cwd(), '.planning/milestones')),
    phases_dir_exists: fs.existsSync(path.join(process.cwd(), '.planning/phases')),
    project_root: process.cwd(),
    agents_installed: true,
    missing_agents: [],
    project_title: readText('.planning/PROJECT.md').match(/^#\s+(.+)$/mu)?.[1] ?? 'Project',
  };
}

function buildProgress() {
  const state = readState();
  const phaseDir = findPhaseDir(state.current_phase);
  const counts = countPhaseArtifacts(phaseDir);
  const phaseName = state.current_phase_name ?? phaseDir?.replace(/^\d+-/u, '').replace(/-/gu, ' ') ?? '';
  const roadmap = readRoadmap();
  const heading = findMilestoneHeading(roadmap, state.milestone);

  return {
    milestone_version: state.milestone,
    milestone_name: milestoneNameFromHeading(heading, state.milestone),
    phases: state.current_phase ? [{
      number: state.current_phase,
      name: phaseName,
      plans: counts.plans,
      summaries: counts.summaries,
      status: state.status === 'completed' ? 'Executed' : 'In Progress',
    }] : [],
    total_plans: counts.plans,
    total_summaries: counts.summaries,
    percent: Number(state.percent ?? state.progress_percent ?? 100) || 100,
  };
}

function buildRoadmapAnalyze() {
  const state = readState();
  const roadmap = readRoadmap();
  const heading = findMilestoneHeading(roadmap, state.milestone);
  const phaseDir = findPhaseDir(state.current_phase);
  const counts = countPhaseArtifacts(phaseDir);
  const section = extractPhaseSection(roadmap, state.current_phase);

  return {
    milestones: [{
      heading,
      version: state.milestone,
    }],
    phases: state.current_phase ? [{
      number: state.current_phase,
      name: section?.heading ?? state.current_phase_name ?? '',
      goal: section ? extractPhaseGoal(section.body) : null,
      depends_on: section ? extractPhaseDependsOn(section.body) : null,
      plan_count: counts.plans,
      summary_count: counts.summaries,
      has_context: fs.existsSync(path.join(process.cwd(), `.planning/phases/${phaseDir}/${state.current_phase}-CONTEXT.md`)),
      has_research: fs.existsSync(path.join(process.cwd(), `.planning/phases/${phaseDir}/${state.current_phase}-RESEARCH.md`)),
      disk_status: state.status === 'completed' ? 'complete' : 'incomplete',
      roadmap_complete: state.status === 'completed',
    }] : [],
    phase_count: state.current_phase ? 1 : 0,
    completed_phases: state.status === 'completed' && state.current_phase ? 1 : 0,
    total_plans: counts.plans,
    total_summaries: counts.summaries,
    progress_percent: 100,
    current_phase: state.status === 'completed' ? null : state.current_phase,
    next_phase: null,
    missing_phase_details: null,
  };
}

function readConfig() {
  const configPath = path.join(process.cwd(), '.planning/config.json');
  if (!fs.existsSync(configPath)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function buildNewMilestone(extraArgs) {
  const state = readState();
  const roadmap = readRoadmap();
  const heading = findMilestoneHeading(roadmap, state.milestone);
  const name = milestoneNameFromHeading(heading, state.milestone);
  const seeds = listDormantSeeds();
  const seedQuery = extraArgs.join(' ').trim();
  const matchingSeeds = seedQuery ? rankSeeds(seeds, seedQuery) : [];
  const phasesRoot = path.join(process.cwd(), '.planning/phases');
  const phaseDirCount = fs.existsSync(phasesRoot)
    ? fs.readdirSync(phasesRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).length
    : 0;

  return {
    researcher_model: 'sonnet',
    synthesizer_model: 'sonnet',
    roadmapper_model: 'sonnet',
    commit_docs: readConfig().commit_docs,
    research_enabled: true,
    current_milestone: state.milestone,
    current_milestone_name: name,
    latest_completed_milestone: state.milestone,
    latest_completed_milestone_name: name,
    phase_dir_count: phaseDirCount,
    phase_archive_path: `.planning/milestones/${state.milestone}-phases`,
    project_exists: fs.existsSync(path.join(process.cwd(), '.planning/PROJECT.md')),
    roadmap_exists: fs.existsSync(path.join(process.cwd(), '.planning/ROADMAP.md')),
    state_exists: fs.existsSync(path.join(process.cwd(), '.planning/STATE.md')),
    project_path: '.planning/PROJECT.md',
    roadmap_path: '.planning/ROADMAP.md',
    state_path: '.planning/STATE.md',
    project_root: process.cwd(),
    agents_installed: true,
    missing_agents: [],
    project_title: readText('.planning/PROJECT.md').match(/^#\s+(.+)$/mu)?.[1] ?? 'Project',
    available_seed_count: seeds.length,
    available_seeds: seeds,
    matching_seed_count: matchingSeeds.length,
    matching_seeds: matchingSeeds,
    ...(seedQuery ? { seed_match_query: seedQuery } : {}),
  };
}

function findDelegateTarget() {
  const candidates = [
    path.join(process.env.HOME ?? '', '.claude/get-shit-done/bin/gsd-tools.cjs'),
    path.join(process.env.HOME ?? '', '.codex/get-shit-done/bin/gsd-tools.cjs'),
  ];

  return candidates.find((candidate) => candidate && fs.existsSync(candidate));
}

function delegate(args) {
  const target = findDelegateTarget();
  if (!target) {
    console.error('Missing fallback gsd-tools.cjs in $HOME/.claude or $HOME/.codex');
    process.exit(1);
  }

  try {
    const stdout = execFileSync(process.execPath, [target, ...args], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    process.stdout.write(stdout);
  } catch (error) {
    if (error.stdout) {
      process.stdout.write(error.stdout);
    }
    if (error.stderr) {
      process.stderr.write(error.stderr);
    }
    process.exit(error.status || 1);
  }
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

const rawArgs = process.argv.slice(2);
const args = rawArgs.filter((arg) => arg !== '--raw');
const state = readState();
const isFollowupMilestone = state.milestone?.startsWith('post-v');

if (!rawArgs.includes('--raw') || !isFollowupMilestone) {
  delegate(rawArgs);
  process.exit(0);
}

if (args[0] === 'init' && args[1] === 'milestone-op') {
  printJson(buildMilestoneOp());
  process.exit(0);
}

if (args[0] === 'progress') {
  printJson(buildProgress());
  process.exit(0);
}

if (args[0] === 'roadmap' && args[1] === 'analyze') {
  printJson(buildRoadmapAnalyze());
  process.exit(0);
}

if (args[0] === 'init' && args[1] === 'new-milestone') {
  printJson(buildNewMilestone(args.slice(2)));
  process.exit(0);
}

delegate(rawArgs);
