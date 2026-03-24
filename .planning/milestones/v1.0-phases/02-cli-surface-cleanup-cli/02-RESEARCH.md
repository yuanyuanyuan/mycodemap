# Phase 2: CLI Surface Cleanup（公共 CLI 命令面收缩） - Research

**Researched:** 2026-03-24
**Domain:** 高 blast-radius CLI public surface 收缩与文档/guardrail 同步
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 本 phase 只移除主 CLI 暴露的 `server`、`watch`、`report`、`logs`，不顺手推进 analyze/workflow/ship 的后续 phase 内容。
- `Server Layer` 架构层继续保留；`src/server/` 与 `src/cli-new/` 不是本 phase 的删除目标。
- 命令移除必须带迁移/报错策略，不能只留一个模糊的 unknown command。
- 文档、guardrail、测试与 help 输出必须同步收口，不能拆成“代码先变、文档以后再补”。

### the agent's Discretion
- removed-command 兼容提示实现方式
- 二级文档同步范围
- 顶层 help 回归测试的具体落点

### Deferred Ideas (OUT OF SCOPE)
- analyze 四意图与 schema 重构
- workflow 阶段模型简化
- ship / ci 关系重构
- exclusion module 统一化

</user_constraints>

<research_summary>
## Summary

`Phase 2` 的核心不是“删除四个命令”本身，而是**把 public surface 从注册表、help 输出、文档、guardrail、测试五条链路同时收紧**。证据显示 `src/cli/index.ts` 仍直接注册 `watch`、`report`、`logs`、`server`，而 `node dist/cli/index.js --help` 也仍公开它们；与此同时，`README.md`、`docs/ai-guide/COMMANDS.md` 仍有完整章节，`scripts/validate-docs.js` 仍把“这些命令属于当前公开过渡能力”写成必需片段。这意味着如果只改注册表，不同步 docs/guardrails/tests，Phase 2 一定会失败。

第二个研究结论是：**兼容策略必须显式设计**。设计稿要求“迁移平滑”，但当前仓库里没有看到专门的顶层 help surface 回归测试，也没有现成的 removed-command 兼容框架。最稳妥的产品决策不是“保留旧命令继续正常跑”，而是“从 help/public docs 中移除它们，同时给直接调用旧命令的人一个清晰报错/迁移提示”。这样既能达成 `CLI-01~04`，又不会把“命令已删”做成无上下文的断崖式破坏。

第三个结论是：**不要把 `src/cli-new/` 和 `src/server/` 卷进来**。codebase audit 明确指出仓库处于 hybrid transition，`src/cli-new/` 只是试验性新 CLI，而 `src/server/` 是内部架构/transport 层。`Phase 2` 若同时动这些路径，很容易把“public command cleanup”扩成“架构重构”，直接越界。

**Primary recommendation:** 把 `Phase 2` 继续拆成 roadmap 已定义的三块：  
1) 清理主 CLI 注册和 `--help`；  
2) 为 removed commands 提供明确、最小 blast-radius 的兼容/错误策略；  
3) 同步 README、AI docs、setup docs、guardrail 脚本与 tests。
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library / Module | Purpose | Why Standard |
|------------------|---------|--------------|
| `commander` via `src/cli/index.ts` | 顶层 public command registry / help output | 当前主 CLI 的唯一事实源 |
| `scripts/validate-docs.js` | 文档/命令面 guardrail | 已接入 `npm run docs:check` 与 CI |
| `src/cli/commands/ci.ts` | `ci check-docs-sync` 统一入口 | Phase 2 必须沿用现有 CLI guardrail 路径 |

### Supporting
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `node dist/cli/index.js --help` | 验证顶层 public surface | 每次改 command registry 后立即验证 |
| `node dist/cli/index.js impact -f src/cli/index.ts -t -j` | 评估主入口 blast radius | 改 plan / review scope 时 |
| `rg` | 全量扫描文档和测试引用点 | 找 `server/watch/report/logs` 残留引用 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 直接删除实现文件 | 先只移除 public registry + 明确错误策略 | 前者更激进，容易误删内部/过渡实现 |
| 默认 Commander unknown command | 自定义 removed-command 提示 | 默认错误缺少迁移语义，不满足“迁移平滑” |
| 只改 README / COMMANDS | 同步 setup docs + docs guardrails + tests | 只改主文档会留下 CI/次级入口漂移 |
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Pattern 1: Registry-first surface cleanup
**What:** 先收缩 `src/cli/index.ts` 的 public command registry，再让 help 输出自然收缩。  
**Why:** Commander help 与注册表强绑定，改注册表比改文本说明更可靠。  
**Evidence:** `src/cli/index.ts:88`, `src/cli/index.ts:177`, `src/cli/index.ts:187`, `src/cli/index.ts:207`

### Pattern 2: Guardrail-backed command removal
**What:** 命令面变化与 `scripts/validate-docs.js`、docs-sync tests 同步提交。  
**Why:** codebase concern 已明确文档护栏耦合是本项目真实风险。  
**Evidence:** `.planning/codebase/CONCERNS.md:37`, `.planning/codebase/CONCERNS.md:50`, `src/cli/__tests__/validate-docs-script.test.ts:48`

