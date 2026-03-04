// [META] since:2026-03-03 | owner:orchestrator-team | stable:true
// [WHY] 提供依赖分析命令，添加 dependentsMap 解决 ID 到路径映射

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { resolveDataPath } from '../paths.js';
import type { CodeMap, ModuleInfo, SourceLocation } from '../../types/index.js';
import type { UnifiedResult, HeatScore } from '../../orchestrator/types.js';

interface DepsOptions {
  module?: string;
  json?: boolean;
  structured?: boolean;
}

interface DepsArgs {
  targets: string[];
}

interface DepsModuleInfo {
  path: string;
  relativePath: string;
  dependencies: string[];
  dependents: string[];
  // 新增：结构化 dependents（ID 到路径的映射）
  dependentsMap?: Array<{
    id: string;
    path: string;
  }>;
}

interface DepsResult {
  modules: DepsModuleInfo[];
  allDependencies?: Array<{
    path: string;
    count: number;
    type: string;
  }>;
}

/**
 * 加载代码地图数据
 */
function loadCodeMap(rootDir: string): CodeMap | null {
  const codemapPath = resolveDataPath(rootDir);

  if (!fs.existsSync(codemapPath)) {
    console.log(chalk.red('❌ 代码地图不存在，请先运行 codemap generate'));
    return null;
  }

  try {
    const data = fs.readFileSync(codemapPath, 'utf-8');
    return JSON.parse(data) as CodeMap;
  } catch (error) {
    console.log(chalk.red('❌ 读取代码地图失败:', error instanceof Error ? error.message : String(error)));
    return null;
  }
}

/**
 * 获取模块的依赖关系
 */
function getModuleDependencies(codeMap: CodeMap, modulePath: string): {
  module: ModuleInfo | undefined;
  dependencies: string[];
  dependents: string[];
} {
  const module = codeMap.modules.find(m =>
    m.absolutePath.includes(modulePath) ||
    path.relative(codeMap.project.rootDir, m.absolutePath).includes(modulePath)
  );

  if (!module) {
    return { module: undefined, dependencies: [], dependents: [] };
  }

  return {
    module,
    dependencies: module.dependencies,
    dependents: module.dependents
  };
}

/**
 * 构建 dependents ID 到路径的映射
 */
function buildDependentsMap(
  dependents: string[],
  codeMap: CodeMap
): Array<{ id: string; path: string }> {
  return dependents.map(id => {
    const depModule = codeMap.modules.find(m => m.id === id);
    return {
      id,
      path: depModule
        ? path.relative(codeMap.project.rootDir, depModule.absolutePath)
        : id
    };
  });
}

/**
 * 构建 SourceLocation 对象
 */
function buildLocation(filePath: string, line: number = 1, column: number = 1): SourceLocation {
  return {
    file: filePath,
    line,
    column,
  };
}

/**
 * 分析依赖关系 - 纯逻辑函数
 * @param codeMap 代码地图数据
 * @param modulePaths 目标模块路径列表（可选，为空则分析所有模块）
 * @returns 依赖分析结果
 */
function analyzeDeps(codeMap: CodeMap, modulePaths?: string[]): DepsResult {
  const modules: DepsModuleInfo[] = [];
  const allDependencies: Array<{ path: string; count: number; type: string }> = [];

  if (modulePaths && modulePaths.length > 0) {
    // 分析指定模块
    for (const modulePath of modulePaths) {
      const result = getModuleDependencies(codeMap, modulePath);
      if (result.module) {
        const dependentsMap = buildDependentsMap(result.module.dependents, codeMap);

        modules.push({
          path: result.module.absolutePath,
          relativePath: path.relative(codeMap.project.rootDir, result.module.absolutePath),
          dependencies: result.dependencies,
          dependents: result.dependents,
          dependentsMap
        });
      }
    }
  } else {
    // 分析所有模块
    for (const module of codeMap.modules) {
      const dependentsMap = buildDependentsMap(module.dependents, codeMap);

      modules.push({
        path: module.absolutePath,
        relativePath: path.relative(codeMap.project.rootDir, module.absolutePath),
        dependencies: module.dependencies,
        dependents: module.dependents,
        dependentsMap
      });

      allDependencies.push({
        path: module.absolutePath,
        count: module.dependencies.length,
        type: module.type
      });
    }

    // 按依赖数量排序
    allDependencies.sort((a, b) => b.count - a.count);
  }

  return {
    modules,
    allDependencies: allDependencies.length > 0 ? allDependencies : undefined
  };
}

