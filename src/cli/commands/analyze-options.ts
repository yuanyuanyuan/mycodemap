/**
 * [META] since:2026-03-24 | owner:cli-team | stable:false
 * [WHY] 统一 analyze 的 option schema，减少 commander/help/parse 三处事实漂移
 */

import type { ParseArgsConfig } from 'node:util';
import { Command } from 'commander';
import { PUBLIC_INTENTS } from '../../orchestrator/types.js';

type AnalyzeParseOption = {
  type: 'string' | 'boolean';
  short?: string;
  multiple?: boolean;
  default?: boolean;
};

interface AnalyzeOptionDefinition {
  name: string;
  flags: string;
  description: string;
  helpDescription: string;
  docDescription?: string;
  docDefaultValue?: string;
  parse: AnalyzeParseOption;
  defaultValue?: string;
  includeInCommander?: boolean;
  includeInDocs?: boolean;
}

export const ANALYZE_COMMAND_DESCRIPTION = '统一分析入口 - 支持多种分析意图';

export const ANALYZE_OPTION_DEFINITIONS: readonly AnalyzeOptionDefinition[] = [
  {
    name: 'intent',
    flags: '-i, --intent <type>',
    description: `分析类型 (${PUBLIC_INTENTS.join('|')})`,
    helpDescription: `分析类型 (${PUBLIC_INTENTS.join('|')})`,
    docDescription: '分析类型：`find`/`read`/`link`/`show`（必填）',
    parse: { type: 'string', short: 'i' },
  },
  {
    name: 'targets',
    flags: '-t, --targets <paths...>',
    description: '目标文件/模块路径',
    helpDescription: '目标文件/模块路径 (多个)',
    docDescription: '目标路径（`read`/`link`/`show` 必填，`find` 可选）',
    parse: { type: 'string', short: 't', multiple: true },
  },
  {
    name: 'keywords',
    flags: '-k, --keywords <words...>',
    description: '搜索关键词',
    helpDescription: '搜索关键词 (多个)',
    docDescription: '搜索关键词（主要用于 `find`）',
    parse: { type: 'string', short: 'k', multiple: true },
  },
  {
    name: 'scope',
    flags: '-s, --scope <scope>',
    description: '范围 (direct|transitive)',
    helpDescription: '范围 (direct|transitive)',
    docDescription: '范围：`direct`（直接）/`transitive`（传递）',
    docDefaultValue: 'direct',
    parse: { type: 'string', short: 's' },
  },
  {
    name: 'topK',
    flags: '-n, --topK <number>',
    description: '返回结果数量',
    helpDescription: '返回结果数量 (默认 8, 最大 100)',
    docDescription: '返回结果数量',
    docDefaultValue: '8',
    parse: { type: 'string', short: 'n' },
    defaultValue: '8',
  },
  {
    name: 'include-tests',
    flags: '--include-tests',
    description: '包含测试文件',
    helpDescription: '包含测试文件',
    docDescription: '包含测试文件关联',
    parse: { type: 'boolean', default: false },
  },
  {
    name: 'include-git-history',
    flags: '--include-git-history',
    description: '包含 Git 历史',
    helpDescription: '包含 Git 历史',
    docDescription: '包含 Git 历史分析',
    parse: { type: 'boolean', default: false },
  },
  {
    name: 'json',
    flags: '--json',
    description: 'JSON 格式输出',
    helpDescription: 'JSON 格式输出',
    docDescription: 'JSON 格式输出',
    parse: { type: 'boolean', default: false },
  },
  {
    name: 'structured',
    flags: '--structured',
    description: '输出完全结构化的 JSON（不包含自然语言字符串，需要配合 --json 或 --output-mode=machine 使用）',
    helpDescription: '输出完全结构化的 JSON（移除自然语言字符串）',
    docDescription: '纯结构化输出（移除自然语言字段，配合 `--json` 使用）',
    parse: { type: 'boolean', default: false },
  },
  {
    name: 'output-mode',
    flags: '--output-mode <mode>',
    description: '输出模式 (machine|human)',
    helpDescription: '输出模式 (machine|human)',
    docDescription: '输出模式：`machine`/`human`',
    docDefaultValue: 'human',
    parse: { type: 'string' },
  },
  {
    name: 'help',
    flags: '-h, --help',
    description: '显示帮助',
    helpDescription: '显示帮助',
    parse: { type: 'boolean', short: 'h', default: false },
    includeInCommander: false,
    includeInDocs: false,
  },
] as const;

export const ANALYZE_PARSE_OPTIONS = Object.fromEntries(
  ANALYZE_OPTION_DEFINITIONS.map(option => [option.name, option.parse])
) as NonNullable<ParseArgsConfig['options']>;

export function applyAnalyzeCliOptions(command: Command): Command {
  for (const option of ANALYZE_OPTION_DEFINITIONS) {
    if (option.includeInCommander === false) {
      continue;
    }

    if (option.defaultValue !== undefined) {
      command.option(option.flags, option.description, option.defaultValue);
      continue;
    }

    command.option(option.flags, option.description);
  }

  return command;
}

export function configureAnalyzeCommand(command: Command): Command {
  applyAnalyzeCliOptions(command);
  command.addHelpText('after', renderAnalyzeAfterHelpText());
  return command;
}

export function renderAnalyzeHelpOptions(): string {
  const visibleOptions = ANALYZE_OPTION_DEFINITIONS.filter(option => option.helpDescription);
  const maxFlagsLength = visibleOptions.reduce(
    (max, option) => Math.max(max, option.flags.length),
    0
  );

  return visibleOptions
    .map(option => `  ${option.flags.padEnd(maxFlagsLength)}  ${option.helpDescription}`)
    .join('\n');
}

export const ANALYZE_HELP_EXAMPLES = [
  'codemap analyze -i find -k "SourceLocation" --json --structured',
  'codemap analyze -i read -t src/index.ts --scope transitive --json',
  'codemap analyze -i link -t src/utils --json',
  'codemap analyze -i show -t src/ --output-mode human'
] as const;

export function renderAnalyzeHelpExamples(): string {
  return ANALYZE_HELP_EXAMPLES.map(example => `  ${example}`).join('\n');
}

export function renderAnalyzeAfterHelpText(): string {
  return `\n示例:\n${renderAnalyzeHelpExamples()}`;
}

export function getAnalyzeHelpText(programName: string = 'mycodemap'): string {
  const root = new Command().name(programName);
  const analyzeCommand = configureAnalyzeCommand(
    root.command('analyze').description(ANALYZE_COMMAND_DESCRIPTION)
  );
  const baseHelp = analyzeCommand.helpInformation();
  return `${baseHelp}${renderAnalyzeAfterHelpText()}`;
}
