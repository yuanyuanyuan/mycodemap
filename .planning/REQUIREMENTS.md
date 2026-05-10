# Requirements: CodeMap v2.7 agent-effectiveness-validation

**Defined:** 2026-05-10
**Core Value:** 为人类与 AI / Agent 提供可信的代码上下文、设计交接边界与后续演化决策依据。

## v2.7 Requirements

### Token Analysis

- [ ] **TOKEN-01**: 命令能对一组代表性 CodeMap 查询（find callers、impact analysis、dependency trace 等）执行 token 成本分析
- [ ] **TOKEN-02**: 每个查询报告响应的 JSON 大小、估算 token 数（input + output），以及原始字符数（避免伪精度）
- [ ] **TOKEN-03**: 按查询类型追踪绝对 token 成本趋势（不与 rg/grep 对比，因为两者信息密度不同）
- [ ] **TOKEN-04**: 识别 token 成本最高的查询类型，标注哪些场景的 token 消耗可能抵消调用次数减少的收益
- [ ] **TOKEN-05**: 按查询类型提供分布统计（p50/p95/max），帮助识别异常值

### Report & Output

- [ ] **RPT-01**: 提供人类可读的格式化报告（表格 + 摘要）
- [ ] **RPT-02**: 提供 JSON 输出模式（`--json`），包含 `schemaVersion` 和 `rawCharCount` 字段，支持 CI 管道消费
- [ ] **RPT-03**: 报告包含按查询类型分组的汇总统计（平均 token 数、响应大小分布）

### CI Integration

- [ ] **CI-01**: 支持阈值参数（`--max-tokens-per-query`），当单次查询 token 成本超过指定上限时返回非零退出码
- [ ] **CI-02**: CI 模式下输出简洁的 pass/fail 摘要，附带关键指标
- [ ] **CI-03**: 默认 warn-only 模式，不直接阻断 CI pipeline

### Command Structure

- [ ] **CMD-01**: 命令入口为 `codemap agent-metrics`，子命令为 `token`（token 成本分析）和 `report`（聚合报告）
- [ ] **CMD-02**: 无参数运行时等价于 `codemap agent-metrics report`，执行完整 token 分析并输出报告

## Future Requirements

### Intelligence Layer (deferred to future milestone)

- **INTEL-01**: git history 场景提取——从项目 git history 中自动提取真实的 impact analysis / refactoring / dependency tracing 场景
- **INTEL-02**: 归一化趋势——按 symbol/file 数量归一化 token 成本，区分工具回归与代码库增长
- **INTEL-03**: interface contract 定义——`--schema` 输出支持
- **INTEL-04**: per-query-type 分布统计增强——趋势图、历史对比

### Polish and Stabilization (v2.6)

- **POL-01**: Complexity calculation unify
- **POL-02**: MCP blank-line filter
- **POL-03**: Edge ID normalization
- **POL-04**: Interface Contract `1.0.0`

## Out of Scope

| Feature | Reason |
|---------|--------|
| A/B harness（CodeMap-enabled vs text-search-only） | 太重，需要定义 ground truth，后续可作为独立功能 |
| Agent 行为分类（accepted/re-queried/abandoned） | 需要 MCP gateway 实时数据，CLI-only 模式无法实现 |
| Adoption Decay 持续监控 | 需要 gateway 持续采集，CLI-only 模式做不了 |
| Precision-Weighted Cost Model | 需要真实 agent session 数据校准，当前阶段缺乏数据 |
| Agent-Perceived Latency 重定义 | 相关但独立，可以后续扩展 |
| MCP gateway 持续采集 | v2 范围，本次只做 CLI 离线报告 |
| Exact tokenizer 集成（tiktoken） | 边际精度提升不值得增加依赖和模型特定漂移 |
| 跨工具成本对比（rg/grep） | 信息密度不同，直接对比无意义且误导 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TOKEN-01 | TBD | Pending |
| TOKEN-02 | TBD | Pending |
| TOKEN-03 | TBD | Pending |
| TOKEN-04 | TBD | Pending |
| TOKEN-05 | TBD | Pending |
| RPT-01 | TBD | Pending |
| RPT-02 | TBD | Pending |
| RPT-03 | TBD | Pending |
| CI-01 | TBD | Pending |
| CI-02 | TBD | Pending |
| CI-03 | TBD | Pending |
| CMD-01 | TBD | Pending |
| CMD-02 | TBD | Pending |

**Coverage:**
- v2.7 requirements: 13 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 13

---
*Requirements defined: 2026-05-10*
*Last updated: 2026-05-10 after milestone initialization*
