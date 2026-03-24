# Phase 5: CI Ship Alignment（CI 与 Ship 边界对齐） - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning
**Source:** Roadmap Phase 5 goal + CI/ship code audit + workflow phase completion

<domain>
## Phase Boundary

本阶段只处理 `ci` 与 `ship` 的边界对齐：为 `ci` 增加 `check-working-tree`、`check-branch`、`check-scripts`，并让 `ship` 的 CHECK 步骤复用这些能力，而不是在 `ship` 内重复实现同一套发布前检查。  
本阶段**不**改 `workflow` 四阶段模型、**不**改共享文件排除模块、也**不**做最终 docs guardrail 收口；那些属于 Phase 4 / Phase 6。

</domain>

<decisions>
## Implementation Decisions

### Single source of truth
- **D-01:** `working tree / branch / release scripts` 的发布前 gate checks 由 `src/cli/commands/ci.ts` 提供共享 helper 和 CLI 子命令，`ship` 只能复用，不能再单独 `execSync` 重写。
- **D-02:** `ship` 仍可保留与版本语义强相关的 `noBreakingWithoutMajor` 检查，因为它不是通用 CI gate，而是 release policy。

### Scope control
- **D-03:** 本阶段不会顺手重排 `assess-risk`、`check-output-contract` 或文档护栏脚本本身；当前目标是先把重复的 must-pass 检查收敛。
- **D-04:** `check-scripts` 复用现有 `ship` 本地发布前脚本集合：`docs:check:pre-release`、`check:all`、`build`、`validate-pack`。

### Verification
- **D-05:** 最小验证集合固定为：新增 CI helper 测试、ship 质量规则委托测试、pipeline 回归、`npm run build`、`ci --help`、`check-branch` 通过/失败、`check-working-tree` 失败、`check-scripts` skip 路径、`npm run docs:check`。

</decisions>

<specifics>
## Specific Ideas

- 当前 `ship/checker.ts` 之前直接 `execSync('git branch --show-current')`，而 `ship/rules/quality-rules.ts` 又自己持有 `workingTreeClean` / `correctBranch` / `allChecksPass` 规则；这是典型的重复实现。
- `ci` 已是公开的门禁入口，因此新增 gate checks 后，`ship` 应只消费同一 helper，而不是再维护另一套本地实现。
- 由于本阶段新增 CLI 子命令，README、AI 指南与规则文档都需要同步说明 `ship` 的 CHECK 阶段已经改为复用 `ci`。

</specifics>

<canonical_refs>
## Canonical References

- `.planning/ROADMAP.md` — Phase 5 目标、成功标准、`05-01` / `05-02`
- `.planning/REQUIREMENTS.md` — `CI-01`、`CI-02`、`CI-03`、`SHIP-01`
- `src/cli/commands/ci.ts` — CI Gateway 命令与 helper 实现
- `src/cli/commands/ship/rules/quality-rules.ts` — ship must-pass / should-pass 规则
- `src/cli/commands/ship/checker.ts` — ship CHECK 步骤编排
- `README.md`、`AI_GUIDE.md`、`docs/ai-guide/COMMANDS.md` — CLI 入口文档
- `docs/rules/validation.md`、`docs/rules/engineering-with-codex-openai.md` — 验证与工程护栏说明

</canonical_refs>

<deferred>
## Deferred Ideas

- 用 docs guardrail 把新 CI 子命令和 ship 对齐写成硬规则 —— Phase 6
- 统一扫描类命令的 `.gitignore` 感知排除逻辑 —— Phase 6

</deferred>

---

*Phase: 05-ci-ship-alignment-ci-ship*
*Context gathered: 2026-03-24*
