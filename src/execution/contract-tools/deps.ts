// [META] since:2026-05-06 | owner:orchestrator-team | stable:false
// [WHY] Shared direct-execution truth for deps so CLI and orchestration stop depending on a CLI-local implementation

import path from 'node:path';
import chalk from 'chalk';
import type { CodeMap, ModuleInfo, SourceLocation } from '../../types/index.js';
import type { UnifiedResult, HeatScore } from '../../orchestrator/types.js';
import { loadCodeMapRuntime } from '../../cli/storage-runtime.js';
import {
  createContractError,
  createContractSuccess,
  normalizeExecutionError,
  type ContractToolExecutionResult,
} from './types.js';

export interface DepsOptions {
  module?: string;
  json?: boolean;
  human?: boolean;
  structured?: boolean;
}

export interface DepsArgs {
  targets: string[];
}

export interface DepsModuleInfo {
  path: string;
  relativePath: string;
  dependencies: string[];
  dependents: string[];
  dependentsMap?: Array<{
    id: string;
    path: string;
  }>;
}

export interface DepsResult {
  modules: DepsModuleInfo[];
  allDependencies?: Array<{
    path: string;
    count: number;
    type: string;
  }>;
}

export interface DepsOutputData {
  module?: {
    path: string;
    relativePath: string;
    location: SourceLocation;
    dependencies: string[];
    dependents: string[];
    dependentsMap?: Array<{ id: string; path: string }>;
  };
  allDependencies?: Record<string, { type: string; count: number }>;
  modules?: Array<{
    path: string;
    relativePath: string;
    location: SourceLocation;
    type: string;
    count: number;
  }>;
}

function getModuleDependencies(codeMap: CodeMap, modulePath: string): {
  module: ModuleInfo | undefined;
  dependencies: string[];
  dependents: string[];
} {
  const module = codeMap.modules.find(candidate =>
    candidate.absolutePath.includes(modulePath)
      || path.relative(codeMap.project.rootDir, candidate.absolutePath).includes(modulePath)
  );

  if (!module) {
    return { module: undefined, dependencies: [], dependents: [] };
  }

  return {
    module,
    dependencies: module.dependencies,
    dependents: module.dependents,
  };
}

function buildDependentsMap(dependents: string[], codeMap: CodeMap): Array<{ id: string; path: string }> {
  return dependents.map(id => {
    const depModule = codeMap.modules.find(module => module.id === id);
    return {
      id,
      path: depModule ? path.relative(codeMap.project.rootDir, depModule.absolutePath) : id,
    };
  });
}

function buildLocation(filePath: string, line: number = 1, column: number = 1): SourceLocation {
  return { file: filePath, line, column };
}

function analyzeDeps(codeMap: CodeMap, modulePaths?: string[]): DepsResult {
  const modules: DepsModuleInfo[] = [];
  const allDependencies: Array<{ path: string; count: number; type: string }> = [];

  if (modulePaths && modulePaths.length > 0) {
    for (const modulePath of modulePaths) {
      const result = getModuleDependencies(codeMap, modulePath);
      if (!result.module) {
        continue;
      }
      modules.push({
        path: result.module.absolutePath,
        relativePath: path.relative(codeMap.project.rootDir, result.module.absolutePath),
        dependencies: result.dependencies,
        dependents: result.dependents,
        dependentsMap: buildDependentsMap(result.module.dependents, codeMap),
      });
    }
  } else {
    for (const module of codeMap.modules) {
      modules.push({
        path: module.absolutePath,
        relativePath: path.relative(codeMap.project.rootDir, module.absolutePath),
        dependencies: module.dependencies,
        dependents: module.dependents,
        dependentsMap: buildDependentsMap(module.dependents, codeMap),
      });
      allDependencies.push({
        path: module.absolutePath,
        count: module.dependencies.length,
        type: module.type,
      });
    }
    allDependencies.sort((left, right) => right.count - left.count);
  }

  return {
    modules,
    allDependencies: allDependencies.length > 0 ? allDependencies : undefined,
  };
}

function buildDepsData(
  codeMap: CodeMap,
  targetModule: ModuleInfo | undefined,
  allDependencies: Map<string, { type: string; count: number }>
): DepsOutputData {
  if (targetModule) {
    return {
      module: {
        path: targetModule.absolutePath,
        relativePath: path.relative(codeMap.project.rootDir, targetModule.absolutePath),
        location: buildLocation(path.relative(codeMap.project.rootDir, targetModule.absolutePath)),
        dependencies: targetModule.dependencies,
        dependents: targetModule.dependents,
        dependentsMap: buildDependentsMap(targetModule.dependents, codeMap),
      },
    };
  }

  return {
    allDependencies: Object.fromEntries(allDependencies),
    modules: Array.from(allDependencies.entries()).map(([modulePath, info]) => ({
      path: modulePath,
      relativePath: path.relative(codeMap.project.rootDir, modulePath),
      location: buildLocation(path.relative(codeMap.project.rootDir, modulePath)),
      ...info,
    })),
  };
}

