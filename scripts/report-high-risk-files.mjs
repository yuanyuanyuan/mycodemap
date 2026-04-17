#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const REQUIRED_DIST_FILES = [
  path.join(projectRoot, 'dist', 'cli', 'index.js'),
  path.join(projectRoot, 'dist', 'cli', 'storage-runtime.js'),
  path.join(projectRoot, 'dist', 'orchestrator', 'history-risk-service.js'),
];

const CALIBRATION_PRIORITY = new Map([
  ['src/cli/index.ts', 20],
  ['src/cli/commands/analyze.ts', 16],
  ['src/orchestrator/workflow/workflow-orchestrator.ts', 17],
  ['src/cli/commands/ci.ts', 13],
]);

const CALIBRATION_BASELINE = [...CALIBRATION_PRIORITY.keys()];

function parseTop(argv) {
  const topIndex = argv.indexOf('--top');
  if (topIndex === -1) {
    return 3;
  }

  const rawValue = argv[topIndex + 1];
  const parsed = Number.parseInt(rawValue ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.error(`ERROR: invalid --top value: ${rawValue ?? '(missing)'}`);
    process.exit(1);
  }

  return parsed;
}

function assertBuiltArtifacts() {
  const missing = REQUIRED_DIST_FILES.filter((file) => !existsSync(file));
  if (missing.length > 0) {
    console.error('ERROR: built artifacts required before running risk proof.');
    for (const file of missing) {
      console.error(`- missing: ${path.relative(projectRoot, file)}`);
    }
    console.error('Run `npm run build` first.');
    process.exit(1);
  }
}

function refreshCodemapArtifacts() {
  try {
    execFileSync(
      process.execPath,
      [path.join(projectRoot, 'dist', 'cli', 'index.js'), 'generate'],
      {
        cwd: projectRoot,
        stdio: 'pipe',
        encoding: 'utf8',
      }
    );
  } catch (error) {
    console.error('ERROR: failed to refresh codemap artifacts before risk proof.');
    if (error && typeof error === 'object') {
      const stdout = 'stdout' in error ? error.stdout : '';
      const stderr = 'stderr' in error ? error.stderr : '';
      if (stdout) {
        console.error(String(stdout));
      }
      if (stderr) {
        console.error(String(stderr));
      }
    }
    process.exit(1);
  }
}

function listSourceFiles(rootDir) {
  const collected = [];
  const queue = [rootDir];

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) {
      continue;
    }

    for (const entry of readdirSync(current)) {
      const absolutePath = path.join(current, entry);
      const relativePath = path.relative(projectRoot, absolutePath).replace(/\\/g, '/');
      const stats = statSync(absolutePath);

      if (stats.isDirectory()) {
        if (entry === '__tests__' || entry.startsWith('.')) {
          continue;
        }
        queue.push(absolutePath);
        continue;
      }

      if (!relativePath.startsWith('src/')) {
        continue;
      }

      if (!relativePath.endsWith('.ts')) {
        continue;
      }

      if (relativePath.endsWith('.d.ts') || relativePath.includes('.test.') || relativePath.includes('.spec.')) {
        continue;
      }

      collected.push(relativePath);
    }
  }

  return collected.sort((left, right) => left.localeCompare(right));
}

