// [META] since:2026-03 | owner:cli-team | stable:true
// [WHY] Provide circular dependency detection command for CLI

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { resolveDataPath } from '../paths.js';
import type { CodeMap, ModuleInfo } from '../../types/index.js';

interface CyclesOptions {
  depth?: number;
  json?: boolean;
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
 * 构建依赖图
 */
function buildDependencyGraph(codeMap: CodeMap): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();

  for (const module of codeMap.modules) {
    const deps = new Set<string>();
    for (const dep of module.dependencies) {
      // 找到对应的模块
      const targetModule = codeMap.modules.find(m =>
        m.absolutePath.includes(dep) ||
        path.relative(codeMap.project.rootDir, m.absolutePath).includes(dep) ||
        m.id === dep
      );
      if (targetModule) {
        deps.add(targetModule.id);
      }
    }
    graph.set(module.id, deps);
  }

  return graph;
}

/**
 * Tarjan 算法找强连通分量
 */
function findStronglyConnectedComponents(
  graph: Map<string, Set<string>>
): string[][] {
  const indexCounter = { value: 0 };
  const stack: string[] = [];
  const lowlinks = new Map<string, number>();
  const index = new Map<string, number>();
  const onStack = new Map<string, boolean>();

  const stronglyConnectedComponents: string[][] = [];

  function strongconnect(node: string): void {
    index.set(node, indexCounter.value);
    lowlinks.set(node, indexCounter.value);
    indexCounter.value++;
    stack.push(node);
    onStack.set(node, true);

    // 遍历邻居
    const neighbors = graph.get(node) || new Set<string>();
    for (const neighbor of neighbors) {
      if (!index.has(neighbor)) {
        strongconnect(neighbor);
        lowlinks.set(node, Math.min(lowlinks.get(node)!, lowlinks.get(neighbor)!));
      } else if (onStack.get(neighbor)) {
        lowlinks.set(node, Math.min(lowlinks.get(node)!, index.get(neighbor)!));
      }
    }

    // 如果是强连通分量的根
    if (lowlinks.get(node) === index.get(node)) {
      const component: string[] = [];
      let stackNode: string | undefined;
      do {
        stackNode = stack.pop()!;
        onStack.set(stackNode, false);
        component.push(stackNode);
      } while (stackNode !== node);

      if (component.length > 1) {
        stronglyConnectedComponents.push(component);
      }
    }
  }

  for (const node of graph.keys()) {
    if (!index.has(node)) {
      strongconnect(node);
    }
  }

  return stronglyConnectedComponents;
}

/**
 * 深度优先搜索找指定深度的循环
 */
function findCyclesWithDepth(
  graph: Map<string, Set<string>>,
  maxDepth: number
): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();

  function dfs(
    node: string,
    path: string[],
    depth: number
  ): void {
    if (depth > maxDepth) return;

    visited.add(node);
    path.push(node);

    const neighbors = graph.get(node) || new Set<string>();
    for (const neighbor of neighbors) {
      if (neighbor === path[0] && path.length > 1) {
        // 找到循环
        cycles.push([...path]);
      } else if (!visited.has(neighbor)) {
        dfs(neighbor, [...path], depth + 1);
      }
    }

    visited.delete(node);
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node, [], 1);
    }
  }

  return cycles;
}

/**
 * 获取模块的相对路径
 */
function getModuleRelPath(codeMap: CodeMap, moduleId: string): string {
  const module = codeMap.modules.find(m => m.id === moduleId);
  if (!module) return moduleId;
  return path.relative(codeMap.project.rootDir, module.absolutePath);
}

/**
 * 格式化循环依赖输出
 */
function formatCycles(
  codeMap: CodeMap,
  cycles: string[][],
  maxDepth: number,
  options: CyclesOptions
): void {
  if (options.json) {
    const output = {
      hasCycles: cycles.length > 0,
      cycleCount: cycles.length,
      maxDepth,
      cycles: cycles.map(cycle => cycle.map(id => getModuleRelPath(codeMap, id)))
    };
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  console.log(chalk.cyan('\n🔄 循环依赖检测'));
  console.log(chalk.gray('─'.repeat(50)));

  if (cycles.length === 0) {
    console.log(chalk.green('\n✅ 未检测到循环依赖！'));
  } else {
    console.log(chalk.red(`\n⚠️  发现 ${cycles.length} 个循环依赖:\n`));

    for (let i = 0; i < cycles.length; i++) {
      const cycle = cycles[i];
      console.log(chalk.yellow(`   循环 ${i + 1}:`));

      for (let j = 0; j < cycle.length; j++) {
        const moduleId = cycle[j];
        const relPath = getModuleRelPath(codeMap, moduleId);
        if (j === cycle.length - 1) {
          console.log(chalk.red(`   └─► ${relPath}`));
        } else {
          console.log(chalk.red(`   ├─► ${relPath}`));
        }
      }
      console.log('');
    }

    // 分析循环依赖的影响
    const affectedModules = new Set<string>();
    for (const cycle of cycles) {
      for (const id of cycle) {
        affectedModules.add(id);
      }
    }

    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.cyan(`   受影响的模块数: ${affectedModules.size}`));
    console.log(chalk.cyan(`   检测深度: ${maxDepth}`));
  }

  console.log('');
}

/**
 * Cycles 命令实现
 */
export async function cyclesCommand(options: CyclesOptions) {
  const rootDir = process.cwd();
  const maxDepth = options.depth || 5;

  // 加载代码地图
  const codeMap = loadCodeMap(rootDir);
  if (!codeMap) {
    process.exit(1);
  }

  // 构建依赖图
  const graph = buildDependencyGraph(codeMap);

  // 找强连通分量
  const stronglyConnected = findStronglyConnectedComponents(graph);

  // 根据深度限制找循环
  const cycles = findCyclesWithDepth(graph, maxDepth);

  // 合并结果（去重）
  const allCycles = [...stronglyConnected, ...cycles];
  const uniqueCycles = allCycles.map(c => [...c].sort()).sort();

  // 输出结果
  formatCycles(codeMap, uniqueCycles, maxDepth, options);
}
