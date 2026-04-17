# Roadmap: CodeMap

## Milestones

- ✅ **v1.0 AI-first 重构** — Phases 1-6 (shipped 2026-03-24)
- ✅ **v1.1 插件扩展点产品化** — Phases 7-9 (shipped 2026-03-24)
- ✅ **v1.2 图数据库后端生产化** — Phases 10-12 (shipped 2026-03-24)
- ✅ **v1.3 Kùzu-only 收敛与高信号债务清理** — Phases 13-16 (shipped 2026-03-24)
- ✅ **v1.4 设计契约与 Agent Handoff** — Phases 17-20 (shipped 2026-03-26)
- ✅ **post-v1.4 ArcadeDB Node feasibility follow-up** — Phase 21 (completed 2026-03-28)
- 🚧 **v1.5 Isolated ArcadeDB Server-backed Prototype** — Phases 22-25 (active 2026-03-30)

## Overview

`post-v1.4` 已经完成 direct replacement `NO-GO` 的决策闭环，所以当前 active milestone 不再讨论“ArcadeDB 能不能直接替换 KùzuDB”。`v1.5` 的唯一目标，是验证那条仅剩的条件性继续路径：一个 isolated、server-backed、evidence-first 的 prototype。

这里最容易犯的错误不是“做得太慢”，而是“在 live smoke 之前就开始改产品面”。因此 `v1.5` 以失败优先：如果真实 server smoke、auth/TLS 前提、setup friction 或 blast radius 站不住脚，就应该尽早停在 prototype 证据包，而不是继续扩大 shipped surface。

Phase 25 是基于 2026-04-17 dogfood 记录捕获的 out-of-band CodeMap CLI reliability follow-up，独立于 Phase 22-24 的 ArcadeDB continue/pause/close gate；`rtk` 只作为 token 节省工具，不进入 CodeMap 产品 scope。

## Archived Milestone Detail

- `v1.4` roadmap / requirements / audit 已归档到 `.planning/milestones/v1.4-ROADMAP.md`、`.planning/milestones/v1.4-REQUIREMENTS.md`、`.planning/milestones/v1.4-MILESTONE-AUDIT.md`
- `post-v1.4` roadmap / requirements / audit 已归档到 `.planning/milestones/post-v1.4-ROADMAP.md`、`.planning/milestones/post-v1.4-REQUIREMENTS.md`、`.planning/milestones/post-v1.4-MILESTONE-AUDIT.md`
- dormant seed 来源：`.planning/seeds/SEED-001-evaluate-isolated-arcadedb-server-backed-prototype.md`

## v1.5 Isolated ArcadeDB Server-backed Prototype

## Phases

- [ ] **Phase 22: Real ArcadeDB server live smoke gate** - 先证明 isolated live smoke 能在真实 server 上成立，再决定是否值得继续 prototype
- [ ] **Phase 23: Isolated prototype evidence & blast-radius pack** - 在不改 shipped storage surface 的前提下补齐 latency / setup / approval evidence
- [ ] **Phase 24: Continue/Pause/Close decision package** - 用 evidence-backed 决策收尾，明确是否继续、暂停或关闭路线
- [x] **Phase 25: CodeMap CLI dogfood reliability hardening** - 收敛 2026-04-17 dogfood 发现的 `analyze find` 静默失败、扫描配置偏差与 JSON 诊断缺口 (completed 2026-04-17)

### Phase 22: Real ArcadeDB server live smoke gate
**Goal**: 基于真实 ArcadeDB server 验证 isolated smoke harness / prototype seam 是否可跑通，并明确 env、auth、TLS 与 setup 前置条件
**Depends on**: `post-v1.4` archived decision package + `SEED-001`
**Requirements**: PROTO-01
**Success Criteria** (what must be TRUE):
  1. 真实 ArcadeDB server live smoke 在 isolated seam 下成功完成，而不是只停留在离线脚本或 `--help`
  2. 所需 `ARCADEDB_*` env contract、凭证、auth/TLS 前提和 failure modes 被明确记录
  3. 如果 live smoke 跑不通，milestone 允许在此停止，并保持 shipped storage/runtime surface 完全不变
**Status**: Blocked after execution (`No reachable server`; local Docker provisioning still blocked on 2026-03-31 behind proxy)
**Plans**: 2 plans across 2 waves

Failure rehearsal:
- 如果 smoke 只能靠提前修改 shipped config/runtime 才能成立，必须判定当前 milestone 路线失败，而不是把改动合理化成“顺手接一下”。

