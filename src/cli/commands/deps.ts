import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import type { CodeMap, ModuleInfo } from '../../types/index.js';

interface DepsOptions {
  module?: string;
  json?: boolean;
}

/**
 * 加载代码地图数据
 */
function loadCodeMap(rootDir: string): CodeMap | null {
  const codemapPath = path.join(rootDir, '.codemap', 'codemap.json');

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
      output.module = {
        path: targetModule.absolutePath,
        relativePath: path.relative(codeMap.project.rootDir, targetModule.absolutePath),
        dependencies: targetModule.dependencies,
        dependents: targetModule.dependents
      };
    } else {
      output.allDependencies = Object.fromEntries(allDependencies);
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
 * Deps 命令实现
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
