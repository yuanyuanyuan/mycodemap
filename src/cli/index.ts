#!/usr/bin/env node

// [META] since:2026-03-03 | owner:orchestrator-team | stable:true
// [WHY] CLI 入口点，注册命令并初始化运行日志

import { Command } from 'commander';
import { generateCommand } from './commands/generate.js';
import { initCommand } from './commands/init.js';
import { queryCommand } from './commands/query.js';
import { depsCommand } from './commands/deps.js';
import { cyclesCommand } from './commands/cycles.js';
import { complexityCommand } from './commands/complexity.js';
import { impactCommand } from './commands/impact.js';
import { designCommand } from './commands/design.js';
import { ciCommand } from './commands/ci.js';
import { workflowCommand } from './commands/workflow.js';
import { exportCommand } from './commands/export.js';
import { checkCommand } from './commands/check.js';
import { historyCommand } from './commands/history.js';
import { publishStatusCommand } from './commands/publish-status.js';
import { readinessGateCommand } from './commands/readiness-gate.js';
import { mcpCommand, isMcpStartInvocation } from './commands/mcp.js';
import { doctorCommand } from './commands/doctor.js';
import { benchmarkCommand } from './commands/benchmark.js';
import { shipCommand } from './commands/ship/index.js';
import { ANALYZE_COMMAND_DESCRIPTION, configureAnalyzeCommand } from './commands/analyze-options.js';
import { setupRuntimeLogging } from './runtime-logger.js';
import { runFirstRunGuide } from './first-run-guide.js';
import { printMigrationWarning } from './paths.js';
import { validatePlatform } from './platform-check.js';
import { formatRemovedCommandMessage, getRemovedTopLevelCommand } from './removed-commands.js';
import { commandRequiresTreeSitter, validateTreeSitterAsync } from './tree-sitter-check.js';
import { getFullContract } from './interface-contract/index.js';
import { tryApplySuggestion } from './output/apply-suggestion.js';
import { resolveOutputMode, formatError } from './output/index.js';
import type { ActionableError } from './output/types.js';

const program = new Command();
const cliArgs = process.argv.slice(2);

// --schema must bypass all startup side effects to keep stdout machine-parseable
// Only intercept at root level (no subcommand present) so valid subcommand args
// that happen to be exactly --schema are not hijacked.
const firstArg = cliArgs[0];
const isRootLevel = !firstArg || firstArg.startsWith('-');
if (isRootLevel && cliArgs.includes('--schema')) {
  console.log(JSON.stringify(getFullContract(), null, 2));
  process.exit(0);
}

const shouldBypassHumanStartupSideEffects = isMcpStartInvocation(cliArgs);

const removedCommand = getRemovedTopLevelCommand(cliArgs);
if (removedCommand) {
  console.error(formatRemovedCommandMessage(removedCommand));
  process.exit(1);
}

if (!shouldBypassHumanStartupSideEffects) {
  printMigrationWarning();
  runFirstRunGuide();
  setupRuntimeLogging(cliArgs);
}