/**
 * 格式化依赖输出
 */
function formatDependencies(
  codeMap: CodeMap,
  targetModule: ModuleInfo | undefined,
  allDependencies: Map<string, { type: string; count: number }>,
  options: DepsOptions
): void {
  if (options.json) {
    const output: Record<string, unknown> = {};

    if (options.module && targetModule) {
      const dependentsMap = buildDependentsMap(targetModule.dependents, codeMap);
      const location = buildLocation(
        path.relative(codeMap.project.rootDir, targetModule.absolutePath)
      );

      output.module = {
        path: targetModule.absolutePath,
        relativePath: path.relative(codeMap.project.rootDir, targetModule.absolutePath),
        location, // 新增：结构化位置信息
        dependencies: targetModule.dependencies,
        dependents: targetModule.dependents,
        dependentsMap
      };
    } else {
      output.allDependencies = Object.fromEntries(allDependencies);
      output.modules = Array.from(allDependencies.entries()).map(([modulePath, info]) => ({
        path: modulePath,
        relativePath: path.relative(codeMap.project.rootDir, modulePath),
        location: buildLocation(path.relative(codeMap.project.rootDir, modulePath)),
        ...info
      }));
    }

    console.log(JSON.stringify(output, null, 2));
    return;
  }

  if (options.module && targetModule) {
    // 输出指定模块的依赖
    console.log(chalk.cyan(`\n📦 模块: ${path.relative(codeMap.project.rootDir, targetModule.absolutePath)}`));
    console.log(chalk.gray('─'.repeat(50)));

    // 直接依赖
    console.log(chalk.yellow('\n⬇️  直接依赖 (dependencies):'));
    if (targetModule.dependencies.length === 0) {
      console.log(chalk.gray('   无'));
    } else {
      for (const dep of targetModule.dependencies) {
        const depModule = codeMap.modules.find(m =>
          m.dependencies.includes(dep) || m.absolutePath.includes(dep)
        );
        const depType = depModule?.type || 'unknown';
        console.log(chalk.green(`   • ${dep}`), chalk.gray(`[${depType}]`));
      }
    }

    // 依赖者（反向依赖）
    console.log(chalk.yellow('\n⬆️  被依赖 (dependents):'));
    if (targetModule.dependents.length === 0) {
      console.log(chalk.gray('   无'));
    } else {
      for (const dep of targetModule.dependents) {
        const depModule = codeMap.modules.find(m => m.id === dep);
        const relPath = depModule
          ? path.relative(codeMap.project.rootDir, depModule.absolutePath)
          : dep;
        console.log(chalk.green(`   • ${relPath}`));
      }
    }

    // 统计
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.cyan(`   依赖数量: ${targetModule.dependencies.length}`));
    console.log(chalk.cyan(`   被依赖数量: ${targetModule.dependents.length}`));
  } else {
    // 输出所有模块的依赖统计
    console.log(chalk.cyan('\n📊 项目依赖分析'));
    console.log(chalk.gray('─'.repeat(50)));

    // 按依赖数量排序
    const sortedDeps = Array.from(allDependencies.entries())
      .sort((a, b) => b[1].count - a[1].count);

    console.log(chalk.yellow('\n📦 模块依赖排名 (Top 20):'));
    let rank = 1;
    for (const [modulePath, info] of sortedDeps.slice(0, 20)) {
      const relPath = modulePath.replace(codeMap.project.rootDir + '/', '');
      console.log(chalk.green(`   ${rank}. ${relPath}`));
      console.log(chalk.gray(`      依赖: ${info.count}, 类型: ${info.type}`));
      rank++;
    }

    // 统计
    const totalDeps = allDependencies.size;
    const totalDepCount = Array.from(allDependencies.values()).reduce((sum, v) => sum + v.count, 0);

    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.cyan(`   总模块数: ${codeMap.modules.length}`));
    console.log(chalk.cyan(`   有依赖的模块: ${totalDeps}`));
    console.log(chalk.cyan(`   总依赖关系: ${totalDepCount}`));
  }

  console.log('');
}

/**
 * Deps 命令实现 - 保持向后兼容
 */