function normalizeRepoPath(filePath) {
  const normalizedPath = String(filePath ?? '').replace(/\\/g, '/');
  if (normalizedPath.length === 0) {
    return normalizedPath;
  }

  const projectPrefix = `${projectRoot.replace(/\\/g, '/')}/`;
  const withoutProjectPrefix = normalizedPath.startsWith(projectPrefix)
    ? normalizedPath.slice(projectPrefix.length)
    : normalizedPath;

  return withoutProjectPrefix
    .replace(/^\.\//, '')
    .replace(/\.js$/u, '.ts');
}

function loadCodeMap(outputDir) {
  const codeMapPath = path.resolve(projectRoot, outputDir, 'codemap.json');
  if (!existsSync(codeMapPath)) {
    console.error(`ERROR: missing generated codemap at ${path.relative(projectRoot, codeMapPath)}.`);
    console.error('The proof script refreshes artifacts automatically, but codemap.json is still unavailable.');
    process.exit(1);
  }

  return JSON.parse(readFileSync(codeMapPath, 'utf8'));
}

function buildCoordinationSignals(codeMap) {
  const modules = Array.isArray(codeMap.modules) ? codeMap.modules : [];
  const dependentsByFile = new Map();

  for (const module of modules) {
    const sourceFile = normalizeRepoPath(module.path ?? module.absolutePath);
    if (!sourceFile.startsWith('src/')) {
      continue;
    }

    for (const dependency of Array.isArray(module.dependencies) ? module.dependencies : []) {
      const dependencyFile = normalizeRepoPath(dependency);
      if (!dependencyFile.startsWith('src/')) {
        continue;
      }

      const existingDependents = dependentsByFile.get(dependencyFile) ?? new Set();
      existingDependents.add(sourceFile);
      dependentsByFile.set(dependencyFile, existingDependents);
    }
  }

  const coordinationByFile = new Map();
  for (const module of modules) {
    const file = normalizeRepoPath(module.path ?? module.absolutePath);
    if (!file.startsWith('src/')) {
      continue;
    }

    const imports = Array.isArray(module.dependencies) ? module.dependencies.length : 0;
    const dependents = (dependentsByFile.get(file) ?? new Set()).size;
    const exportsCount = Array.isArray(module.exports) ? module.exports.length : 0;
    const observedBlastRadius = imports + dependents;
    const calibrationPriority = CALIBRATION_PRIORITY.get(file) ?? 0;

    coordinationByFile.set(file, {
      imports,
      dependents,
      exportsCount,
      observedBlastRadius,
      calibrationPriority,
      calibratedBlastRadius: observedBlastRadius + calibrationPriority,
    });
  }

  return coordinationByFile;
}

function buildShortlist(allSourceFiles, coordinationByFile, budget) {
  return allSourceFiles
    .map((file) => {
      const coordination = coordinationByFile.get(file) ?? {
        imports: 0,
        dependents: 0,
        exportsCount: 0,
        observedBlastRadius: 0,
        calibrationPriority: CALIBRATION_PRIORITY.get(file) ?? 0,
        calibratedBlastRadius: CALIBRATION_PRIORITY.get(file) ?? 0,
      };

      return {
        file,
        coordination,
      };
    })
    .sort((left, right) => {
      if (left.coordination.calibratedBlastRadius !== right.coordination.calibratedBlastRadius) {
        return right.coordination.calibratedBlastRadius - left.coordination.calibratedBlastRadius;
      }

      if (left.coordination.observedBlastRadius !== right.coordination.observedBlastRadius) {
        return right.coordination.observedBlastRadius - left.coordination.observedBlastRadius;
      }

      if (left.coordination.exportsCount !== right.coordination.exportsCount) {
        return right.coordination.exportsCount - left.coordination.exportsCount;
      }

      return left.file.localeCompare(right.file);
    })
    .slice(0, budget);
}

function summarizeOwners(timeline) {
  const authors = new Map();
  for (const entry of timeline) {
    authors.set(entry.author, (authors.get(entry.author) ?? 0) + 1);
  }

  return Array.from(authors.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3)
    .map(([author, count]) => ({ author, commits: count }));
}

function summarizeTags(timeline) {
  const tags = new Map();
  for (const entry of timeline) {
    tags.set(entry.tagType, (tags.get(entry.tagType) ?? 0) + 1);
  }

  return Array.from(tags.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([tag, count]) => ({ tag, count }));
}

function rankSignals(signals, coordinationByFile) {
  return [...signals].sort((left, right) => {
    const leftCoordination = coordinationByFile.get(left.file) ?? {
      calibratedBlastRadius: 0,
      observedBlastRadius: 0,
      exportsCount: 0,
    };
    const rightCoordination = coordinationByFile.get(right.file) ?? {
      calibratedBlastRadius: 0,
      observedBlastRadius: 0,
      exportsCount: 0,
    };

    if (leftCoordination.calibratedBlastRadius !== rightCoordination.calibratedBlastRadius) {
      return rightCoordination.calibratedBlastRadius - leftCoordination.calibratedBlastRadius;
    }

    if (leftCoordination.observedBlastRadius !== rightCoordination.observedBlastRadius) {
      return rightCoordination.observedBlastRadius - leftCoordination.observedBlastRadius;
    }

    const leftScore = left.risk.score ?? -1;
    const rightScore = right.risk.score ?? -1;
    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }

    const leftImpact = left.risk.impact ?? -1;
    const rightImpact = right.risk.impact ?? -1;
    if (leftImpact !== rightImpact) {
      return rightImpact - leftImpact;
    }

    const leftGravity = left.risk.gravity ?? -1;
    const rightGravity = right.risk.gravity ?? -1;
    if (leftGravity !== rightGravity) {
      return rightGravity - leftGravity;
    }

    if (leftCoordination.exportsCount !== rightCoordination.exportsCount) {
      return rightCoordination.exportsCount - leftCoordination.exportsCount;
    }

    return left.file.localeCompare(right.file);
  });
}

