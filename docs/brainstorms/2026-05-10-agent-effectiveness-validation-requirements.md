---
date: 2026-05-10
topic: agent-effectiveness-validation
---

# CodeMap Agent 效果验证基础设施

## Summary

新建 `codemap agent-metrics` 命令，提供 token 成本分析维度的 agent 有效性指标。MVP 为 CLI 离线报告，后续演进到 MCP gateway 持续采集 + CI 门禁 + agent 行为分类。目标是消除"CodeMap 对 agent 划不划算"这个当前完全盲区。

---

## Problem Frame

CodeMap 声称将 agent 调用从 6+ 次降到 1 次，但从未算过 token 总账——一次 CodeMap 调用返回大量 JSON 可能消耗数千 tokens，而等价的文本搜索调用可能只需数百 tokens。调用次数下降不等于成本下降。

更根本的问题是：我们完全不知道 agent 用完 CodeMap 后做了什么。是直接继续工作（结果有用），还是掉头去用 rg/grep（结果没用）？没有任何信号能回答这个问题。parser 改动、输出格式变化都可能悄悄让 agent 变得不爱用 CodeMap，而我们发现不了。

现有的 benchmark 命令只做 WASM vs Native 启动性能对比，不覆盖 token 或行为维度。dogfood report 是一次性手动评估，无法检测回归。

---

## Actors

- A1. **CodeMap 开发者**：日常查看 agent-metrics 报告，据此决定优化方向（哪些查询类型 token 成本过高）
- A2. **CI pipeline**：自动运行 agent-metrics，当 token 成本超阈值时发出警告或阻断 merge
- A3. **AI agent**：CodeMap 的消费者，agent 的调用模式是指标的原始数据来源

---

## Requirements

**Token 成本分析**

- R1. 命令能对一组代表性 CodeMap 查询（find callers、impact analysis、dependency trace 等）执行 token 成本分析
- R2. 每个查询报告响应的 JSON 大小、估算 token 数（input + output），以及按查询类型的基线统计
- R3. 按查询类型追踪绝对 token 成本趋势（不与 rg/grep 对比，因为两者信息密度不同，直接对比无意义）
- R4. 识别 token 成本最高的查询类型，标注哪些场景的 token 消耗可能抵消调用次数减少的收益

**报告与输出**

- R8. 提供人类可读的格式化报告（表格 + 摘要）
- R9. 提供 JSON 输出模式（`--json`），支持 CI 管道消费
- R10. 报告包含按查询类型分组的汇总统计（平均 token 数、响应大小分布）

**CI 集成**

- R11. 支持阈值参数（`--max-tokens-per-query`），当单次查询 token 成本超过指定上限时返回非零退出码
- R12. CI 模式下输出简洁的 pass/fail 摘要，附带关键指标

**命令结构**

- R13. 命令入口为 `codemap agent-metrics`，子命令为 `token`（token 成本分析）和 `report`（聚合报告，支持 `--json` 和阈值参数）
- R14. 无参数运行时等价于 `codemap agent-metrics report`，执行完整 token 分析并输出报告

---

## Acceptance Examples

- AE1. **Covers R1, R2, R3.** Given a TypeScript project with 100+ files, when running `codemap agent-metrics token`, then the output shows per-query-type token estimates and cost trends.
- AE2. **Covers R11, R12.** Given `codemap agent-metrics report --max-tokens-per-query 5000`, when a query type averages 7000 tokens, then exit code is non-zero and output shows which query types exceeded the threshold.
- AE4. **Covers R8, R9.** When running `codemap agent-metrics report --json`, then the output is valid JSON containing all metrics. When running without `--json`, then the output is a human-readable formatted table.

---

## Success Criteria

- 开发者能在一个命令中看到 CodeMap 的 token 经济账，不再依赖感觉判断工具成本效益
- CI pipeline 能自动检测 token 成本回归（如 parser 改动导致输出膨胀）

---

## Scope Boundaries

- 不做 A/B harness（CodeMap-enabled vs text-search-only 对比）——太重，需要定义 ground truth，后续可作为独立功能
- 不做 Zero-Touch Git History 自动测试用例生成——好方向但实现成本高，后续可作为 `agent-metrics` 的数据源。注意：从 git history 提取查询场景（Key Decisions）是该方向的轻量子集——只提取场景描述（commit message pattern → query type 映射），不自动生成测试用例或 ground truth 验证
- 不做 Adoption Decay 持续监控——需要 gateway 持续采集，CLI-only 模式做不了
- 不做 Precision-Weighted Cost Model——需要真实 agent session 数据校准，当前阶段缺乏数据
- 不做 Agent-Perceived Latency 重定义——相关但独立，可以后续扩展
- 不做 MCP gateway 持续采集——v2 范围，本次只做 CLI 离线报告
- 不做 Agent 行为分类（accepted/re-queried/abandoned）——需要 MCP gateway 实时数据，CLI-only 模式无法实现，推迟到 v2

---

## Key Decisions

- **新建命令而非扩展 benchmark**：benchmark 聚焦 parser/storage 性能，agent-metrics 聚焦 agent 有效性，职责不同。分开避免 benchmark 命令膨胀。
- **token 估算用近似值**：JSON 大小 → token 数的启发式转换（约 4 chars/token），不要求精确到个位 token。精确计算需要实际 tokenizer 集成，成本不值得。校准 deferred to planning。
- **查询场景从 git history 提取**：不手动定义场景，而是从项目 git history 中自动提取真实的 impact analysis / refactoring / dependency tracing 场景。与 Zero-Touch Git History (#2) 思路一致但范围更小——只提取场景描述，不自动生成测试用例。
- **阈值默认值 deferred to planning**：需要先跑一次 token report 看实际数据分布，再决定合理的默认阈值。

---

## Dependencies / Assumptions

- 现有 benchmark 命令和 MCP server 基础设施可复用（已验证：`src/cli/commands/benchmark.ts`、`src/server/mcp/server.ts`）
- 行为分类逻辑目前不存在于代码库中，需要在 MCP gateway 阶段从头设计
- 项目 git history 包含可识别的 impact analysis / refactoring / dependency tracing 场景（需 planning 阶段确认提取策略和场景类型映射）

---

## Outstanding Questions

### Resolve Before Planning

（无。所有 blocking questions 已解决。）

### Deferred to Planning

- [Affects R2][Technical] token 估算的具体启发式公式——JSON 大小到 token 数的转换系数需要基于实际数据校准
- [Affects R11][Needs research] 默认阈值的合理范围——需要先跑一次 token report 看数据分布
