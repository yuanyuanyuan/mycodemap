#!/usr/bin/env node

// [META] since:2026-03-03 | owner:orchestrator-team | stable:true
// [WHY] CLI 入口点，注册命令并初始化运行日志

import { Command } from 'commander';
import { generateCommand } from './commands/generate.js';
import { initCommand } from './commands/init.js';
import { watchCommand } from './commands/watch.js';
import { queryCommand } from './commands/query.js';
import { depsCommand } from './commands/deps.js';
import { cyclesCommand } from './commands/cycles.js';
import { complexityCommand } from './commands/complexity.js';
import { impactCommand } from './commands/impact.js';
import { analyzeCommand } from './commands/analyze.js';
import { ciCommand } from './commands/ci.js';
import { workflowCommand } from './commands/workflow.js';
import { setupRuntimeLogging } from './runtime-logger.js';

const program = new Command();

setupRuntimeLogging(process.argv.slice(2));

program
  .name('mycodemap')
  .alias('codemap')  // 兼容旧命令名
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
  .option('-o, --output <dir>', '输出目录', '.mycodemap')
  .option('--ai-context', '为每个文件生成 AI 描述（需要 AI Provider）', false)
  .action(generateCommand);

program
  .command('watch')
  .description('监听文件变更并自动更新代码地图')
  .option('-m, --mode <mode>', '分析模式 (fast|smart|hybrid)', 'hybrid')
  .option('-o, --output <dir>', '输出目录', '.mycodemap')
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
  .option('-l, --limit <number>', '限制结果数量', '50')
  .option('-j, --json', 'JSON 格式输出')
  .option('--structured', '输出完全结构化的 JSON（不包含自然语言字符串，需要配合 --json 使用）')
  .option('-v, --verbose', '显示性能指标')
  .option('-r, --regex', '使用正则表达式搜索（仅适用于 -S/--search）')
  .option('-c, --context <lines>', '显示代码上下文行数', '0')
  .option('--case-sensitive', '大小写敏感搜索（精确搜索默认开启）')
  .option('--include-references', '包含符号引用位置信息')
  .option('--deps-format <format>', '依赖查询输出格式 (default|detailed)', 'default')
  .option('--no-cache', '禁用缓存，强制重新加载索引')
  .action(queryCommand);

program
  .command('deps')
  .description('分析项目模块依赖关系')
  .option('-m, --module <path>', '查看指定模块的依赖')
  .option('-j, --json', 'JSON 格式输出')
  .option('--structured', '输出完全结构化的 JSON（不包含自然语言字符串，需要配合 --json 使用）')
  .action(depsCommand);

program
  .command('cycles')
  .description('检测项目中的循环依赖')
  .option('-d, --depth <number>', '检测深度', '5')
  .option('-j, --json', 'JSON 格式输出')
  .option('--structured', '输出完全结构化的 JSON（不包含自然语言字符串，需要配合 --json 使用）')
  .action(cyclesCommand);

program
  .command('complexity')
  .description('分析代码复杂度（圈复杂度、认知复杂度、可维护性）')
  .option('-f, --file <path>', '查看指定文件的复杂度')
  .option('-d, --detail', '显示函数级复杂度详情（使用 AST 精确分析）')
  .option('-j, --json', 'JSON 格式输出')
  .option('--structured', '输出完全结构化的 JSON（不包含自然语言字符串，需要配合 --json 使用）')
  .action(complexityCommand);

program
  .command('impact')
  .description('分析文件变更的影响范围')
  .option('-f, --file <path>', '指定要分析的文件（必填）')
  .option('-t, --transitive', '包含传递依赖')
  .option('-j, --json', 'JSON 格式输出')
  .option('--structured', '输出完全结构化的 JSON（不包含自然语言字符串，需要配合 --json 使用）')
  .action(impactCommand);

program
  .command('analyze')
  .description('统一分析入口 - 支持多种分析意图')
  .option('-i, --intent <type>', '分析类型 (impact|dependency|search|documentation|complexity|overview|refactor|reference)')
  .option('-t, --targets <paths...>', '目标文件/模块路径')
  .option('-k, --keywords <words...>', '搜索关键词')
  .option('-s, --scope <scope>', '范围 (direct|transitive)')
  .option('-n, --topK <number>', '返回结果数量', '8')
  .option('--include-tests', '包含测试文件')
  .option('--include-git-history', '包含 Git 历史')
  .option('--json', 'JSON 格式输出')
  .option('--structured', '输出完全结构化的 JSON（不包含自然语言字符串，需要配合 --json 或 --output-mode=machine 使用）')
  .option('--output-mode <mode>', '输出模式 (machine|human)')
  .action(async () => {
    // 跳过 program name 和 command name
    await analyzeCommand(process.argv.slice(2));
  });

// CI Gateway 命令
program.addCommand(ciCommand);

// Workflow 命令
program.addCommand(workflowCommand);

program.parse();
