import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import type { CodeMap, ModuleInfo } from '../../types/index.js';

interface ImpactOptions {
  file: string;
  json?: boolean;
  transitive?: boolean;
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
 * 查找目标模块
 */
function findTargetModule(codeMap: CodeMap, filePath: string): ModuleInfo | undefined {
  return codeMap.modules.find(m =>
    m.absolutePath.includes(filePath) ||
    path.relative(codeMap.project.rootDir, m.absolutePath).includes(filePath)
  );
}

/**
 * 获取直接依赖该文件的模块
 */
function getDirectDependents(codeMap: CodeMap, targetModule: ModuleInfo): ModuleInfo[] {
  const dependents: ModuleInfo[] = [];

  for (const module of codeMap.modules) {
    // 检查是否依赖目标模块
    if (module.dependencies.some(dep =>
      dep === targetModule.id ||
      module.absolutePath.includes(dep) ||
      path.relative(codeMap.project.rootDir, module.absolutePath).includes(dep)
    )) {
      dependents.push(module);
    }

    // 也检查 imports
    for (const imp of module.imports) {
      if (imp.source.includes(path.basename(targetModule.absolutePath, '.ts'))) {
        if (!dependents.includes(module)) {
          dependents.push(module);
        }
      }
    }
  }

  return dependents;
}

/**
 * 获取传递依赖（可选）
 */
function getTransitiveDependents(
  codeMap: CodeMap,
  targetModule: ModuleInfo,
  visited: Set<string> = new Set()
): Map<ModuleInfo, number> {
  const result = new Map<ModuleInfo, number>();
  visited.add(targetModule.id);

  const directDependents = getDirectDependents(codeMap, targetModule);

  for (const dependent of directDependents) {
    result.set(dependent, 1);

    // 递归获取传递依赖
    if (!visited.has(dependent.id)) {
      const transitive = getTransitiveDependents(codeMap, dependent, visited);
      for (const [module, distance] of transitive) {
        const existing = result.get(module);
        if (!existing || existing > distance + 1) {
          result.set(module, distance + 1);
        }
      }
    }
  }

  return result;
}

/**
 * 格式化影响分析输出
 */
function formatImpact(
  codeMap: CodeMap,
  targetModule: ModuleInfo,
  directDependents: ModuleInfo[],
  transitiveDependents: Map<ModuleInfo, number>,
  options: ImpactOptions
): void {
  const output: Record<string, unknown> = {
    target: {
      path: targetModule.absolutePath,
      relativePath: path.relative(codeMap.project.rootDir, targetModule.absolutePath)
    },
    directDependents: directDependents.map(m => ({
      path: m.absolutePath,
      relativePath: path.relative(codeMap.project.rootDir, m.absolutePath),
      type: m.type
    })),
    statistics: {
      directCount: directDependents.length,
      transitiveCount: options.transitive ? transitiveDependents.size : 0
    }
  };

  if (options.json) {
    if (options.transitive) {
      output.transitiveDependents = Array.from(transitiveDependents.entries())
        .filter(([_, dist]) => dist > 1)
        .map(([module, distance]) => ({
          path: module.absolutePath,
          relativePath: path.relative(codeMap.project.rootDir, module.absolutePath),
          distance,
          type: module.type
        }));
    }
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  console.log(chalk.cyan('\n📍 影响分析'));
  console.log(chalk.gray('─'.repeat(50)));

  // 目标文件
  console.log(chalk.yellow('\n目标文件:'));
  console.log(chalk.green(`   ${path.relative(codeMap.project.rootDir, targetModule.absolutePath)}`));
  console.log(chalk.gray(`   导出: ${targetModule.exports.map(e => e.name).join(', ') || '无'}`));

  // 直接依赖
  console.log(chalk.yellow(`\n⬇️  直接依赖该文件的模块 (${directDependents.length}):`));

  if (directDependents.length === 0) {
    console.log(chalk.gray('   无'));
  } else {
    for (const dep of directDependents) {
      const relPath = path.relative(codeMap.project.rootDir, dep.absolutePath);
      const exports = dep.exports.map(e => e.name).join(', ') || '无';
      console.log(chalk.green(`   • ${relPath}`));
      console.log(chalk.gray(`     导出: ${exports.substring(0, 50)}${exports.length > 50 ? '...' : ''}`));
    }
  }

  // 传递依赖
  if (options.transitive && transitiveDependents.size > 0) {
    console.log(chalk.yellow(`\n🌐 传递依赖 (${transitiveDependents.size - directDependents.length}):`));

    const sorted = Array.from(transitiveDependents.entries())
      .filter(([_, dist]) => dist > 1)
      .sort((a, b) => a[1] - b[1]);

    for (const [module, distance] of sorted.slice(0, 20)) {
      const relPath = path.relative(codeMap.project.rootDir, module.absolutePath);
      const dots = '  '.repeat(distance - 1);
      console.log(chalk.green(`   ${dots}└─► ${relPath}`), chalk.gray(`[距离: ${distance}]`));
    }

    if (sorted.length > 20) {
      console.log(chalk.gray(`   ... 还有 ${sorted.length - 20} 个`));
    }
  }

  // 风险评估
  console.log(chalk.gray('\n─'.repeat(50)));
  console.log(chalk.cyan('\n⚠️  风险评估:'));

  if (directDependents.length === 0) {
    console.log(chalk.green('   ✅ 低风险 - 该文件未被其他模块依赖'));
  } else if (directDependents.length <= 3) {
    console.log(chalk.yellow('   ⚠️  中风险 - 该文件被少量模块依赖'));
  } else if (directDependents.length <= 10) {
    console.log(chalk.red('   ⚠️  高风险 - 该文件被多个模块依赖，修改需谨慎'));
  } else {
    console.log(chalk.magenta('   🔴 极高风险 - 该文件是核心依赖，修改将影响大量模块'));
  }

  console.log(chalk.cyan(`\n   直接影响: ${directDependents.length} 个模块`));
  if (options.transitive) {
    console.log(chalk.cyan(`   传递影响: ${transitiveDependents.size - directDependents.length} 个额外模块`));
  }

  console.log('');
}

/**
 * Impact 命令实现
 */
export async function impactCommand(options: ImpactOptions) {
  const rootDir = process.cwd();

  if (!options.file) {
    console.log(chalk.red('❌ 请指定要分析的文件 (--file <path>)'));
    console.log(chalk.gray('\n用法:'));
    console.log(chalk.gray('   codemap impact --file <path>   # 分析文件影响范围'));
    console.log(chalk.gray('   codemap impact --file <path> --transitive   # 包含传递依赖'));
    console.log(chalk.gray('   codemap impact --file <path> --json   # JSON 输出'));
    process.exit(1);
  }

  // 加载代码地图
  const codeMap = loadCodeMap(rootDir);
  if (!codeMap) {
    process.exit(1);
  }

  // 查找目标模块
  const targetModule = findTargetModule(codeMap, options.file);

  if (!targetModule) {
    console.log(chalk.red(`❌ 未找到文件: ${options.file}`));
    console.log(chalk.gray('\n提示: 请使用相对于项目根目录的路径'));
    process.exit(1);
  }

  // 获取直接依赖
  const directDependents = getDirectDependents(codeMap, targetModule);

  // 获取传递依赖
  const transitiveDependents = options.transitive
    ? getTransitiveDependents(codeMap, targetModule)
    : new Map<ModuleInfo, number>();

  // 输出结果
  formatImpact(codeMap, targetModule, directDependents, transitiveDependents, options);
}