export function formatDepsHuman(data: DepsOutputData): string {
  const lines: string[] = [];

  if (data.module) {
    lines.push(chalk.cyan(`\nModule: ${data.module.relativePath}`));
    lines.push(chalk.gray('-'.repeat(50)));
    lines.push(chalk.yellow('\nDependencies:'));
    if (data.module.dependencies.length === 0) {
      lines.push(chalk.gray('   none'));
    } else {
      for (const dep of data.module.dependencies) {
        lines.push(`   ${dep}`);
      }
    }

    lines.push(chalk.yellow('\nDependents:'));
    if (data.module.dependentsMap && data.module.dependentsMap.length > 0) {
      for (const dependent of data.module.dependentsMap) {
        lines.push(`   ${dependent.path}`);
      }
    } else if (data.module.dependents.length === 0) {
      lines.push(chalk.gray('   none'));
    } else {
      for (const dependent of data.module.dependents) {
        lines.push(`   ${dependent}`);
      }
    }

    lines.push(chalk.gray('-'.repeat(50)));
    lines.push(`   Dependencies: ${data.module.dependencies.length}, Dependents: ${data.module.dependents.length}`);
    return lines.join('\n');
  }

  lines.push(chalk.cyan('\nProject Dependency Analysis'));
  lines.push(chalk.gray('-'.repeat(50)));

  const moduleWidth = 50;
  const countWidth = 10;
  const typeWidth = 12;
  const header = 'MODULE'.padEnd(moduleWidth) + 'DEPS'.padEnd(countWidth) + 'TYPE'.padEnd(typeWidth);
  lines.push(chalk.yellow('\nModule Dependency Ranking (Top 20):'));
  lines.push(header);
  lines.push('-'.repeat(header.length));

  const modules = [...(data.modules ?? [])].sort((left, right) => right.count - left.count).slice(0, 20);
  let rank = 1;
  for (const module of modules) {
    const name = module.relativePath.substring(0, moduleWidth - 1).padEnd(moduleWidth);
    const count = String(module.count).padEnd(countWidth);
    lines.push(`${rank}. ${name}${count}${module.type.padEnd(typeWidth)}`);
    rank += 1;
  }

  const totalDependencies = Object.values(data.allDependencies ?? {}).reduce((sum, entry) => sum + entry.count, 0);
  lines.push(chalk.gray('-'.repeat(50)));
  lines.push(`   Total modules: ${data.modules?.length ?? 0}`);
  lines.push(`   Modules with deps: ${Object.keys(data.allDependencies ?? {}).length}`);
  lines.push(`   Total dependencies: ${totalDependencies}`);

  return lines.join('\n');
}

export async function executeDepsTool(
  options: DepsOptions,
  rootDir: string = process.cwd()
): Promise<ContractToolExecutionResult<DepsOutputData>> {
  const startedAt = performance.now();

  try {
    const runtime = await loadCodeMapRuntime(rootDir);
    const allDependencies = new Map<string, { type: string; count: number }>();
    let targetModule: ModuleInfo | undefined;

    if (options.module) {
      targetModule = getModuleDependencies(runtime.codeMap, options.module).module;
    } else {
      for (const module of runtime.codeMap.modules) {
        allDependencies.set(module.absolutePath, {
          type: module.type,
          count: module.dependencies.length,
        });
      }
    }

    return createContractSuccess(
      {
        tool: 'deps',
        rootDir,
        dataPath: runtime.dataPath,
        durationMs: performance.now() - startedAt,
      },
      buildDepsData(runtime.codeMap, targetModule, allDependencies)
    );
  } catch (error) {
    return createContractError(
      {
        tool: 'deps',
        rootDir,
        durationMs: performance.now() - startedAt,
      },
      normalizeExecutionError(error)
    );
  }
}

export class DepsCommand {
  async run(args: DepsArgs): Promise<DepsResult> {
    const runtime = await loadCodeMapRuntime(process.cwd());
    return analyzeDeps(runtime.codeMap, args.targets.length > 0 ? args.targets : undefined);
  }

  async runEnhanced(args: DepsArgs): Promise<UnifiedResult[]> {
    const result = await this.run(args);
    return this.toUnifiedResults(result);
  }

  private toUnifiedResults(result: DepsResult): UnifiedResult[] {
    const unifiedResults: UnifiedResult[] = [];

    for (const module of result.modules) {
      const depCount = module.dependencies.length;
      const dependentCount = module.dependents.length;
      const gravity = Math.min(1, (depCount + dependentCount * 2) / 20);
      const heatScore: HeatScore = {
        freq30d: 0,
        lastType: 'dependency',
        lastDate: null,
        stability: true,
      };

      unifiedResults.push({
        id: `codemap-${path.basename(module.path)}-0`,
        source: 'codemap',
        toolScore: 0.9,
        type: 'file',
        file: module.path,
        line: 1,
        location: {
          file: module.relativePath,
          line: 1,
          column: 1,
        },
        content: `依赖 ${depCount} 个模块，被 ${dependentCount} 个模块依赖`,
        relevance: 0.8,
        keywords: [],
        metadata: {
          symbolType: 'class',
          dependencies: module.dependencies,
          testFile: '',
          commitCount: 0,
          gravity,
          heatScore,
          impactCount: dependentCount,
          stability: dependentCount === 0 || dependentCount > 5,
          riskLevel: gravity > 0.7 ? 'high' : gravity > 0.4 ? 'medium' : 'low',
        },
      });
    }

    return unifiedResults;
  }
}
