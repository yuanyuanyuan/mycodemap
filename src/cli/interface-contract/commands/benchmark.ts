// [META] since:2026-05-01 | owner:cli-team | stable:false
// [WHY] Interface contract for the `benchmark` command family

import type { CommandContract } from '../types.js';

export const benchmarkContract: CommandContract = {
  name: 'benchmark',
  description: '比较 WASM 与 Native 性能',
  args: [],
  flags: [
    {
      name: 'target',
      short: 't',
      long: 'target',
      description: '目标代码库路径',
      type: 'string',
      defaultValue: '.',
    },
    {
      name: 'mode',
      short: 'm',
      long: 'mode',
      description: '基准测试模式: native | wasm | both',
      type: 'string',
      defaultValue: 'both',
    },
    {
      name: 'iterations',
      short: 'i',
      long: 'iterations',
      description: '迭代次数',
      type: 'number',
      defaultValue: 3,
    },
    {
      name: 'json',
      short: 'j',
      long: 'json',
      description: 'JSON 格式输出',
      type: 'boolean',
      defaultValue: false,
    },
  ],
  outputShape: {
    description: '基准测试结果',
    type: 'object',
    properties: [
      {
        name: 'target',
        type: 'string',
        description: '目标代码库路径',
      },
      {
        name: 'fileCount',
        type: 'number',
      },
      {
        name: 'native',
        type: 'object',
        nullable: true,
        properties: [
          { name: 'coldStartupMs', type: 'number' },
          { name: 'parseInitMs', type: 'number' },
          { name: 'storageInitMs', type: 'number' },
          { name: 'firstFileParseMs', type: 'number' },
          { name: 'totalFiles', type: 'number' },
          { name: 'filesPerSecond', type: 'number' },
        ],
      },
      {
        name: 'wasm',
        type: 'object',
        nullable: true,
        properties: [
          { name: 'coldStartupMs', type: 'number' },
          { name: 'parseInitMs', type: 'number' },
          { name: 'storageInitMs', type: 'number' },
          { name: 'firstFileParseMs', type: 'number' },
          { name: 'totalFiles', type: 'number' },
          { name: 'filesPerSecond', type: 'number' },
        ],
      },
      {
        name: 'penaltyMs',
        type: 'number',
        description: 'WASM 启动惩罚（毫秒）',
      },
      {
        name: 'thresholdMs',
        type: 'number',
        description: '阈值（毫秒）',
      },
      {
        name: 'passesThreshold',
        type: 'boolean',
        description: '是否通过阈值',
      },
    ],
  },
  errorCodes: [
    { code: 'BENCHMARK_TARGET_INVALID', description: '目标路径不存在或不可读' },
    { code: 'BENCHMARK_NO_FILES', description: '目标目录中未找到可分析的文件' },
  ],
  examples: [
    'codemap benchmark',
    'codemap benchmark -t ./src -m both -i 5',
    'codemap benchmark --json',
  ],
};