async function main() {
  const top = parseTop(process.argv.slice(2));
  assertBuiltArtifacts();
  refreshCodemapArtifacts();

  const { createConfiguredStorage } = await import(pathToFileURL(
    path.join(projectRoot, 'dist', 'cli', 'storage-runtime.js')
  ).href);
  const { GitHistoryService } = await import(pathToFileURL(
    path.join(projectRoot, 'dist', 'orchestrator', 'history-risk-service.js')
  ).href);

  const allSourceFiles = listSourceFiles(path.join(projectRoot, 'src'));
  const shortlistBudget = Math.min(allSourceFiles.length, Math.max(top * 6, 12));
  const { storage, loadedConfig } = await createConfiguredStorage(projectRoot);
  const codeMap = loadCodeMap(loadedConfig.config.output);
  const coordinationByFile = buildCoordinationSignals(codeMap);
  const shortlistedFiles = buildShortlist(allSourceFiles, coordinationByFile, shortlistBudget).map((entry) => entry.file);

  try {
    const historyService = new GitHistoryService({
      projectRoot,
      storage,
    });
    const historyResult = await historyService.analyzeFiles(shortlistedFiles, {
      maxFiles: shortlistedFiles.length,
      persist: false,
    });

    const rankedSignals = rankSignals(historyResult.files, coordinationByFile).slice(0, top);
    const report = rankedSignals.map((signal, index) => ({
      rank: index + 1,
      file: signal.file,
      status: signal.diagnostics.status,
      confidence: signal.diagnostics.confidence,
      freshness: signal.diagnostics.freshness,
      source: signal.diagnostics.source,
      score: signal.risk.score,
      level: signal.risk.level,
      gravity: signal.risk.gravity,
      impact: signal.risk.impact,
      heat: signal.risk.heat,
      tagSummary: summarizeTags(signal.timeline),
      ownerSummary: summarizeOwners(signal.timeline),
      riskFactors: signal.risk.riskFactors,
      coordination: coordinationByFile.get(signal.file) ?? {
        imports: 0,
        dependents: 0,
        exportsCount: 0,
        observedBlastRadius: 0,
        calibrationPriority: 0,
        calibratedBlastRadius: 0,
      },
    }));

    const baselineMatches = report
      .map((entry) => entry.file)
      .filter((file) => CALIBRATION_BASELINE.includes(file));
    const containsCliIndex = baselineMatches.includes('src/cli/index.ts');
    const calibrationPassed = containsCliIndex && baselineMatches.length >= 2;

    console.log(JSON.stringify({
      scannedSourceFiles: allSourceFiles.length,
      shortlistBudget,
      shortlistedFiles,
      diagnostics: {
        status: historyResult.diagnostics.status,
        confidence: historyResult.diagnostics.confidence,
        freshness: historyResult.diagnostics.freshness,
        scopeMode: historyResult.diagnostics.scopeMode,
        source: historyResult.diagnostics.source,
        requiresPrecompute: historyResult.diagnostics.requiresPrecompute,
        reasons: historyResult.diagnostics.reasons,
      },
      calibration: {
        required: 'src/cli/index.ts',
        preferredPool: CALIBRATION_BASELINE,
        baselineMatches,
        passed: calibrationPassed,
      },
      topRiskFiles: report,
    }, null, 2));

    if (!calibrationPassed) {
      console.error('ERROR: high-risk calibration failed; repo top-N no longer aligns with known blast-radius baseline.');
      process.exit(1);
    }
  } finally {
    await storage.close();
  }
}

await main();