export async function depsCommand(options: DepsOptions) {
  const rootDir = process.cwd();

  // 加载代码地图
  const codeMap = loadCodeMap(rootDir);
  if (!codeMap) {
    process.exit(1);
  }

  // 获取目标模块
  let targetModule: ModuleInfo | undefined;
  const allDependencies = new Map<string, { type: string; count: number }>();

  if (options.module) {
    const result = getModuleDependencies(codeMap, options.module);
    targetModule = result.module;
  } else {
    // 统计所有模块的依赖
    for (const module of codeMap.modules) {
      allDependencies.set(module.absolutePath, {
        type: module.type,
        count: module.dependencies.length
      });
    }
  }

  // 输出结果
  formatDependencies(codeMap, targetModule, allDependencies, options);
}

/**
 * DepsCommand 类 - 供 ToolOrchestrator 调用
 */
export class DepsCommand {
  private codeMap: CodeMap | null = null;

  /**
   * 加载代码地图
   */
  private loadCodeMap(rootDir: string): CodeMap | null {
    const codemapPath = resolveDataPath(rootDir);

    if (!fs.existsSync(codemapPath)) {
      return null;
    }

    try {
      const data = fs.readFileSync(codemapPath, 'utf-8');
      return JSON.parse(data) as CodeMap;
    } catch {
      return null;
    }
  }

  /**
   * 执行依赖分析
   * @param args 分析参数
   * @returns 依赖分析结果
   */
  async run(args: DepsArgs): Promise<DepsResult> {
    const rootDir = process.cwd();

    // 加载代码地图
    if (!this.codeMap) {
      this.codeMap = this.loadCodeMap(rootDir);
    }

    if (!this.codeMap) {
      throw new Error('代码地图不存在，请先运行 codemap generate');
    }

    // 执行分析
    return analyzeDeps(this.codeMap, args.targets.length > 0 ? args.targets : undefined);
  }

  /**
   * 执行增强依赖分析，返回 UnifiedResult 格式
   * @param args 分析参数
   * @returns UnifiedResult 数组
   */
  async runEnhanced(args: DepsArgs): Promise<UnifiedResult[]> {
    const result = await this.run(args);
    return this.toUnifiedResults(result);
  }

  /**
   * 将 DepsResult 转换为 UnifiedResult 数组
   * @param result 依赖分析结果
   * @returns UnifiedResult 数组
   */
  private toUnifiedResults(result: DepsResult): UnifiedResult[] {
    const unifiedResults: UnifiedResult[] = [];

    for (const module of result.modules) {
      // 生成唯一ID
      const fileName = path.basename(module.path);
      const id = `codemap-${fileName}-0`;

      // 构建人类可读内容
      const depCount = module.dependencies.length;
      const dependentCount = module.dependents.length;
      const content = `依赖 ${depCount} 个模块，被 ${dependentCount} 个模块依赖`;

      // 计算依赖复杂度评分 (gravity)
      // 基于依赖数量和被依赖数量的加权计算
      const gravity = Math.min(1.0, (depCount + dependentCount * 2) / 20);

      // 构建热度评分对象
      const heatScore: HeatScore = {
        freq30d: 0, // 依赖分析不涉及提交历史
        lastType: 'dependency',
        lastDate: null,
        stability: true
      };

      // 构建元数据
      const metadata: UnifiedResult['metadata'] = {
        symbolType: 'class',
        dependencies: module.dependencies,
        testFile: '',
        commitCount: 0,
        gravity,
        heatScore,
        impactCount: dependentCount,
        stability: dependentCount === 0 || dependentCount > 5, // 无依赖或多依赖视为稳定
        riskLevel: gravity > 0.7 ? 'high' : gravity > 0.4 ? 'medium' : 'low'
      };

      // 构建 location
      const location: SourceLocation = {
        file: module.relativePath,
        line: 1,
        column: 1,
      };

      unifiedResults.push({
        id,
        source: 'codemap',
        toolScore: 0.9,
        type: 'file',
        file: module.path,
        line: 1,
        location, // 新增：结构化位置信息
        content,
        relevance: 0.8,
        keywords: [],
        metadata
      });
    }

    return unifiedResults;
  }
}

// 导出类型
export type { DepsArgs, DepsResult, DepsModuleInfo };
