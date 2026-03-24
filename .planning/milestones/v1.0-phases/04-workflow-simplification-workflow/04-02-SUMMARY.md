# 04-02 Summary

## 完成内容

- 将 `README.md` 的 workflow 章节从 legacy 6 阶段改写为分析型 4 阶段，并移除“模板改变阶段顺序”的旧叙述。
- 将 `docs/ai-guide/COMMANDS.md` 的 workflow 章节改写为 `find / read / link / show` 阶段模型，并补上“模板仅调阈值”的说明。
- 将 `src/orchestrator/workflow/__tests__/types.test.ts`、`phase-checkpoint.test.ts`、`workflow-persistence.test.ts` 的示例数据统一切换到四阶段，避免测试继续传播旧语义。

## 验证

- `pnpm exec vitest run src/orchestrator/workflow/__tests__/types.test.ts src/orchestrator/workflow/__tests__/phase-checkpoint.test.ts src/orchestrator/workflow/__tests__/workflow-persistence.test.ts`
- `pnpm exec vitest run src/orchestrator/workflow/__tests__`
- `node dist/cli/index.js workflow status`
- `node dist/cli/index.js workflow visualize`
- `node dist/cli/index.js workflow template apply bugfix`

## 失败场景预演

- 若 README 继续保留 `implementation / commit / ci` 阶段，用户会误把 workflow 当成“执行代码 + 跑门禁”的产品面；本次改为显式声明这些职责回到 `ci` / `ship`。
- 若测试继续使用旧阶段名，后续维护者极易把错误样例复制回代码或文档；本次直接清掉这些示例源。

## 剩余风险

- 当前 docs guardrail 还没有把 workflow 四阶段写成硬规则；这一点需要在 Phase 6 与文档护栏一起收口。