### Pattern 3: Internal architecture preserved, public surface reduced
**What:** 保留 `src/server/` / `Server Layer`，但从主 CLI 公共入口撤掉 `server` 命令。  
**Why:** 这是设计稿与 Phase 1 已锁定的命名边界。  
**Evidence:** `stark-main-design-20260324-022633.md:80`, `.planning/milestones/v1.0-phases/01-positioning-baseline/01-CONTEXT.md`, `ARCHITECTURE.md:20`

### Anti-Patterns to Avoid
- 一次性同时改 `src/cli/index.ts`、`src/cli-new/*`、`src/server/*` —— scope 会直接越界。
- 只删命令注册，不处理 docs/guardrails/tests —— Phase 2 会被 CI 拦下。
- 用 generic unknown command 替代迁移策略 —— 不符合设计稿的“迁移平滑”。
</architecture_patterns>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Help output changed, docs still stale
**Failure mode:** `--help` 已移除命令，但 README / COMMANDS / setup docs 仍在教用户使用旧命令。  
**Evidence:** `README.md:159`, `README.md:257`, `README.md:275`, `README.md:306`, `docs/ai-guide/COMMANDS.md:295`, `docs/ai-guide/COMMANDS.md:332`

### Pitfall 2: Guardrail still expects old public surface
**Failure mode:** `scripts/validate-docs.js` 还要求 README 包含“当前公开过渡能力”，导致 `npm run docs:check` 失败。  
**Evidence:** `scripts/validate-docs.js:118`, `scripts/validate-docs.js:121`, `.planning/codebase/CONCERNS.md:50`

### Pitfall 3: Dead helper lists
**Failure mode:** 顶层命令删了，但 `COMMANDS_REQUIRING_TREE_SITTER` 仍包含 `watch`。  
**Evidence:** `src/cli/tree-sitter-check.ts:86`

### Pitfall 4: Scope leak into architecture cleanup
**Failure mode:** 顺手删除 `src/server/` 或 `src/cli-new/commands/server.ts`，把 public surface cleanup 变成架构迁移。  
**Evidence:** `.planning/codebase/ARCHITECTURE.md:18`, `.planning/codebase/ARCHITECTURE.md:76`, `src/cli-new/index.ts:42`
</common_pitfalls>

<code_examples>
## Code Examples

### Current public registry still exposes removed commands
```typescript
// Source: src/cli/index.ts
.command('watch')
.command('report')
.command('logs')
.command('server')
```

### Current help still exposes them
```bash
# Source: local run on 2026-03-24
node dist/cli/index.js --help
```

### Existing docs-sync validation entry
```typescript
// Source: src/cli/commands/ci.ts
ci
  .command('check-docs-sync')
  .description('验证当前仓库高信号文档、CLI 示例与护栏配置是否保持同步')
```
</code_examples>

<validation_architecture>
## Validation Architecture

### Required checks for this phase
1. `node dist/cli/index.js --help` — 顶层 public command surface
2. `npm run docs:check` — 文档/guardrail 一致性
3. `node dist/cli/index.js ci check-docs-sync` — 统一 CLI docs-sync 入口
4. 目标测试：`src/cli/__tests__/validate-docs-script.test.ts` 与 `src/cli/commands/__tests__/ci-docs-sync.test.ts`

### Recommended additional check
- 新增或更新一个覆盖顶层 help / removed command behavior 的测试，避免 Phase 2 只靠手工 `--help` 维持
</validation_architecture>

<open_questions>
## Open Questions

1. removed commands 的迁移提示最佳承载点是什么：hidden command、parse 前拦截，还是 commander 错误扩展？
2. `docs/SETUP_GUIDE.md` 与 `docs/AI_ASSISTANT_SETUP.md` 在本 phase 是 P2 辅助同步，还是必须与主命令列表一起进入同一 plan？
3. `watch/report/logs/server` 的实现文件是暂留还是立即删除？当前建议是暂留，先收 public surface。
</open_questions>

<sources>
## Sources

### Primary
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/milestones/v1.0-phases/02-cli-surface-cleanup-cli/02-CONTEXT.md`
- `/home/stark/.gstack/projects/yuanyuanyuan-mycodemap/stark-main-design-20260324-022633.md`
- `src/cli/index.ts`
- `src/cli/tree-sitter-check.ts`
- `src/cli/commands/ci.ts`
- `src/cli/__tests__/validate-docs-script.test.ts`
- `src/cli/commands/__tests__/ci-docs-sync.test.ts`
- `scripts/validate-docs.js`

### Secondary
- `.planning/codebase/CONCERNS.md`
- `.planning/codebase/ARCHITECTURE.md`
- `.planning/codebase/INTEGRATIONS.md`
- `README.md`
- `docs/ai-guide/COMMANDS.md`
- `docs/SETUP_GUIDE.md`
- `docs/AI_ASSISTANT_SETUP.md`

</sources>

---

*Phase: 02-cli-surface-cleanup-cli*
*Research gathered: 2026-03-24*
