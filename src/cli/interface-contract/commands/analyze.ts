// [META] since:2026-04-30 | owner:cli-team | stable:false
// [WHY] Interface contract for the `analyze` command family

import type { CommandContract } from '../types.js';

export const analyzeContract: CommandContract = {
  name: 'analyze',
  description: '统一分析入口 - 支持多种分析意图',
  args: [],
  flags: [
    {
      name: 'intent',
      short: 'i',
      long: 'intent',
      description: '分析类型 (find|read|link|show)',
      type: 'string',
    },
    {
      name: 'targets',
      short: 't',
      long: 'targets',
      description: '目标文件/模块路径（多个）',
      type: 'string',
      multiple: true,
    },
    {
      name: 'keywords',
      short: 'k',
      long: 'keywords',
      description: '搜索关键词（多个）',
      type: 'string',
      multiple: true,
    },
    {
      name: 'scope',
      short: 's',
      long: 'scope',
      description: '范围 (direct|transitive)',
      type: 'string',
    },
    {
      name: 'topK',
      short: 'n',
      long: 'topK',
      description: '返回结果数量（默认 8，最大 100）',
      type: 'number',
      defaultValue: 8,
    },
    {
      name: 'include-tests',
      long: 'include-tests',
      description: '包含测试文件',
      type: 'boolean',
      defaultValue: false,
    },
    {
      name: 'include-git-history',
      long: 'include-git-history',
      description: '包含 Git 历史',
      type: 'boolean',
      defaultValue: false,
    },
    {
      name: 'json',
      long: 'json',
      description: 'JSON 格式输出',
      type: 'boolean',
      defaultValue: false,
    },
    {
      name: 'human',
      long: 'human',
      description: '强制人类可读输出（即使是非 TTY 环境）',
      type: 'boolean',
      defaultValue: false,
    },
    {
      name: 'structured',
      long: 'structured',
      description: '输出完全结构化的 JSON（不包含自然语言字符串，需要配合 --json 使用）',
      type: 'boolean',
      defaultValue: false,
    },
    {
      name: 'output-mode',
      long: 'output-mode',
      description: '输出模式 (machine|human)',
      type: 'string',
      defaultValue: 'human',
    },
  ],
  outputShape: {
    description: '分析结果',
    type: 'object',
    properties: [
      {
        name: 'intent',
        type: 'string',
        description: '执行的分析意图',
      },
      {
        name: 'results',
        type: 'array',
        description: '分析结果列表',
        items: {
          name: 'resultItem',
          type: 'object',
          properties: [
            { name: 'type', type: 'string' },
            { name: 'name', type: 'string' },
            { name: 'path', type: 'string', nullable: true },
            { name: 'details', type: 'string', nullable: true },
          ],
        },
      },
      {
        name: 'metrics',
        type: 'object',
        description: '性能指标',
        nullable: true,
        properties: [
          { name: 'durationMs', type: 'number' },
          { name: 'filesAnalyzed', type: 'number' },
        ],
      },
    ],
  },
  errorCodes: [
    { code: 'INVALID_INTENT', description: '未知的分析意图类型' },
    { code: 'MISSING_TARGET', description: 'read/link/show 意图缺少目标路径' },
    { code: 'INDEX_NOT_FOUND', description: '代码地图索引不存在，需先运行 generate' },
    { code: 'TREE_SITTER_MISSING', description: 'AST 分析需要 tree-sitter 但未安装' },
  ],
  examples: [
    'codemap analyze -i find -k "SourceLocation" --json --structured',
    'codemap analyze -i read -t src/index.ts --scope transitive --json',
    'codemap analyze -i link -t src/utils --json',
    'codemap analyze -i show -t src/ --output-mode human',
  ],
};
