// [META] since:2026-05-01 | owner:cli-team | stable:false
// [WHY] Interface contract for the `init` command family

import type { CommandContract } from '../types.js';

export const initContract: CommandContract = {
  name: 'init',
  description: '初始化并收敛 CodeMap 项目状态',
  args: [],
  flags: [
    {
      name: 'yes',
      short: 'y',
      long: 'yes',
      description: '使用默认配置，不询问',
      type: 'boolean',
      defaultValue: false,
    },
    {
      name: 'interactive',
      long: 'interactive',
      description: '仅显示 reconciliation preview，不写入文件',
      type: 'boolean',
      defaultValue: false,
    },
    {
      name: 'json',
      short: 'j',
      long: 'json',
      description: 'JSON 格式输出收据',
      type: 'boolean',
      defaultValue: false,
    },
  ],
  outputShape: {
    description: '初始化结果收据',
    type: 'object',
    properties: [
      {
        name: 'converged',
        type: 'boolean',
        description: '是否已收敛',
      },
      {
        name: 'configPath',
        type: 'string',
        nullable: true,
        description: '配置文件路径',
      },
      {
        name: 'created',
        type: 'array',
        description: '创建的文件列表',
        items: {
          name: 'file',
          type: 'object',
          properties: [
            { name: 'path', type: 'string' },
            { name: 'type', type: 'string', description: 'config | hook | rule | receipt' },
          ],
        },
      },
      {
        name: 'warnings',
        type: 'array',
        nullable: true,
        description: '警告信息',
        items: {
          name: 'warning',
          type: 'object',
          properties: [
            { name: 'message', type: 'string' },
            { name: 'severity', type: 'string' },
          ],
        },
      },
    ],
  },
  errorCodes: [
    { code: 'INIT_ALREADY_INITIALIZED', description: '项目已初始化，使用 --yes 强制覆盖' },
    { code: 'INIT_CWD_NOT_FOUND', description: '当前目录不存在' },
  ],
  examples: [
    'codemap init',
    'codemap init -y',
    'codemap init --interactive',
    'codemap init --json',
  ],
};
