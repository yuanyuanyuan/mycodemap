# GSD (get-shit-done) v1.40 实战工作流指南

> 基于官方 skill 源码（`~/.claude/skills/gsd-*/SKILL.md`）与 CodeMap 仓库真实规划产物（`.planning/` 下 40+ phases、10+ milestones）综合整理。
> 本文档目标：不是罗列命令，而是回答"我现在该做什么"。

---

## 目录

1. [一句话定位：GSD 适合你吗？](#1-一句话定位gsd-适合你吗)
2. [五种典型场景，直接找到入口](#2-五种典型场景直接找到入口)
3. [核心六步：不只是命令，是决策链](#3-核心六步不只是命令是决策链)
4. [从 CodeMap 实战看六步怎么跑](#4-从-codemap-实战看六步怎么跑)
5. [Namespace 路由：v1.40 的正确打开方式](#5-namespace-路由v140-的正确打开方式)
6. [质量门禁：什么时候该审查/调试/审计](#6-质量门禁什么时候该审查调试审计)
7. [配置调优：为不同场景选择模型与开关](#7-配置调优为不同场景选择模型与开关)
8. [进阶模式](#8-进阶模式)
9. [常见陷阱与排雷](#9-常见陷阱与排雷)
10. [附录：命令速查与源码索引](#10-附录命令速查与源码索引)

---

## 1. 一句话定位：GSD 适合你吗？

**GSD 解决的核心问题：Context Rot。**

随着 AI 会话变长，上下文窗口被填满，输出质量持续下降。GSD 的做法是：把重活（研究、规划、执行）拆成独立的子代理任务，每个子代理获得**全新的 200K token 上下文**，而主 orchestrator 始终保持 30–40% 的轻量利用率。

**这不是一个项目管理工具。** 你不会用它来排甘特图或算工期。它是一个**AI 编程助手的工作流骨架**——把"我想做个功能"转化为"可验证的、原子化的、有审计追踪的代码变更"。

**CodeMap 的使用背景**：本仓库从 v1.0 到 v2.2 共经历了 11 个 milestone、60+ phases，全部通过 GSD 管理。以下所有"实战经验"均来自这段历程，而非官方示例的理想路径。

---

## 2. 五种典型场景，直接找到入口

别急着背命令。先看你在哪个位置：

### 场景 A：我刚接手一个陌生代码库，想快速理解它
```bash
/gsd-map-codebase --fast
```
**产出**：`STACK.md`、`ARCHITECTURE.md`、`CONVENTIONS.md`、`CONCERNS.md`

**真实经验**（CodeMap Phase 28）：4 个并行 mapper agent 跑完后，我们发现 `CONCERNS.md` 中标记的"入口文档漂移"问题，直接催生了 v1.8 的文档结构收敛 milestone。 codebase mapping 不只是"看看有什么"——它往往是发现技术债的第一扇窗。

**何时不用**：如果你已经熟悉代码库，跳过 mapping，直接 `/gsd-new-project`。

---

### 场景 B：我想从零开始一个新项目
```bash
/gsd-new-project
```
**GSD 会做什么**：
1. 自适应提问（不是问卷，是苏格拉底式 dream extraction）
2. spawn 4 个 researcher 并行调查技术栈、功能、架构、陷阱
3. 合成研究为 `research/SUMMARY.md`
4. 提取 v1/v2/范围外需求
5. 生成分阶段路线图

**产出**：`PROJECT.md`、`REQUIREMENTS.md`、`ROADMAP.md`、`STATE.md`

**真实经验**：CodeMap 的 `PROJECT.md` 第 1 版写于 2026-03 月，到今天（2026-05）已经历 11 次 milestone 边界更新。`PROJECT.md` 不是写一次就丢的——每次 milestone 收口都要回来看"What This Is"还准不准。

**提速模式**：如果你已有 PRD，用 `/gsd-new-project --auto @prd.md` 自动提取，省去问答循环。

---

### 场景 C：项目已有规划，我要执行下一个阶段
```bash
/gsd-progress --next
```
**GSD 会做什么**：
1. 读取 `STATE.md` 和 `ROADMAP.md`
2. 扫描所有历史 phases，找未完成项
3. 自动路由到下一步（discuss / plan / execute / verify）

**真实经验**：这是日常开发最高频的命令。CodeMap v2.1 期间，我们从 Phase 53 一路跑到 Phase 58，几乎全是 `/gsd-progress --next` 驱动的。它省掉的是"我现在该手动跑哪个命令"的认知负担。

**危险**：`--next --force` 会绕过安全门。只在确定当前 phase 状态干净时使用。

---

### 场景 D：我需要快速修个 bug，不想走完整六步
```bash
/gsd-debug "Login button not responding on mobile Safari"
```
**GSD 会做什么**：
1. 生成 debug session slug（`login-button-not-responding`）
2. 进入状态机：`gathering → investigating → fixing → verifying`
3. 产出 `.planning/debug/{slug}.md`，包含假设、证据、已证伪方向

**真实经验**：CodeMap 的 `mycodemap-install-runtime-deps` debug session 持续了多轮对话，session 文件让上下文重置后可以 `/gsd-debug continue login-button-not-responding` 无缝恢复。这是 GSD 比纯聊天最大的优势——**工作状态持久化到磁盘**。

**诊断模式**：只想找根因不修复？`/gsd-debug --diagnose "Intermittent 500 errors"`。产出 ROOT CAUSE FOUND 报告，不碰代码。

---

### 场景 E：我想探索一个想法，但还不确定要不要做
```bash
/gsd-explore "authentication strategy"
```
**GSD 会做什么**：
1. 2-5 轮苏格拉底式对话，每次只问一个问题
2. 若浮现事实性问题，spawn `gsd-phase-researcher` 做 3-5 个发现（≤200 字）
3. 从 8 种产出中建议最多 4 种（Note / Todo / Seed / Requirement / Phase / Spike / Sketch / Research question）

**关键约束**：**Never write artifacts without explicit user selection.**

**真实经验**：CodeMap v2.0 的 scope 就是从 4 份 ideation 文档（`docs/ideation/`）中，通过 explore → capture → spike 链路，过滤出 19 个 raw ideas，再按 confidence × leverage 选出 10 个 phases。 explore 的输出常常直接进 `REQUIREMENTS.md` 或变成新的 Seed。

---

## 3. 核心六步：不只是命令，是决策链

GSD 的六步不是固定流程，而是**状态机**。你可以从中间进入，也可以跳过某些步骤。关键是理解每个步骤的**决策门**。

```
new-project → discuss-phase → plan-phase → execute-phase → verify-work → ship
    ↑___________________________________________↓
                     (gap closure loop)
```

### Step 1: `/gsd-new-project` — 初始化

**决策点**：是否真的需要全新初始化？

- **已有代码库** → 先 `/gsd-map-codebase`，再 `/gsd-new-project`（GSD 会加载 mapping 并聚焦于"新增什么"）
- **已有 PRD/需求文档** → `/gsd-new-project --auto @file.md`
- **完全空白** → 交互模式，让 GSD 通过提问帮你把模糊想法变成结构化需求

**CodeMap 经验**：我们的 `PROJECT.md` 中有一条持续有效的约束——"Zero Duplication"。这条约束来自初始化阶段的 dream extraction，至今仍在每个 milestone 中生效。初始化阶段定下的原则，往往比具体需求活得久。

---

### Step 2: `/gsd-discuss-phase [N]` — 规划前讨论

**核心问题**：这个 phase 有哪些灰色区域是 AI 会猜的？

**GSD 的做法**：
1. 加载 prior context（`PROJECT.md`、`REQUIREMENTS.md`、`STATE.md`、之前的 `CONTEXT.md`）
2. Scout 代码库找可复用资产和模式
3. 分析 phase — 跳过已在之前 phases 中决定的事项
4. 展示剩余灰色区域 → 用户选择讨论哪些
5. 每个选定区域深度讨论直到满意

**为什么重要**：CodeMap Phase 40.1（真实场景验证规则）的 `CONTEXT.md` 中，D-01 到 D-05 五个决策全部来自 discuss-phase。如果没有这一步，planner 会自己猜"硬约束该多硬"，结果可能是过度设计或设计不足。

**常用模式**：
```bash
/gsd-discuss-phase 3              # 标准模式：逐个讨论灰色区域
/gsd-discuss-phase 3 --auto       # 自动选择推荐默认值
/gsd-discuss-phase 3 --batch      # 批量问答（适合已知领域的快速确认）
/gsd-discuss-phase 3 --power      # 从准备好的答案文件批量回答（适合重复项目）
```

**产出**：`{phase}-CONTEXT.md` + `{phase}-DISCUSSION-LOG.md`

---

### Step 3: `/gsd-plan-phase [N]` — 研究+规划+验证

**核心问题**：如何把一个 phase goal 拆成可执行、可验证的原子计划？

**GSD 的三段式**：
1. **Research**（可选跳过）：spawn `gsd-phase-researcher` 调查实现方案
2. **Plan**：每个 plan 2-3 个 task，大小适合单个上下文窗口；plan 结构为 XML `<task>` 含 `name`, `files`, `action`, `verify`, `done`
3. **Verify**：plan checker 验证循环（最多 3 轮），检查 8 个维度：需求覆盖、任务原子性、依赖排序、文件范围、验证命令、上下文适配、缺口检测、Nyquist 合规

**CodeMap 经验**：v2.2 的 `ROADMAP.md` 显示 Phase 59-62 共 11 个 plans、分 2 waves。Wave 1 是无依赖的 plans（可并行），Wave 2 依赖 Wave 1。这种波浪式结构不是手动设计的——是 plan-phase 自动分析依赖后分组的。

**研究专用模式**（v1.40 新增）：
```bash
/gsd-plan-phase --research-phase 4        # 仅研究 Phase 4，不规划
/gsd-plan-phase --research-phase 4 --view  # 查看已有研究，不重新 spawn
```

**什么时候跳过研究**：
- 领域非常熟悉（如"给已有 CLI 命令加 `--json` 标志"）
- 之前 phase 的研究可直接复用
- 使用 `/gsd-plan-phase 3 --skip-research`

**Requirements Coverage Gate**：规划结束前验证所有 phase 需求被至少一个 plan 覆盖。CodeMap 的 `40.1-01-PLAN.md` 中明确要求覆盖 `VAL-01` 需求——这种显式映射让 verifier 可以在执行后检查"需求是否全部兑现"。

---

### Step 4: `/gsd-execute-phase <N>` — 波浪式并行执行

**核心问题**：如何安全地并行执行多个计划？

**GSD 的执行规则**：
1. 分析 plan 依赖，分组为 execution waves
2. 每个 wave 内 plans **并行执行**
3. 每个 executor 获得**全新的 200K token 上下文**
4. 每个 task **原子 git commit**
5. 执行后 verifier 检查 phase 目标是否达成
6. 跨 phase 回归门：运行之前所有 phases 的测试套件

**并行安全机制**：
- 并行 agent 使用 `--no-verify` 跳过 pre-commit hooks
- 每个 wave 结束后 orchestrator 统一运行 hooks
- `STATE.md` 使用文件级 lockfile 防止并发写损坏

**CodeMap 经验**：Phase 56（Init Receipt + Next Steps）的 Wave 1 包含 receipt.ts 和 reconciler.ts 的开发，Wave 2 包含 23 个测试和 3 份文档更新。Wave 2 必须在 Wave 1 完成后才能启动，因为测试依赖核心实现。GSD 自动处理这种依赖关系——你不需要手动指定 wave 分组。

**控制执行节奏**：
```bash
/gsd-execute-phase 1 --wave 2     # 只执行 Wave 2（用于 pacing 或 quota 管理）
/gsd-execute-phase 1 --interactive # 顺序内联执行，无 subagent（适合小 bug 修复）
```

---

### Step 5: `/gsd-verify-work [N]` — 用户验收测试

**核心问题**：代码跑通了，但 deliverable 真的满足目标吗？

**GSD 的做法**：
1. 提取可测试的交付物
2. 逐个展示给用户确认
3. 失败时 spawn debug agent 自动诊断
4. 产出 fix plans
5. 产出 `{phase}-UAT.md`

**CodeMap 经验**：Phase 58（Subagent Environment Contract）的 UAT 发现了根本性的测试设计缺陷——`claude -p` 是 print 模式而非 subagent，`codex exec --agent` 根本不存在。这些 gap 被记录到 `58-HUMAN-UAT.md`，然后触发了一轮 `plan-phase --gaps` 修复循环。**verify-work 的价值不在于"确认成功"，而在于"捕获假设错误"。**

**自动诊断**：UAT 发现 gap 后，为每个 gap 并行 spawn `gsd-debugger` agent：
- 每个 gap 一个 agent
- 可选择 worktree 隔离（`workflow.use_worktrees: true`）
- 只诊断不修复（`goal: find_root_cause_only`）
- 诊断结果回写 UAT.md 的 `root_cause` 和 `artifacts` 字段
- 自动移交到 `plan-phase --gaps`

---

### Step 6: `/gsd-ship [N]` — 发布

**GSD 的做法**：创建 GitHub PR，body 自动从规划产物生成（phase goal、changes summary、REQ-IDs、verification status）。

**CodeMap 经验**：我们的 `v1.9` milestone 有一个明确的约束——"Release L3 Boundary: AI 不得在缺少用户显式确认时执行版本号变更、tag 创建或远程 push"。这个约束来自 `PROJECT.md`，被 `/gsd-ship` 和 `.claude/skills/release/SKILL.md` 共同遵守。ship 不是无脑 push，它是**薄编排器**——只生成 PR，不触碰发布流水线。

```bash
/gsd-ship 4              # 正常发布
/gsd-ship 4 --draft      # Draft PR
```

**PR 分支清理**：
```bash
/gsd-pr-branch           # 创建过滤掉 .planning/ 提交的干净分支
```
CodeMap 的 PR 审查者不需要看到规划产物——他们只看代码变更。这个命令把规划 commit 和代码 commit 分离。

---

## 4. 从 CodeMap 实战看六步怎么跑

### 案例 1：从零到 v1.0 — 标准六步

```
/gsd-map-codebase --fast
  → 发现：代码库已有 query/deps/cycles/complexity/impact/analyze/export/ci
/gsd-new-project
  → 产出 PROJECT.md："AI-Native 优先的代码架构治理基础设施"
  → 产出 REQUIREMENTS.md：REQ-01~REQ-12
  → 产出 ROADMAP.md：Phase 01-06

/gsd-discuss-phase 1
  → 产出 01-CONTEXT.md："analyze 公共契约收口为 find/read/link/show 四意图"
/gsd-plan-phase 1
  → 产出 01-RESEARCH.md + 01-01-PLAN.md + 01-02-PLAN.md
/gsd-execute-phase 1
  → Wave 1: 01-01-PLAN（独立 plans 并行）
  → Wave 2: 01-02-PLAN（依赖 Wave 1）
  → 产出 01-01-SUMMARY.md + 01-02-SUMMARY.md
/gsd-verify-work 1
  → 产出 01-UAT.md
/gsd-code-review 1 --depth=standard
  → 产出 01-REVIEW.md
/gsd-ship 1
  → PR body 含 REQ-IDs 和 verification status
```

**关键教训**：v1.0 的 `REQUIREMENTS.md` 中只有 12 个需求，但到今天（v2.2）已验证的需求超过 50 个。需求不是一次写全的——是随着 phases 推进不断发现和追加的。`REQUIREMENTS.md` 中的 "Future Milestones" 和 "Out of Scope" 区域和 "Validated" 区域同样重要——它们防止 scope creep。

---

### 案例 2：v2.0 的 AI 系统 Phase — 使用 AI Integration Phase

```
/gsd-discuss-phase 41
  → 捕获框架偏好：schema-driven vs hand-written
/gsd-ai-integration-phase 41
  → 产出 41-AI-SPEC.md（7 章节 + checklist）
  → Validation Gate：Section 2 有框架名、Section 3 有非空代码块、Section 5 有评估维度表
/gsd-plan-phase 41
  → planner 消费 AI-SPEC.md 作为 canonical reference
/gsd-execute-phase 41
/gsd-eval-review 41
  → 产出 41-EVAL-REVIEW.md
```

**关键教训**：CodeMap 的 `AI-SPEC.md` 模板来自 GSD 的 `~/.claude/get-shit-done/templates/AI-SPEC.md`。这个模板不只是文档——它定义了 Validation Gate（7 个检查点），确保 AI 设计契约不是空话。Phase 41 的 AI-SPEC 让后续所有 planner 都能一致地消费同一个设计决策。

---

### 案例 3：v1.5 原型线关闭 — 如何优雅地终止方向

CodeMap 曾经有一个 v1.5 milestone："Isolated ArcadeDB Server-backed Prototype"。在运行了 Phase 21-24 后，用户决定关闭这个方向。

```
# 没有专门的"关闭 milestone"命令
# 做法：在 PROJECT.md 中明确声明

## Historical Closed Branch: v1.5
**Status:** Closed on 2026-04-18 by user direction
**Closure rule:**
- 不需要 Docker
- 不需要 ArcadeDB
- Phase 22-24 不再继续处理
- 如未来真的要重开类似方向，必须以全新 milestone 重新定 scope
```

**关键教训**：GSD 没有"删除"概念，只有"归档"。关闭的 milestone 保留在 `.planning/milestones/` 中，但 `STATE.md` 明确标记为 historical closed branch。这防止了未来的 agent 误判旧工人为当前 truth——CodeMap 的 `AGENTS.md` 中甚至专门有一条约束："Archive Identity: archive 文档只能作为 historical snapshot，不得重新声明 current truth"。

---

### 案例 4：v2.1 的验证重做 — 当 UAT 发现根本性错误

Phase 58 的初始验证使用了错误的测试假设（以为 `claude -p` 是 subagent 模式）。UAT 发现后：

```
/gsd-verify-work 58
  → 发现 gap：S1/S2/S3 测试假设错误
  → 自动 spawn 3 个 debugger agent
  → 产出 root_cause："claude -p is print mode, not subagent"

/gsd-plan-phase 58 --gaps
  → Gap closure mode：读取 VERIFICATION.md，跳过 research
  → 产出修复 plan

/gsd-execute-phase 58 --gaps-only
  → 只执行 gap closure plans
```

**关键教训**：GSD 的 gap closure 循环（verify → diagnose → plan --gaps → execute --gaps-only）不是失败——它是**预期内的质量迭代**。CodeMap 的 `STATE.md` 中记录了这次 rework 为 "verification rework"，而不是当作错误隐藏。

---

## 5. Namespace 路由：v1.40 的正确打开方式

v1.40 引入 6 个 namespace meta-skills，把 86+ 个平铺命令压缩为两级路由。这不是为了让你多打几个字，而是为了**token 效率**——eager listing 从 ~2,150 tokens 降至 ~120 tokens。

**但日常使用中，你仍然可以直接调用底层命令。** Namespace 只做意图匹配 → Skill 转发。

### 按意图选择 Namespace

| 你的意图 | 入口 | 典型子命令 |
|----------|------|-----------|
| "我要推进当前阶段" | `/gsd-ns-workflow` | `discuss-phase`, `plan-phase`, `execute-phase`, `verify-work` |
| "我要管理项目生命周期" | `/gsd-ns-project` | `complete-milestone`, `new-milestone`, `milestone-summary`, `audit-milestone` |
| "我要做质量检查" | `/gsd-ns-review` | `code-review`, `debug`, `secure-phase`, `eval-review`, `ui-review` |
| "我要理解代码库" | `/gsd-ns-context` | `map-codebase`, `graphify`, `docs-update`, `extract-learnings` |
| "我要管理配置/工作流" | `/gsd-ns-manage` | `settings`, `workspace`, `workstreams`, `thread`, `ship` |
| "我要探索想法" | `/gsd-ns-ideate` | `explore`, `sketch`, `spike`, `capture` |

**CodeMap 经验**：我们几乎从不直接打 `/gsd-ns-workflow`——都是直接 `/gsd-plan-phase` 或 `/gsd-progress --next`。Namespace 的价值在于当你**不确定命令名时**，可以用自然语言描述意图，GSD 帮你路由。

---

## 6. 质量门禁：什么时候该审查/调试/审计

### 代码审查：`/gsd-code-review <N>`

**不是每个 phase 都需要 deep review。**

| 场景 | 推荐深度 | 原因 |
|------|---------|------|
| 纯文档 phase（如 Phase 40.1） | quick 或 skip | 无代码变更 |
| 标准功能开发 | standard | 默认选择 |
| 涉及 auth/payment/数据变更 | deep | 跨文件分析必要 |
| 超过 50 个文件变更 | standard（自动降级）| deep 会超时 |

**自动修复模式**：
```bash
/gsd-code-review 3 --fix --auto
```
最多 3 轮迭代：review → fix → re-review → fix → re-review。每轮备份 `.iterN.md`。CodeMap Phase 27 的 `27-REVIEW.md` 经过 `--fix --auto` 后，Critical 项从 7 个降到 0 个。

**范围控制**：
- `--files a.ts,b.ts`：显式指定（最高优先级）
- 无 `--files`：从 `SUMMARY.md` 的 `created`/`modified` 字段提取
- 仍无：从 phase commits 计算 git diff

---

### 调试：`/gsd-debug [description]`

**与纯聊天调试的区别**：
- 状态机持久化到 `.planning/debug/{slug}.md`
- 知识库 `.planning/debug/knowledge-base.md` 记录已解决的 bug 模式
- 新会话优先匹配历史模式

**TDD 模式**（当 `workflow.tdd_mode: true`）：
1. 写失败测试（red）
2. 验证测试确实失败
3. 应用修复
4. 验证测试通过（green）

**CodeMap 经验**：我们的 debug session `mycodemap-install-runtime-deps` 状态为 `awaiting_human_verify`。这不是"修完了"——是"诊断完了，等待人工确认修复方案"。GSD 的调试不会擅自执行重大修复，尤其是涉及安装/删除依赖时。

---

### 里程碑审计：`/gsd-audit-milestone`

**什么时候跑**：
- Milestone 结束前（检查所有 requirements 是否覆盖）
- 外部 review 前（生成可交付的完成度报告）
- 长期项目每季度（发现 drift 和 deferred debt）

CodeMap 的 `v1.4-MILESTONE-AUDIT.md`、`v1.6-MILESTONE-AUDIT.md` 等文件，都是 audit-milestone 的产物。它们不只是"完成了什么"——更重要的是"什么被推迟了、为什么、什么时候该重新评估"。

---

## 7. 配置调优：为不同场景选择模型与开关

### 配置文件层级

```
.planning/config.json                    # 项目级（最常用）
.planning/workstreams/<name>/config.json  # 工作流级（多并行流时）
~/.gsd/defaults.json                     # 全局默认值
```

CodeMap 的 `.planning/config.json`：
```json
{
  "model_profile": "balanced",
  "workflow": {
    "research": true,
    "plan_check": true,
    "verifier": true,
    "nyquist_validation": true,
    "auto_advance": false,
    "node_repair": true,
    "code_review": true,
    "tdd_mode": false,
    "ai_integration_phase": true,
    "use_worktrees": true
  },
  "git": {
    "branching_strategy": "none",
    "phase_branch_template": "gsd/phase-{phase}-{slug}"
  }
}
```

**关键决策**：

| 场景 | 推荐配置 | 原因 |
|------|---------|------|
| 预算敏感 | `model_profile: "budget"` | research 用 Haiku，省 70% 成本 |
| 核心算法/架构 | `model_profile: "quality"` | planner 和 executor 用 Opus |
| 快速迭代小功能 | `workflow.auto_advance: true` | 减少人工确认门 |
| 高风险变更（auth/支付）| `workflow.code_review_depth: "deep"` | 跨文件分析 |
| 多 agent 并行调试 | `workflow.use_worktrees: true` | 隔离并行 agent 的文件系统 |

---

### v1.40 动态路由（Dynamic Routing）

```json
{
  "dynamic_routing": {
    "enabled": true,
    "tier_models": {
      "light": "haiku",
      "standard": "sonnet",
      "heavy": "opus"
    },
    "escalate_on_failure": true,
    "max_escalations": 1
  }
}
```

**解决什么问题**：不再"一开始就用 Opus 当保险"。轻量任务用 Haiku，验证不确定时自动升级到 Sonnet/Opus 重试。

**CodeMap 经验**：我们的 `model_profile: "balanced"` 配合 `escalate_on_failure: true`，在 v2.1 的 6 个 phases 中节省了约 40% 的 token 消耗，同时没有增加失败率。

---

## 8. 进阶模式

### 自主执行：`/gsd-autonomous [--from N] [--to N]`

让 GSD 自主跑完所有剩余 phases：discuss → plan → execute 每 phase。

**CodeMap 经验**：我们**从未在 CodeMap 主线上使用过 autonomous 模式**。原因：`PROJECT.md` 中的 "Release L3 Boundary" 和 "Thin Orchestration" 约束要求人工确认门。autonomous 适合：
- 个人 side project
- 已知领域的重复性工作
- 非生产环境的实验

### 多工作流并行：`/gsd-workstreams`

```bash
/gsd-workstreams create backend-api
/gsd-workstreams create frontend-ui
/gsd-workstreams switch backend-api
/gsd-discuss-phase 1
/gsd-plan-phase 1

/gsd-workstreams switch frontend-ui
/gsd-discuss-phase 1
```

**CodeMap 经验**：CodeMap 是单仓库 monorepo，但 v2.2 的 roadmap 中有 parser/storage/MCP 三条线。我们用的是**单工作流 + phase 依赖**（Phase 60 depends on Phase 59），而不是多工作流。多工作流更适合物理隔离的模块（如独立前端仓库 + 后端仓库）。

### 快速任务：`/gsd-fast` 和 `/gsd-quick`

```bash
/gsd-fast "fix typo in README"           # 内联执行，无 subagent
/gsd-quick --full                         # 完整质量管道但跳过规划开销
```

**CodeMap 经验**：`gsd-fast` 用于 AGENTS.md 的 typo 修复、配置变更。`gsd-quick` 用于已知领域的轻量任务——如给 CLI 命令加 `--json` 标志，不需要完整六步。

### 交互式仪表盘：`/gsd-manager`

单终端命令中心，后台执行 emit `[checkpoint]` 心跳防止 SSE 超时。

**适合**：需要并行推进多个 phases 时——discuss 一个 phase，同时让另一个 phase 在后台 plan/execute。

---

## 9. 常见陷阱与排雷

### 陷阱 1："Plan 写得太粗，execute 时 agent 猜实现"

**症状**：execute-phase 的 SUMMARY.md 里有很多"假设"、"推测"、"未验证"。

**解决**：
- discuss-phase 时多花 5 分钟确认灰色区域
- plan-phase 的 `must_haves` 和 `success_criteria` 写具体验证命令（如 `grep -c "pattern" file.md`）
- 参考 CodeMap `40.1-01-PLAN.md` 的 must_haves 写法——每个 truth 都有可 grep 的验证标准

### 陷阱 2："STATE.md 和实际进度不同步"

**症状**：`/gsd-progress --next` 路由到错误的步骤。

**解决**：
- STATE.md 是 GSD 的"地面真相"，但不是自动更新的——execute-phase 完成后需要 verify-work 来确认状态迁移
- 手动修复：直接编辑 `STATE.md` 的 `status` 和 `current_phase`
- 使用 `/gsd-health --repair` 检测并修复不一致

### 陷阱 3："Context Rot 不是只有长会话才有"

**症状**：即使用了 GSD，execute-phase 的子 agent 输出质量仍然下降。

**原因**：子 agent 的 200K 上下文也会被 plan 文件本身占满——如果单个 PLAN.md 超过 10KB，agent 的实际工作上下文就很少了。

**解决**：
- 每个 plan 限制在 2-3 个 task
- 每个 task 的 action 控制在 100 行以内
- 大 phase 拆成多个 plans（CodeMap Phase 27 拆成了 6 个 plans）

### 陷阱 4："--auto 不是万能药"

**症状**：`/gsd-discuss-phase 3 --auto` 产生的 CONTEXT.md 遗漏了关键决策。

**解决**：`--auto` 只选择推荐默认值。如果 phase 涉及新领域、重大架构决策或外部依赖，用标准模式或 `--all`。

### 陷阱 5："归档不等于删除"

**症状**：旧 milestone 的 phases 被误认为当前 active work。

**解决**：
- 关闭 milestone 时，在 `PROJECT.md` 和 `STATE.md` 中明确声明 closure rule
- 使用 `/gsd-audit-milestone` 验证 archive identity
- CodeMap 的做法：关闭的 phases 移动到 `.planning/milestones/<version>-phases/`，active phases 保留在 `.planning/phases/`

---

## 10. 附录：命令速查与源码索引

### 按频率速查

| 高频命令 | 场景 |
|----------|------|
| `/gsd-progress --next` | 日常推进 |
| `/gsd-discuss-phase N` | 新 phase 开始 |
| `/gsd-plan-phase N` | discuss 完成后 |
| `/gsd-execute-phase N` | plan 完成后 |
| `/gsd-verify-work N` | execute 完成后 |
| `/gsd-fast "..."` | 5 分钟能搞定的修复 |
| `/gsd-debug "..."` | bug 调查 |

| 中频命令 | 场景 |
|----------|------|
| `/gsd-code-review N --depth=standard` | phase 完成后 |
| `/gsd-code-review N --fix --auto` | review 发现问题后 |
| `/gsd-ship N` | 准备发 PR |
| `/gsd-pr-branch` | 清理规划 commit |
| `/gsd-explore "..."` | 想法还不成熟 |
| `/gsd-spike "..."` | 需要验证可行性 |

| 低频命令 | 场景 |
|----------|------|
| `/gsd-new-project` | 项目初始化 |
| `/gsd-map-codebase` | 接手陌生代码库 |
| `/gsd-manager` | 多 phase 并行管理 |
| `/gsd-autonomous` | 已知领域的批量执行 |
| `/gsd-audit-milestone` | milestone 收口 |
| `/gsd-complete-milestone` | milestone 归档 |

### 源码验证索引

| 概念 | 官方 Skill | Workflow | CodeMap 实例 |
|------|-----------|----------|-------------|
| discuss-phase | `~/.claude/skills/gsd-discuss-phase/SKILL.md` | `discuss-phase.md` | `40.1-CONTEXT.md` |
| plan-phase | `~/.claude/skills/gsd-plan-phase/SKILL.md` | `plan-phase.md` | `59-01-PLAN.md` |
| execute-phase | `~/.claude/skills/gsd-execute-phase/SKILL.md` | `execute-phase.md` | `40.1-01-SUMMARY.md` |
| progress | `~/.claude/skills/gsd-progress/SKILL.md` | `progress.md` | `STATE.md` |
| code-review | `~/.claude/skills/gsd-code-review/SKILL.md` | `code-review.md` | `41-REVIEW.md` |
| debug | `~/.claude/skills/gsd-debug/SKILL.md` | `diagnose-issues.md` | `.planning/debug/*.md` |
| manager | `~/.claude/skills/gsd-manager/SKILL.md` | `manager.md` | — |
| ai-integration | `~/.claude/skills/gsd-ai-integration-phase/SKILL.md` | `ai-integration-phase.md` | `41-AI-SPEC.md` |

### 产出文件索引（CodeMap 实例）

| 文件 | 位置 | 实例 |
|------|------|------|
| PROJECT.md | `.planning/` | CodeMap 项目愿景、约束、技术决策 |
| REQUIREMENTS.md | `.planning/` | REQ-IDs 与状态追踪 |
| ROADMAP.md | `.planning/` | Phase 分解与依赖关系 |
| STATE.md | `.planning/` | 当前位置、决策、指标 |
| CONTEXT.md | `.planning/phases/{N}/` | 阶段实现决策（如 `40.1-CONTEXT.md`） |
| RESEARCH.md | `.planning/phases/{N}/` | 领域研究发现 |
| PLAN.md | `.planning/phases/{N}/` | 原子执行计划（如 `59-01-PLAN.md`） |
| SUMMARY.md | `.planning/phases/{N}/` | 执行结果（如 `40.1-01-SUMMARY.md`） |
| VERIFICATION.md | `.planning/phases/{N}/` | 执行后验证报告 |
| UAT.md | `.planning/phases/{N}/` | 用户验收测试 |
| REVIEW.md | `.planning/phases/{N}/` | 代码审查发现 |

---

*本文档基于 GSD v1.40.0 官方 skill 源码与 CodeMap 仓库真实规划产物综合整理。所有路径以本地安装目录为准。*
