#!/usr/bin/env node

import { Command } from 'commander';
import { generateCommand } from './commands/generate.js';
import { initCommand } from './commands/init.js';
import { watchCommand } from './commands/watch.js';
import { queryCommand } from './commands/query.js';
import { depsCommand } from './commands/deps.js';
import { cyclesCommand } from './commands/cycles.js';
import { complexityCommand } from './commands/complexity.js';
import { impactCommand } from './commands/impact.js';

const program = new Command();

program
  .name('codemap')
  .description('TypeScript 代码地图工具 - 为 AI 辅助开发提供结构化上下文')
  .version('0.1.0');

program
  .command('init')
  .description('初始化 CodeMap 配置')
  .option('-y, --yes', '使用默认配置')
  .action(initCommand);

program
  .command('generate')
  .description('生成代码地图')
  .option('-m, --mode <mode>', '分析模式 (fast|smart|hybrid)', 'hybrid')
  .option('-o, --output <dir>', '输出目录', '.codemap')
  .option('--ai-context', '为每个文件生成 AI 描述（需要 AI Provider）', false)
  .action(generateCommand);

program
  .command('watch')
  .description('监听文件变更并自动更新代码地图')
  .option('-m, --mode <mode>', '分析模式 (fast|smart|hybrid)', 'hybrid')
  .option('-o, --output <dir>', '输出目录', '.codemap')
  .option('-d, --detach', '以后台守护进程方式运行')
  .option('-s, --stop', '停止后台守护进程')
  .option('-t, --status', '查看后台守护进程状态')
  .action(watchCommand);

program
  .command('query')
  .description('查询代码地图中的符号、模块、依赖信息')
  .option('-s, --symbol <name>', '精确查询符号')
  .option('-m, --module <path>', '查询模块')
  .option('-d, --deps <name>', '查询依赖')
  .option('-S, --search <word>', '模糊搜索')
  .option('-l, --limit <number>', '限制结果数量', '20')
  .option('-j, --json', 'JSON 格式输出')
  .action(queryCommand);

program
  .command('deps')
  .description('分析项目模块依赖关系')
  .option('-m, --module <path>', '查看指定模块的依赖')
  .option('-j, --json', 'JSON 格式输出')
  .action(depsCommand);

program
  .command('cycles')
  .description('检测项目中的循环依赖')
  .option('-d, --depth <number>', '检测深度', '5')
  .option('-j, --json', 'JSON 格式输出')
  .action(cyclesCommand);

program
  .command('complexity')
  .description('分析代码复杂度（圈复杂度、认知复杂度、可维护性）')
  .option('-f, --file <path>', '查看指定文件的复杂度')
  .option('-j, --json', 'JSON 格式输出')
  .action(complexityCommand);

program
  .command('impact')
  .description('分析文件变更的影响范围')
  .option('-f, --file <path>', '指定要分析的文件（必填）')
  .option('-t, --transitive', '包含传递依赖')
  .option('-j, --json', 'JSON 格式输出')
  .action(impactCommand);

program.parse();
