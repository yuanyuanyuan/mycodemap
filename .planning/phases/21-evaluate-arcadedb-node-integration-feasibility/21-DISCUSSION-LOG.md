# Phase 21: Evaluate ArcadeDB Node integration feasibility - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `21-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 21-evaluate-arcadedb-node-integration-feasibility
**Areas discussed:** Connectivity topology, Experiment containment, Decision posture, Validation evidence
**Mode note:** 本轮运行处于 execute/default 回退路径，未使用交互式菜单；以下选择为基于 roadmap、requirements、seed artifacts、当前 storage/config/docs truth 与官方 ArcadeDB 文档的 auto-default 决策。

---

## Connectivity topology

| Option | Description | Selected |
|--------|-------------|----------|
| HTTP/JSON primary, Bolt secondary, embedded excluded | 以官方 server mode 的 HTTP/JSON 作为 Node 主实验路径；Bolt 只做兼容面旁证；embedded 明确排除出 Node runtime 假设 | ✓ |
| Bolt-first via Neo4j driver | 更接近图数据库心智，但会把“兼容 Neo4j driver”误读为“已适配当前 storage/config surface” | |
| Embedded-first proof of concept | 看似延续原 seed 直觉，但与官方 embedded/JVM 定位冲突，属于错误前提 | |

**User's choice:** Auto default — HTTP/JSON primary, Bolt secondary, embedded excluded  
**Notes:** `ARC-01` 要求先核实官方支持面；既然 embedded 文档指向 JVM / Java API，而 client/server 文档明确提供 HTTP 与 Bolt，Phase 21 的主路径就不该再围绕 embedded 打转。

---

## Experiment containment

| Option | Description | Selected |
|--------|-------------|----------|
| Evidence-only containment outside public storage surface | 只允许相位工件、research、support matrix、一次性 harness；不改 `storage.type`、schema、CLI 或 shipped adapter | ✓ |
| Add hidden internal adapter first | 代码看起来更“实在”，但会在证据不足时提前扩大 runtime 与 docs blast radius | |
| Directly introduce `storage.type = \"arcadedb\"` behind caveat docs | 最快看到产品面，但本质上是把 feasibility phase 偷换成 implementation | |

**User's choice:** Auto default — Evidence-only containment outside public storage surface  
**Notes:** `ARC-02` 明确要求最小实验路径“不污染当前 public storage surface”；当前 config/schema 也没有表达远端 `uri/auth/tls` 的能力，所以先隔离实验才是唯一稳妥路线。

---

## Decision posture

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit GO / NO-GO / CONDITIONAL outcome | 允许 Phase 21 以证据为准给出推进、拒绝或条件推进结论，不把“做出了代码”误当成功 | ✓ |
| Implicitly bias toward GO if any protocol works | 只要能连上就默认推进，容易忽略产品面与运维面成本 | |
| Avoid decision, just collect notes | 信息看似中立，但会把风险推给后续 phase，等于没有完成 feasibility | |

**User's choice:** Auto default — Explicit GO / NO-GO / CONDITIONAL outcome  
**Notes:** `ARC-05` 要求的是带证据的决策，而不是技术游记。若官方支持面与当前 local-first 边界不兼容，明确 `NO-GO` 比继续写适配器更正确。

---

## Validation evidence

| Option | Description | Selected |
|--------|-------------|----------|
| Support matrix + blast radius + smoke strategy + benchmark strategy | 先做事实矩阵、前提条件、失败预演与验证方法，再决定是否值得进入后续 backend phase | ✓ |
| Placeholder performance comparison | 先写“可能更快/更适合”的 narrative，后面再补验证 | |
| Happy-path connectivity demo only | 只证明某个协议能连通，但无法说明产品面和配置面是否可接受 | |

**User's choice:** Auto default — Support matrix + blast radius + smoke strategy + benchmark strategy  
**Notes:** `ARC-03` / `ARC-04` 的重点不是“跑起来一次”，而是量化要改多少 surface、如何验证、何处会失败。现成失败模式至少包括：误把 embedded Java API 当 Node SDK，以及 server-backed 连接参数无法由当前 schema 表达。

---

## the agent's Discretion

- support matrix 的最终维度与评分口径
- 是否在 research 阶段补充 PostgreSQL wire protocol 旁证
- disposable harness 的目录命名与 artifact 组织方式

## Deferred Ideas

- 正式 `ArcadeDBStorage` 适配器与 `storage.type = "arcadedb"` 产品化 —— future phase
- server lifecycle / credential UX / TLS 配置契约 —— future phase
- 真正的 ArcadeDB vs Kùzu 基准对比 —— 待支持拓扑与 smoke path 锁定后再开 phase
