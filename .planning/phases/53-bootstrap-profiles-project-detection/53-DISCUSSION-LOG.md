# Phase 53: Discussion Log

**Date:** 2026-05-01
**Mode:** discuss (default)
**Phase:** 53-bootstrap-profiles-project-detection
**Total areas discussed:** 4
**Total questions asked:** 16 (4 per area)

> Audit trail of the discuss-phase 53 session. Each area below records the questions presented, the options offered, the user's selection, and the inferred rationale that was promoted into `53-CONTEXT.md` decisions.

---

## Area 1: 项目类型检测信号 (Project Type Detection Signals)

**Why this is gray:** FRC-01 requires "auto-detect project type" but does not specify the signal source. Marker files, lockfiles, directory structure, and content sniffing are all defensible inputs.

### Q1.1 — 用什么信号来识别项目类型?
- **Options:**
  - 仅 marker 文件 (package.json / go.mod / Cargo.toml / pyproject.toml)
  - Marker + 目录结构 (src/, lib/, tests/, cmd/)
  - Marker + 内容嗅探 (read first N bytes of entry files)
- **Selected:** 仅 marker 文件
- **Rationale:** Cross-platform stable, low IO, deterministic. Marker files are unambiguous for the four supported languages.
- **Promoted to:** D-01

### Q1.2 — monorepo 同时存在多种 marker 时怎么办?
- **Options:**
  - 全部报告 + 用户选
  - 硬编码优先级 (e.g., package.json > Cargo.toml)
  - 启发式打分
- **Selected:** 全部报告 + 用户选
- **Rationale:** Transparent; project author knows their primary type better than a hardcoded preference. Forces non-interactive contexts to use `--profile`.
- **Promoted to:** D-02

### Q1.3 — 是否向用户展示检测置信度?
- **Options:**
  - 不暴露
  - 仅低置信度暴露
  - 始终暴露
- **Selected:** 仅低置信度暴露
- **Rationale:** Minimizes UX noise for the common case while flagging ambiguous detection so the user knows when to double-check.
- **Promoted to:** D-03

### Q1.4 — 检测不出明确类型时怎么办?
- **Options:**
  - Fallback generic
  - 询问用户选择
  - 拒绝并提示
- **Selected:** 拒绝并提示
- **Rationale:** Aligns with the broader "no silent state changes" stance from Phase 51. Adds friction to fresh init in unsupported projects but makes the gap explicit.
- **Promoted to:** D-04

---

## Area 2: Profile 数据格式与位置 (Profile Data Format and Location)

**Why this is gray:** FRC-02 / FRC-03 require profiles with overridable defaults but do not specify file format, source location, validation, or schema scope.

### Q2.1 — Profile 内置定义用什么格式?
- **Options:**
  - JSON 静态文件
  - TypeScript 模块
  - 混合 (TS 生成 JSON)
- **Selected:** JSON 静态文件
- **Rationale:** Schema-friendly, code-external, easy to inspect and diff. Restricts profiles to data, not logic — which is the right v1 boundary.
- **Promoted to:** D-05

### Q2.2 — Profile 从哪里读取 / 是否支持覆盖?
- **Options:**
  - 仅包内 built-in
  - 内置 + 用户覆盖
  - 仅 seed 到本地
- **Selected:** 仅包内 built-in
- **Rationale:** v1 simplicity; prevents fragmentation. Future override support is deferred.
- **Promoted to:** D-06

### Q2.3 — Profile 文件是否需要 schema 验证?
- **Options:**
  - 是 - 强制验证
  - 仅验证必要字段
  - 不验证
- **Selected:** 是 - 强制验证
- **Rationale:** Profiles are governance assets shipped to all users; spelling errors or schema drift must fail loud.
- **Promoted to:** D-07

### Q2.4 — Profile 里应该包含哪些字段?
- **Options:**
  - 仅三样核心 (parser, ignore, depth)
  - 三样 + 扩展
  - 抽象均包含
- **Selected:** 仅三样核心
- **Rationale:** Aligned with FRC-03 explicit list. Adding fields later is a schema version bump, which is acceptable for governance assets.
- **Promoted to:** D-08