### Phase 23: Isolated prototype evidence & blast-radius pack
**Goal**: 在 Phase 22 成功的前提下，记录 `handshake latency`、`query latency`、`setup complexity`，并量化 `remote config` / `auth` / `TLS` / `lifecycle` / `docs` 的 blast radius
**Depends on**: Phase 22
**Requirements**: PROTO-02, PROTO-03, PROTO-04
**Success Criteria** (what must be TRUE):
  1. benchmark evidence 仅在 live smoke 成功后记录，且至少覆盖 `handshake/query/setup` 三个维度
  2. prototype 仍保持 isolated experiment boundary，不引入 `storage.type = arcadedb`、public schema 或 shipped runtime integration
  3. config/auth/TLS/lifecycle/docs 的 blast radius 被量化成明确审批输入，而不是模糊地写成“后续再看”
**Status**: Not started
**Plans**: 0 plans yet

Failure rehearsal:
- 如果 latency 或 setup evidence 的采集必须先扩写 public surface，必须停下并把该成本记为 blocker，而不是继续假设“以后再清理”。

### Phase 24: Continue/Pause/Close decision package
**Goal**: 汇总 prototype evidence，给出 `continue / pause / close` 决策、stop conditions 与后续路线建议
**Depends on**: Phase 23
**Requirements**: PROTO-05
**Success Criteria** (what must be TRUE):
  1. milestone 以 evidence-backed `continue / pause / close` 结论收尾，而不是留下“理论可行”的模糊 optimism
  2. 若继续，也只允许提出新的 productization milestone 输入，不能在本 milestone 内直接把 ArcadeDB 变成 shipped backend
  3. README / AI docs / rules 若无需更新，也必须明确写出“不更新的原因”，防止文档真相漂移
**Status**: Not started
**Plans**: 0 plans yet

Failure rehearsal:
- 如果证据互相矛盾、live smoke 不稳定或 ops cost 高于价值，必须输出 `pause` 或 `close`，而不是把不确定性美化成“继续试试”。

### Phase 25: CodeMap CLI dogfood reliability hardening
**Goal**: 基于 `docs/exec-plans/completed/2026-04-17-eatdogfood-codemap-cli.md` 修复 `analyze -i find` 的静默失败风险，并把短期/中期/长期建议收敛成可验证的 CLI 契约改进
**Depends on**: `docs/exec-plans/completed/2026-04-17-eatdogfood-codemap-cli.md`；独立于 Phase 22-24 的 ArcadeDB blocker
**Requirements**: TBD during `$gsd-plan-phase 25`
**Success Criteria** (what must be TRUE):
  1. `analyze -i find -k SourceLocation --json --structured` 这类底层扫描失败场景不再伪装成可信的 0 结果，必须返回显式 warning / failure / `partialFailure` 诊断之一
  2. `analyze find` 的 include/exclude 与 TypeScript 解析策略经过核对，不能绕开 `generate/query` 已使用的配置感知扫描边界
  3. JSON 消费方只读 stdout 时，也能区分“真实 0 命中”和“扫描链路部分失败”
  4. 若 CLI 输出契约、默认推荐路径或 AI 使用模式发生变化，必须同步更新 `AI_GUIDE.md`、`docs/ai-guide/COMMANDS.md`、`docs/ai-guide/OUTPUT.md` 或明确写出无需更新原因
  5. `rtk` 只作为 token 节省/命令包装工具处理，不进入 CodeMap 产品依赖、功能说明或修复范围
**Status**: Complete (out-of-band follow-up finished 2026-04-17; does not unblock Phase 22)
**Plans**: 1/1 plans complete

Failure rehearsal:
- 如果底层 scanner 报错但命令仍以 `confidence.score = low`、`resultCount = 0` 形式成功返回，且 JSON 中没有可机读失败信号，本阶段必须判定失败。

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 22. Live smoke gate | v1.5 | 2/2 | Blocked | — |
| 23. Evidence & blast radius | v1.5 | 0/0 | Not Started | — |
| 24. Decision package | v1.5 | 0/0 | Not Started | — |
| 25. CLI dogfood hardening | v1.5 | 1/1 | Complete   | 2026-04-17 |

## ArcadeDB Exit Gate (Phases 22-24)

- `continue`: 仅当真实 live smoke 成功、latency/setup evidence 可信、且 approval surface 被显式量化后，才允许提议后续 productization milestone
- `pause`: 当 smoke 能跑，但 blast radius / docs / ops 成本暂时高于当前价值时，保留证据后暂停
- `close`: 当 live smoke 不稳定、setup friction 过高，或证明价值必须先改 shipped surface 时，直接关闭路线
- `non-goals remain`: `storage.type = arcadedb`、shipped runtime integration、Kùzu migration、无 live smoke 的 benchmark claims
