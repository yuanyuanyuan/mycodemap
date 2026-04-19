# Requirements: repo-local rule control system and hooks/CI QA hardening

**Defined:** 2026-04-19
**Core Value:** 为人类与 AI / Agent 提供可信的代码上下文、设计交接边界与后续演化决策依据。
**Source Phase:** `Phase 27`
**Previous Completed Follow-up:** `post-v1.6 Symbol-level graph and experimental MCP thin slice`

## Completed Requirements

- [x] **P27-NOW-CAPABILITY-REPORT**: 必须提供 repo-local capability baseline，显式区分 required / optional / strategy 状态，并输出结构化 JSON 与 `duration_ms`
- [x] **P27-NOW-VALIDATE-RULES**: 必须提供单一 repo-local validator contract，固定 `report-only` 与 `0/1/2/3/4` gate exit-code 语义
- [x] **P27-NOW-HOOKS-CI-QA**: pre-commit / commit-msg / CI / QA 必须围绕同一 validator truth 工作，而不是各自漂移
- [x] **P27-NOW-SOFT-GATE-DEFAULTS**: repo-local rule system 必须默认启用 path-based routing 与 advisory soft gate，但 hard gate 默认保持 `report-only`
- [x] **P27-NOW-SUBAGENT-RULE-INJECTION**: execute / quick 等常用 workflow 在 spawn subagent 前必须显式注入 scoped `<rule_context>`
- [x] **P27-NOW-WORKFLOW-VALIDATION**: 规则系统行为必须有 executable QA 与自动化回归，而不是只靠文档或 agent 自述
- [x] **P27-NOW-NO-VERIFY-BACKSTOP**: `git commit --no-verify` 只能跳过本地 hooks，不能绕过 CI rule validation backstop

## Constraints

| Boundary | Why |
|----------|-----|
| 规则加载必须按编辑文件路径推断 | 避免再次退化成“AI 记得加载规则才生效”的脆弱模式 |
| unavailable / missing dependency 必须显式建模 | 不能把缺能力或缺依赖伪装成绿色通过 |
| hard gate 默认保持 `report-only` | 先把真实 contract 收口，再逐步提高阻断力度，避免首次落地直接破坏开发流 |
| subagent rule context 必须最小化 | 防止把整个 rules 目录塞进 prompt，导致串味或上下文膨胀 |
| QA 必须可执行且可复现 | 不能只留口头“已验证”，必须能从 `/tmp` fixture 与自动化测试重放 |

## Failure Rehearsal

- **风险模式 1**: capability / validator 把 unavailable 伪装成 pass，导致 hooks / CI 给出虚假绿色
- **风险模式 2**: `git commit --no-verify` 跳过本地 hooks 后，CI 没有真实 backstop
- **风险模式 3**: subagent prompt 注入全量规则而不是 scoped rules，造成无关上下文污染
- **风险模式 4**: disabled soft gate 仍然输出 advisory 或改变 Write/Edit 行为，破坏 non-blocking 预期
- **风险模式 5**: Phase 27 只更新文档，不提供可执行 QA，后续无法确认真实行为

## Deferred

- 扩大 `scripts/rule-context.mjs` 的路径覆盖到更多根级配置与非当前重点目录
- 进一步收紧 docs guardrail 的触发范围，使其与工程文档完全一致
- 对真实 Claude/Codex 运行时的 hook UI 呈现做更细粒度 dogfood 验证
- 若后续需要，再把 `hard_gate.mode` 从 `report-only` 提升为更强 enforcement

## Out of Scope

| Feature | Reason |
|---------|--------|
| 把 repo-local rule system 直接升级成全仓强阻断 hard gate | 当前阶段先验证 contract 与 backstop，不扩大阻断面 |
| 为所有仓库路径补齐完整 rule routing taxonomy | 当前只覆盖 Phase 27 关键路径，避免 scope 膨胀 |
| 把 hook advisory 渲染做成复杂 UI 或交互系统 | 当前目标是 advisory-only 事实注入，不是 UI 产品化 |
| 恢复 `Phase 22-24` 或重开 Docker / ArcadeDB | 与当前 rule-control hardening scope 无关 |

## Traceability

| Requirement | Phase / Plan | Status | Notes |
|-------------|--------------|--------|-------|
| P27-NOW-CAPABILITY-REPORT | Phase 27 / Plan 01 | Complete | capability baseline JSON contract 与单测已落地 |
| P27-NOW-VALIDATE-RULES | Phase 27 / Plan 02 | Complete | validator CLI 与 exit-code contract 已锁定 |
| P27-NOW-HOOKS-CI-QA | Phase 27 / Plan 04, 06 | Complete | hooks / CI wiring 与 QA 覆盖均已验证 |
| P27-NOW-SOFT-GATE-DEFAULTS | Phase 27 / Plan 03, 05 | Complete | repo-local config 默认值与 advisory hook 已落地 |
| P27-NOW-SUBAGENT-RULE-INJECTION | Phase 27 / Plan 05 | Complete | execute / quick workflow 的 scoped `<rule_context>` 注入已落地 |
| P27-NOW-WORKFLOW-VALIDATION | Phase 27 / Plan 03, 05, 06 | Complete | docs truth、workflow 注入与 executable QA 已收口 |
| P27-NOW-NO-VERIFY-BACKSTOP | Phase 27 / Plan 04 | Complete | CI `Rule validation backstop` 保证 `--no-verify` 不能绕过最终校验 |

**Coverage:**
- Completed requirements: 7 total
- Mapped to plans: 7
- Unmapped: 0

---
*Requirements defined: 2026-04-19*
*Last updated: 2026-04-19 after completing and verifying Phase 27*