// 验证平台支持（CLI 启动时执行）
try {
  const platformInfo = validatePlatform();
  if (platformInfo.supportLevel === 'partial') {
    console.warn('⚠️  平台支持级别: partial');
    platformInfo.warnings.forEach(w => console.warn(`  - ${w}`));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

/**
 * 统一命令 action 包装器：tree-sitter 检查 + 集中式错误处理 + suggestion 自动修复
 */
async function createActionHandler<TArgs extends unknown[]>(
  commandName: string,
  action: (...args: TArgs) => void | Promise<void>,
): Promise<(...args: TArgs) => Promise<void>> {
  return async (...args: TArgs) => {
    try {
      if (commandRequiresTreeSitter(commandName)) {
        await validateTreeSitterAsync();
      }
      await action(...args);
    } catch (error) {
      const mode = resolveOutputMode({});
      const formatted = formatError(error, mode, commandName);
      process.stdout.write(formatted + '\n');

      // 尝试自动修复（如果 --apply-suggestion 已设置且错误是 ActionableError）
      const cliOpts = program.opts();
      if (cliOpts.applySuggestion && error && typeof error === 'object' && 'nextCommand' in error) {
        const suggestionResult = await tryApplySuggestion(
          error as ActionableError,
          { applySuggestion: cliOpts.applySuggestion, wasmFallback: cliOpts.wasmFallback },
          mode,
        );
        if (suggestionResult.success) {
          process.exitCode = 0;
          return;
        }
      }

      process.exitCode = 1;
    }
  };
}

program
  .name('mycodemap')
  .alias('codemap')  // 兼容旧命令名
  .description('TypeScript 代码地图工具 - 为 AI 辅助开发提供结构化上下文')
  .version('0.1.0')
  .option('--apply-suggestion', 'Allow automatic execution of high-confidence remediation suggestions (confidence >= 0.8)')
  .option('--wasm-fallback', 'Automatically use WASM fallback when native dependencies fail to compile')
  .option('--native', 'Force native binary usage for tree-sitter and better-sqlite3 (disables WASM fallback)');

program
  .command('init')
  .description('初始化并收敛 CodeMap 项目状态')
  .option('-y, --yes', '使用默认配置')
  .option('--interactive', '仅显示 reconciliation preview，不写入文件')
  .action(initCommand);

program
  .command('generate')
  .description('生成代码地图')
  .option('-m, --mode <mode>', '分析模式 (fast|smart|hybrid)', 'hybrid')
  .option('-o, --output <dir>', '输出目录', '.mycodemap')
  .option('--symbol-level', '额外 materialize symbol-level 调用依赖到代码图存储', false)
  .option('--ai-context', '为每个文件生成 AI 描述（需要 AI Provider）', false)
  .action(await createActionHandler('generate', async (options: unknown, command: Command) => {
    await generateCommand({
      ...(options as Record<string, unknown>),
      __optionSources: {
        mode: command.getOptionValueSource('mode'),
        output: command.getOptionValueSource('output'),
      },
    });
  }));

program.addCommand(designCommand);

program
  .command('query')
  .description('查询代码地图中的符号、模块、依赖信息')
  .option('-s, --symbol <name>', '精确查询符号')
  .option('-m, --module <path>', '查询模块')
  .option('-d, --deps <name>', '查询依赖')
  .option('-S, --search <word>', '模糊搜索')
  .option('-l, --limit <number>', '限制结果数量', '50')
  .option('-j, --json', 'JSON 格式输出')
  .option('--human', '强制人类可读输出')
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
  .option('--human', '强制人类可读输出')
  .option('--structured', '输出完全结构化的 JSON（不包含自然语言字符串，需要配合 --json 使用）')
  .action(await createActionHandler('deps', depsCommand));

program
  .command('cycles')
  .description('检测项目中的循环依赖')
  .option('-d, --depth <number>', '检测深度', '5')
  .option('-j, --json', 'JSON 格式输出')
  .option('--structured', '输出完全结构化的 JSON（不包含自然语言字符串，需要配合 --json 使用）')
  .action(await createActionHandler('cycles', cyclesCommand));

program
  .command('complexity')
  .description('分析代码复杂度（圈复杂度、认知复杂度、可维护性）')
  .option('-f, --file <path>', '查看指定文件的复杂度')
  .option('-d, --detail', '显示函数级复杂度详情（使用 AST 精确分析）')
  .option('-j, --json', 'JSON 格式输出')
  .option('--structured', '输出完全结构化的 JSON（不包含自然语言字符串，需要配合 --json 使用）')
  .action(await createActionHandler('complexity', complexityCommand));

program
  .command('impact')
  .description('分析文件变更的影响范围')
  .option('-f, --file <path>', '指定要分析的文件（必填）')
  .option('-t, --transitive', '包含传递依赖')
  .option('-j, --json', 'JSON 格式输出')
  .option('--structured', '输出完全结构化的 JSON（不包含自然语言字符串，需要配合 --json 使用）')
  .action(await createActionHandler('impact', impactCommand));

configureAnalyzeCommand(
  program
    .command('analyze')
    .description(ANALYZE_COMMAND_DESCRIPTION)
).action(await createActionHandler('analyze', async () => {
  const { analyzeCommand } = await import('./commands/analyze.js');
  // 跳过 program name 和 command name
  await analyzeCommand(process.argv.slice(2));
}));

// CI Gateway 命令
program.addCommand(ciCommand);

// Contract gate 命令
program.addCommand(checkCommand);

// History risk 命令
program.addCommand(historyCommand);

// Publish workflow follow-up 命令
program.addCommand(publishStatusCommand);

// Readiness gate 命令
program.addCommand(readinessGateCommand);

// Experimental MCP 命令
program.addCommand(mcpCommand);

// Doctor command
program.addCommand(doctorCommand);

// Benchmark command
program
  .command('benchmark')
  .description('Compare WASM vs Native performance')
  .option('-t, --target <path>', 'Target repository', '.')
  .option('-m, --mode <mode>', 'Benchmark mode: native, wasm, both', 'both')
  .option('-i, --iterations <n>', 'Number of iterations', '3')
  .option('-j, --json', 'JSON output')
  .action(benchmarkCommand);

// Workflow 命令
program.addCommand(workflowCommand);

// Export 命令
program
  .command('export')
  .description('导出代码图到各种格式 (MVP3)')
  .argument('<format>', '导出格式: json, graphml, dot, mermaid')
  .option('-o, --output <path>', '输出文件路径')
  .action(exportCommand);

// Ship 命令
program
  .command('ship')
  .description('一键智能发布 - 自动分析变更、计算版本、运行检查、推送 tag 并触发 GitHub Actions 发布')
  .option('--dry-run', '仅分析，不发布')
  .option('--verbose', '显示详细输出')
  .option('--yes, -y', '置信度 60-75 时自动确认（不询问）')
  .action(shipCommand);

// Handle --native flag: disable WASM fallback before any command runs
const cliOpts = program.opts();
if (cliOpts.native) {
  process.env.CODEMAP_USE_WASM_TREE_SITTER = '0';
  process.env.CODEMAP_USE_WASM_BETTER_SQLITE3 = '0';
}

// Handle --wasm-fallback flag: activate WASM fallback before any command runs
if (cliOpts.wasmFallback) {
  process.env.CODEMAP_USE_WASM_TREE_SITTER = '1';
  process.env.CODEMAP_USE_WASM_BETTER_SQLITE3 = '1';
}

program.parse();
