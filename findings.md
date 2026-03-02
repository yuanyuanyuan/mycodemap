# Findings & Decisions

## Requirements
- 仅修复 `group-c-cli` 相关测试的“慢/超时”问题。
- 目标是解决测试超时，不扩展到其他任务组。
- 需要保留证据链（命令结果 + 文件行号）。

## Research Findings
- 初始证据显示 `npm test` 在 180s 被超时杀死（用户提供现象）。
- `group-c-cli` 执行报告显示 4 个文件仅部分通过，并出现异步超时/模块加载问题：
  - `watch.test.ts`、`watch-foreground.test.ts`、`generate.test.ts`、`workflow.test.ts`。
- 子 agent 证据显示多个测试文件 `vi.mock` 路径与被测命令真实依赖不一致，导致 mock 未命中并进入真实重路径（analyze/generate/watcher/subagent）。
- `npm test -- src/cli/commands/__tests__` 现已在约 1.09s 内完成，4 文件 58 测试全部通过（见 `.tmp/group-c-cli-test.log`）。

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| 优先跑 `group-c-cli` 相关测试子集复现 | 缩小问题空间，快速找到慢点 |
| 优先检查 watch/异步/计时器类测试 | 报告已指出这些是高风险超时来源 |
| 先修复路径错位再评估更深层重构 | 路径错位是可直接验证的高收益根因 |
| `workflow.test.ts` 仅做最小 commander mock 分发修复 | 控制改动面，避免改业务代码 |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| `progress.md` 写入命令引号冲突 | 重写命令与文件，加入错误记录 |
| 子 agent 执行策略切换导致中断 | 重建 worker，分离“改代码”与“跑测试”职责 |

## Resources
- `/data/codemap/.tasks/group-c-cli/EXECUTION_REPORT.md`
- `/data/codemap/AGENTS.md`
- `/home/stark/.codex/skills/agent-teams-playbook/SKILL.md`
- `/home/stark/.codex/skills/planning-with-files/SKILL.md`
- `/data/codemap/.tmp/group-c-cli-test.log`

## Visual/Browser Findings
- 本任务无浏览器/图片输入。

---

## 2026-03-02: analyze 路由/执行策略偏差

### 需求证据
- 设计文档要求 `impact` 路由结果包含 secondary：`{ tool: \"codemap\", secondary: \"ast-grep\" }`（`docs/REFACTOR_REQUIREMENTS.md:76`）。
- 设计文档要求该场景执行 `ToolOrchestrator.executeParallel()`（`docs/REFACTOR_REQUIREMENTS.md:77`）。

### 现状证据
- `IntentRouter.route()` 返回对象仅包含 `tool`，无 `secondary`（`src/orchestrator/intent-router.ts:70`）。
- `AnalyzeCommand` 当前固定 `executeWithFallback(intentObj, \"codemap\")`（`src/cli/commands/analyze.ts:162`）。

### 初步结论
- 当前实现与设计文档在“路由表达能力”和“执行策略”两点存在偏差。

### 实施结果
- `CodemapIntent` 新增可选 `secondary` 字段（`src/orchestrator/types.ts:101`）。
- `IntentRouter` 在 `impact` 路由时返回 `secondary = "ast-grep"`（`src/orchestrator/intent-router.ts:69`、`src/orchestrator/intent-router.ts:77`）。
- `AnalyzeCommand.executeWithOrchestrator()` 改为：有 `secondary` 时使用 `executeParallel` + `ResultFusion.fuse`，否则使用 `executeWithFallback`（`src/cli/commands/analyze.ts:164`、`src/cli/commands/analyze.ts:166`、`src/cli/commands/analyze.ts:179`）。
- 新增路由测试断言 secondary 行为（`src/orchestrator/__tests__/intent-router.test.ts:28`、`src/orchestrator/__tests__/intent-router.test.ts:41`）。

### 失败模式模拟（强制）
- 触发：Workflow 路径仍未使用 `secondary`，`selectTools()` 当前固定返回 `[codemap]`。
- 证据：`runAnalysis()` 虽调用了 `route()`，但后续 `selectTools()` 只按 intent 返回 codemap（`src/orchestrator/workflow/workflow-orchestrator.ts:170`、`src/orchestrator/workflow/workflow-orchestrator.ts:197`、`src/orchestrator/workflow/workflow-orchestrator.ts:204`）。
- 风险：CLI 与 Workflow 在多工具策略上出现行为分叉。
- 缓解：后续将 Workflow 的 `selectTools()` 对齐到 `tool + secondary` 策略，并补回归测试。
