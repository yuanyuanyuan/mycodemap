---
date: 2026-04-20
topic: mycodemap-init-enhancements
focus: 把 mycodemap init 从“创建根目录配置文件”升级为“项目级 AI 助手基础设施初始化器”
mode: repo-grounded
---

# Ideation: mycodemap init enhancements

## Grounding Context

### Codebase Context

- [证据] 当前 `src/cli/commands/init.ts` 主要只处理根目录 `mycodemap.config.json` / `codemap.config.json` 的存在检查、旧配置迁移和默认配置写入。
- [证据] `src/cli/paths.ts` 仍以根目录配置文件作为发现入口，而 `src/cli/config-loader.ts` 的默认 `output` 已转向 `.mycodemap`，但默认 `storage.outputPath` 仍是 `.codemap/storage`。
- [证据] `src/cli/first-run-guide.ts` 已把 marker 放进 `.mycodemap/`，但欢迎语仍把 init 叙述成“初始化配置”而不是“初始化 AI 工作区”。
- [证据] 仓库已经拥有可复用的 `.githooks/`、规则校验脚本、first-run guide、chalk + emoji + 中文 CLI 风格。

### Past Learnings

- [推论] 当前最大的产品问题不是“功能不存在”，而是“看起来成功但其实只做了一部分”。
- [推论] 半迁移状态应该被显式解释、对账和修复，而不是继续依赖隐式 fallback。
- [证据] 本 phase 已锁定：不自动修改用户 `CLAUDE.md` / `AGENTS.md`，并要求在 `.mycodemap/` 中集中化 config、rules、workflow、logs 等资产。

### External Context

- [推论] 2024–2026 的主流 AI / dev tooling 明显收敛到“双层结构”：隐藏目录存放 tool-owned 资产，显式文件存放 team-owned / shared rules。
- [推论] hooks 安装的成熟心智是 ownership、冲突检测、可逆迁移，而不是静默覆盖。
- [推论] 最贴近市场共识的做法不是自动改用户上下文文件，而是生成 tool-owned bundle + 明确的人工接入片段。

## Ranked Ideas

### 1. Init Reconciler Dashboard
**Description:** [推论] 让 `mycodemap init` 先扫描 config / workspace / hooks / rules / first-run 状态，再展示统一状态表并执行勾选后的 reconcile，而不是一上来创建文件。
**Rationale:** [推论] 这是最强的主心智重写：它同时吸收了“状态透明”“半迁移修复”“不新增 sync surface”三条信号，并把 init 从 file-creator 提升为 repo-state reconciler。
**Downsides:** [观点] 需要先定义稳定的状态模型和 CLI 展示格式，否则实现容易碎片化。
**Confidence:** 93%
**Complexity:** Medium
**Status:** Explored

### 2. Bootstrap Receipt + Managed Asset Ledger
**Description:** [推论] 每次 init 产出 receipt，并在 `.mycodemap/` 持久化 ledger / manifest，记录配置、hooks、rules、exports、marker 的 ownership、origin、hash、版本、rollback hint 和当前状态。
**Rationale:** [推论] 这是把“看起来成功但其实没做完”变贵的最直接手段，也为后续 rerun、support、sync、future commands 提供统一事实源。
**Downsides:** [观点] 若 schema 设计过重，容易提前抽象；需要克制到“只记录会复用的事实”。
**Confidence:** 90%
**Complexity:** Medium
**Status:** Unexplored

### 3. Drift-First Compatibility Bridge
**Description:** [推论] 把根配置、旧 `.codemap/storage`、旧路径 fallback、旧文档心智全部视为显式 drift；init 负责解释旧世界和新 canonical `.mycodemap/config.json` 的关系，并提供 forward / rollback 指引。
**Rationale:** [推论] 这是最直击当下 repo 痛点的方向：它不是再加一个功能，而是修复“根配置 vs `.mycodemap` 工作区”的双中心叙事。
**Downsides:** [观点] 需要同时碰实现、文档和路径叙事；若边界定义不清，会继续扩大兼容负担。
**Confidence:** 91%
**Complexity:** Medium
**Status:** Unexplored

### 4. Ownership-Preserving Hook Contract
**Description:** [推论] 把 hooks 从“复制文件”升级为 ownership negotiation：优先用 shim / adapter 指向 `.mycodemap/hooks/` 下的 canonical assets，显式处理 adopt / preserve / manual / conflict / rollback。
**Rationale:** [推论] hooks 是最高杠杆也最高敏感的边界；这个方向兼顾强能力、可逆性和团队信任，且与外部成熟模式一致。
**Downsides:** [观点] Git 环境差异和已有团队 hooks 形态很多，边缘案例会拖高实现复杂度。
**Confidence:** 86%
**Complexity:** Medium-High
**Status:** Unexplored

### 5. Rules Link Mode + Assistant Compatibility Pack
**Description:** [推论] 在 `.mycodemap/rules/`、`.mycodemap/exports/`、`.mycodemap/assistants/` 中生成可引用的 rules bundle、copy-paste include blocks、per-tool stubs 和文档片段，而不是自动改 `CLAUDE.md` / `AGENTS.md`。
**Rationale:** [推论] 这条路最贴近行业共识：隐藏目录归工具，显式上下文归团队；同时把多工具接入和文档同步成本一起压低。
**Downsides:** [观点] 用户仍需手动完成最后一步粘贴；若提示文案不够强，可能有人觉得“不够自动化”。
**Confidence:** 88%
**Complexity:** Medium
**Status:** Unexplored

### 6. First-Run Concierge + Bootstrap Profiles
**Description:** [推论] 把 first-run guide 重写成状态驱动的 remediation concierge，并用少量 profile（如 Minimal / Guardrails / Team Ready）承载交互式一键选择。
**Rationale:** [推论] 这是最低成本修复 mental model 的方法：既改善第一分钟体验，也避免 init 变成一长串低层开关。
**Downsides:** [观点] profile 设计如果过粗，会掩盖复杂边界；如果过细，又会退化回问卷。
**Confidence:** 84%
**Complexity:** Low-Medium
**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | `.mycodemap` as Agent Control Plane | [推论] 更像 framing，总体价值已被 #3 和 #5 吸收 |
| 2 | `Manual Action Needed` as success | [推论] 是 #1 / #2 的成功语义，不值得独立成产品方向 |
| 3 | `Project Safety Contracts` framing | [观点] 叙事强但产品增量弱，更适合后续命名或定位文案 |
| 4 | `Customs Declaration Lanes` | [推论] 是 status receipt 的隐喻版本，重复度高 |
| 5 | `Building Commissioning Sheet` | [推论] 与 Reconciler Dashboard / Drift-First 思路重复 |
| 6 | `Board Game Setup Tray` | [推论] 是 Profiles 的隐喻版，没有新增结构价值 |
| 7 | `Canonical Locator Map` | [观点] 更像 #2 / #3 的内部机制，而非顶层 ideation winner |
| 8 | `Migration Journal + Undo Receipts` | [推论] 很有价值，但已折叠进 #2 的 ledger 方案 |
| 9 | `Capability Matrix for Downstream Commands` | [推论] 值得做，但依赖 #2 的事实层先成立 |
| 10 | `Portable Hook Adapter Contract` | [推论] 作为 hook 方向的底层机制已吸收到 #4 |
| 11 | `Doc Snippet Registry` | [推论] 已并入 #5 的 compatibility pack |
| 12 | `Recovery Partition + Bootloader` | [观点] 类比很强，但太偏实现隐喻，顶层价值已并入 #4 |
