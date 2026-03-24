# 03-02 Summary

## 完成内容
- 在 `src/orchestrator/types.ts` 增加 `warnings[]`、`analysis`、`ComplexityMetrics`，为 `read/link/show` 提供明确的 machine-readable schema。
- 在 `src/cli/commands/analyze.ts` 落地 `read/link/show` 聚合：
  - `read` 聚合 `impact + complexity`
  - `link` 聚合 `dependency + reference`
  - `show` 输出最小可用的 overview/documentation summary
- 在兼容窗口内为 legacy intent 返回结构化 `warnings[]`，不污染 JSON stdout。
- 在 `src/orchestrator/confidence.ts` 收口到 public `find/read/link/show` 语义，同时保留 legacy alias normalize。
- 更新 `src/orchestrator/__tests__/types.test.ts` 与 `src/orchestrator/__tests__/confidence.test.ts`，使测试以 public 4 intent 为主事实。

## 验证
- `tsc -p tsconfig.json --noEmit --pretty false`
- `pnpm exec vitest run src/orchestrator/__tests__/types.test.ts src/orchestrator/__tests__/confidence.test.ts`
- `npm run build`
- `node dist/cli/index.js analyze -i read -t src/cli/index.ts --json`
- `node dist/cli/index.js analyze -i link -t src/cli/index.ts --json`
- `node dist/cli/index.js analyze -i reference -k SourceLocation --json`
- `node dist/cli/index.js analyze -i show -t src/cli/index.ts --json`

## 失败场景预演
- 若 legacy intent warning 继续走 stdout 文本拼接，`--json` 机器消费会被污染；本次通过 `warnings[]` 结构化字段规避。
- 若 `reference` 兼容路径仍沿用“targets 必填”，旧工作流里的 `reference + keywords` 会在兼容窗口内直接失效；本次保留了该 keyword-only 通路。

## 剩余风险
- `link.reference` 当前基于 CodeMap 的 imports/exports/符号匹配生成，语义比真正的 call graph 更保守，后续若要升级精度，应在单独 phase 引入更稳定的数据源。
- `show` 当前是最小可用 summary 壳，没有重开旧 `report` public surface。
