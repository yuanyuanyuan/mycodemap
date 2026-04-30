// [META] since:2026-04-30 | owner:cli-team | stable:false
// [WHY] Interface contract for the `deps` command family

import type { CommandContract } from '../types.js';

export const depsContract: CommandContract = {
  name: 'deps',
  description: '分析项目模块依赖关系',
  args: [],
  flags: [
    {
      name: 'module',
      short: 'm',
      long: 'module',
      description: '查看指定模块的依赖',
      type: 'string',
    },
    {
      name: 'json',
      short: 'j',
      long: 'json',
      description: 'JSON 格式输出',
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
  ],
  outputShape: {
    description: '依赖分析结果',
    type: 'object',
    properties: [
      // Mode A: specific module detail (when -m is used)
      {
        name: 'module',
        type: 'object',
        nullable: true,
        description: '指定模块的依赖详情（当使用 -m 参数时）',
        properties: [
          { name: 'path', type: 'string' },
          { name: 'relativePath', type: 'string' },
          {
            name: 'location',
            type: 'object',
            properties: [
              { name: 'file', type: 'string' },
              { name: 'line', type: 'number' },
              { name: 'column', type: 'number' },
            ],
          },
          {
            name: 'dependencies',
            type: 'array',
            items: {
              name: 'dependencyPath',
              type: 'string',
            },
          },
          {
            name: 'dependents',
            type: 'array',
            items: {
              name: 'dependentPath',
              type: 'string',
            },
          },
          {
            name: 'dependentsMap',
            type: 'array',
            nullable: true,
            items: {
              name: 'dependentEntry',
              type: 'object',
              properties: [
                { name: 'id', type: 'string' },
                { name: 'path', type: 'string' },
              ],
            },
          },
        ],
      },
      // Mode B: all-modules summary (when -m is omitted)
      {
        name: 'allDependencies',
        type: 'object',
        nullable: true,
        description: '全局依赖汇总（当未使用 -m 参数时）',
      },
      {
        name: 'modules',
        type: 'array',
        nullable: true,
        description: '模块列表（当未使用 -m 参数时）',
        items: {
          name: 'moduleSummary',
          type: 'object',
          properties: [
            { name: 'path', type: 'string' },
            { name: 'relativePath', type: 'string' },
            {
              name: 'location',
              type: 'object',
              properties: [
                { name: 'file', type: 'string' },
                { name: 'line', type: 'number' },
                { name: 'column', type: 'number' },
              ],
            },
            { name: 'type', type: 'string' },
            { name: 'count', type: 'number' },
          ],
        },
      },
    ],
  },
  errorCodes: [
    { code: 'INDEX_NOT_FOUND', description: '代码地图索引不存在，需先运行 generate' },
    { code: 'MODULE_NOT_FOUND', description: '指定的模块路径未找到' },
    { code: 'PARSE_ERROR', description: '代码地图 JSON 解析失败' },
  ],
  examples: [
    'codemap deps -m src/index.ts --json',
    'codemap deps --json --structured',
    'codemap deps -m src/utils/helpers.ts',
  ],
};