---

## Area 3: 交互模式的边界 (Interactive Mode Boundaries)

**Why this is gray:** FRC-04 says "review, accept, modify, or skip" but does not specify the default behavior, the modify mechanism, or how non-interactive contexts behave.

### Q3.1 — 检测后默认行为?
- **Options:**
  - 默认 preview
  - 默认 apply
  - 始终询问
- **Selected:** 默认 preview
- **Rationale:** Consistent with Phase 51 init's "preview unless `-y`" pattern. No silent disk writes.
- **Promoted to:** D-09, D-10

### Q3.2 — 交互模式下用户选择 "modify" 时?
- **Options:**
  - 写草稿到文件
  - Inline Q&A
  - v1 不提供 modify
- **Selected:** v1 不提供 modify
- **Rationale:** Modify Q&A is significant UX scope; users can edit the resulting `.mycodemap/config.json` by hand. v1 covers FRC-04 via the accept/skip subset.
- **Promoted to:** D-11

### Q3.3 — 非 TTY 环境 (CI / 管道) 下怎么办?
- **Options:**
  - 打印后退出
  - 默认 accept
  - 报错退出
- **Selected:** 报错退出
- **Rationale:** Forces explicit `--profile <name>` or `-y` in CI / scripted contexts. No surprise mutations in automation.
- **Promoted to:** D-12

### Q3.4 — 是否支持 --profile 显式跳过检测?
- **Options:**
  - 支持 --profile 覆盖
  - 不提供覆盖
- **Selected:** 支持 --profile 覆盖
- **Rationale:** Required for CI, agent, and script paths. The `--profile <name>` flag is the documented non-interactive path.
- **Promoted to:** D-13

---

## Area 4: 检测/应用的触发入口 (Detection/Apply Trigger Entry Point)

**Why this is gray:** Roadmap says Phase 53 "depends on: None" but the practical integration with Phase 51's init reconciliation is significant. The CLI surface choice (single command vs subcommand vs first-run side effect) shapes the rest of v2.1.

### Q4.1 — 检测/应用逻辑的 CLI 入口怎么选?
- **Options:**
  - 仅嵌入 init
  - 独立子命令
  - 两者都提供
- **Selected:** 仅嵌入 init
- **Rationale:** Avoids CLI surface duplication; reuses existing reconciliation guarantees. New verbs are net cost.
- **Promoted to:** D-14

### Q4.2 — bare codemap 首次运行是否也触发检测?
- **Options:**
  - 不介入首次运行
  - 给 first-run 加提示
  - first-run 主动检测
- **Selected:** 给 first-run 加提示
- **Rationale:** Discoverability without orchestration coupling. Text-only change in `first-run-guide.ts`.
- **Promoted to:** D-15

### Q4.3 — 项目已有 .mycodemap/config.json 时怎么办?
- **Options:**
  - 已配置跳过
  - 总检测 + 报告 diff
  - 跳过 + 提示
- **Selected:** 已配置跳过
- **Rationale:** Idempotent rerun is the most common path; surfacing `already-configured` in the receipt makes the skip discoverable.
- **Promoted to:** D-16

### Q4.4 — Profile 应用是否要进入 InitReceipt?
- **Options:**
  - 进入 InitReceipt
  - 仅控制台输出
  - 提供集成接口
- **Selected:** 进入 InitReceipt
- **Rationale:** Reuses existing receipt model; makes profile application visible to `codemap doctor` drift detection automatically. Aligns with Phase 56's plan to extend the receipt.
- **Promoted to:** D-17

---

## Final State

- **Decisions promoted:** 17 (D-01 through D-17)
- **Areas with no further questions:** all four
- **Scope narrowing surfaced during discussion:** modify Q&A removed (Q3.2), user-overridable profiles deferred (Q2.2), standalone subcommand permanently out of scope (Q4.1).
- **Planner-discretion items:** schema validator library, exact profile filename layout, `--re-detect` flag name, confidence algorithm details, exact split between `detect.ts` and `reconciler.ts`.

---

*Phase: 53-bootstrap-profiles-project-detection*
*Discussion completed: 2026-05-01*
