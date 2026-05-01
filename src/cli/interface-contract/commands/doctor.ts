// [META] since:2026-05-01 | owner:cli-team | stable:false
// [WHY] Interface contract for the `doctor` command family

import type { CommandContract } from '../types.js';

export const doctorContract: CommandContract = {
  name: 'doctor',
  description: '诊断 CodeMap 生态系统健康状况',
  args: [],
  flags: [
    {
      name: 'json',
      short: 'j',
      long: 'json',
      description: 'JSON 格式输出诊断结果',
      type: 'boolean',
      defaultValue: false,
    },
    {
      name: 'human',
      long: 'human',
      description: '强制人类可读输出',
      type: 'boolean',
      defaultValue: false,
    },
  ],
  outputShape: {
    description: '诊断报告',
    type: 'object',
    properties: [
      {
        name: 'exitCode',
        type: 'number',
        description: '退出码（0 = 健康，1 = 有问题）',
      },
      {
        name: 'results',
        type: 'array',
        description: '诊断结果列表',
        items: {
          name: 'diagnostic',
          type: 'object',
          properties: [
            { name: 'category', type: 'string', description: '诊断类别: install | config | runtime | agent' },
            { name: 'severity', type: 'string', description: '严重级别: info | warning | error' },
            { name: 'message', type: 'string' },
            { name: 'check', type: 'string', description: '检查项名称' },
          ],
        },
      },
    ],
  },
  errorCodes: [
    { code: 'DOCTOR_RUNTIME_ERROR', description: '诊断运行时出错' },
  ],
  examples: [
    'codemap doctor',
    'codemap doctor --json',
    'codemap doctor --human',
  ],
};
