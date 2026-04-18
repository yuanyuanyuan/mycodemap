# 代码质量红线

> 目标：用最少的文字描述“什么会被挡住、怎么检查、失败后怎么修”。

## 红线表

| 红线 | 命令 | 阈值/级别 | 失败后果 | 恢复方式 |
|---|---|---|---|---|
| 敏感信息硬编码 | `grep -rn "password.*=.*['\"]" src/ --include="*.ts"` | 生产代码出现明文凭证 | 阻断提交/审查 | 改为 `process.env` + 类型检查 |
| 非边界文件使用 `any` | `npm run typecheck` / `npx eslint src --rule '@typescript-eslint/no-explicit-any: error'` | 非测试/边界文件禁止 | 阻断 | 改为具体类型或 `unknown` + 守卫 |
| 函数超过 50 行 | `npx eslint src --rule 'max-lines-per-function: [error, { max: 50, skipBlankLines: true, skipComments: true }]'` | 单函数 > 50 行 | 阻断 | 拆成小函数，保持单一职责 |
| 未处理 Promise | `npx eslint src --rule '@typescript-eslint/no-floating-promises: error'` | 无 `await` / `.catch()` | 阻断 | 显式 `await` 或补错误处理 |
| 遗留 `console.log` | `npx eslint src --rule 'no-console: [error, { allow: [\"error\"] }]'` | `src/cli/runtime-logger.ts` 外禁止 | 阻断 | 换成 `runtime-logger` |
| 未使用 import / 变量 | `tsc --noUnusedLocals --noEmit` / `npm run lint` | 任意未使用符号 | 阻断 | 删除无用 import / 变量 |
| TS 源文件缺少 `[META]` / `[WHY]` | `.githooks/pre-commit` | 非测试 `.ts` 源文件必须有文件头 | 阻断 | 补文件头注释 |

## 默认执行顺序

1. `npm run typecheck`
2. `npm run lint`
3. 变更涉及行为时再补 `npm test`

## 技术债例外

- 只允许在边界场景临时记录 `TODO-DEBT`。
- 例外必须写清：原因、风险、偿还计划。

## 最小提交前清单

- [ ] 无明文凭证
- [ ] 无多余 `any`
- [ ] 无漂浮 Promise
- [ ] 无遗留 `console.log`
- [ ] 无未使用 import
- [ ] `.ts` 文件头完整
