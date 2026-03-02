# Task Plan: 修复 group-c-cli 测试超时问题

## Goal
在不改动无关模块的前提下，定位并修复 `group-c-cli` 相关测试导致的超时问题，使相关测试可稳定完成。

## DoD
- Goal: `group-c-cli` 相关测试在本地可在合理时长内完成。
- Constraints: 仅改动 `group-c-cli` 相关测试/配置；不绕过 CI 护栏；不使用跳过门禁手段。
- Acceptance Criteria:
  1. 至少一条 `group-c-cli` 相关测试命令可稳定通过并给出耗时结果。
  2. 关键慢点/挂起根因有证据（文件行号 + 运行结果）。
  3. 提供至少一个失败模式模拟与缓解方案。
- Dependencies: `package.json` 脚本、Vitest 配置、`src/cli/commands/__tests__/` 测试文件、`.tasks/group-c-cli/EXECUTION_REPORT.md`。

## Current Phase
Phase 5

## Phases
### Phase 1: 需求与证据收集
- [x] 确认用户范围仅限 `group-c-cli`
- [x] 收集脚本/配置/超时复现证据
- [x] 写入 findings.md
- **Status:** complete

### Phase 2: 根因定位与方案设计
- [x] 定位导致慢/超时的测试模式
- [x] 设计最小改动修复方案
- [x] 评估回归风险
- **Status:** complete

### Phase 3: 实施修复
- [x] 修改相关测试或局部配置
- [x] 保持改动最小且只影响 `group-c-cli`
- [x] 记录变更理由
- **Status:** complete

### Phase 4: 验证与失败模拟
- [x] 运行 `group-c-cli` 相关测试验证耗时
- [x] 模拟至少 1 个失败模式并验证检测信号
- [x] 记录结果到 progress.md
- **Status:** complete

### Phase 5: 收尾与文档同步检查
- [x] 检查是否需要更新 docs/AGENTS.md/CLAUDE.md/README.md
- [x] 汇总证据与风险
- [x] 形成交付说明
- **Status:** complete

## Key Questions
1. 超时是由个别测试挂起（如 watch/定时器/未关闭句柄）还是总体执行过慢？
2. 是否可以通过局部 mock/清理逻辑修复，而不影响真实行为验证价值？

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 仅处理 `group-c-cli` 范围内测试 | 用户明确要求仅处理该范围，避免无关改动 |
| 先定位超时根因再改代码 | 避免盲改，符合最小变更原则 |
| 只修复测试 mock/命令解析链路，不改业务源码 | 满足最小可行修复，降低回归风险 |
| 使用 awaiter agent 执行测试命令 | 满足项目对长耗时/测试任务的执行约束 |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| progress.md 首次写入失败（shell 引号导致语法错误） | 1 | 改写 heredoc 引号并去除冲突字符 |
| progress.md 二次写入出现反引号命令替换告警 | 2 | 改用单引号包裹 shell 命令并重写文件 |
| worker 子 agent 被 interrupt 中断 | 1 | 重新创建 worker 并改为“只改代码不跑测试” |

---

# Task Plan: 修复 analyze 意图路由 secondary 与执行策略偏差

## Goal
使 `analyze` 流程与设计文档对齐：`impact` 等场景路由可提供 secondary 工具，并在有 secondary 时采用并行执行 + 融合，而非固定回退链模式。

## DoD
- Goal: 路由结果可表达 secondary；执行链可在指定场景并行执行 codemap + ast-grep。
- Constraints: 最小改动；不改无关模块；保持 CLI 输出契约兼容。
- Acceptance Criteria:
  1. `IntentRouter.route()` 在 `impact` 场景返回 secondary=`ast-grep`。
  2. `AnalyzeCommand` 在存在 secondary 时走 `executeParallel()`，否则走 `executeWithFallback()`。
  3. 相关测试覆盖并通过（至少包含 router 和 orchestrator 路由执行路径验证）。
  4. 提供至少一个失败模式与缓解说明。
- Dependencies: `src/orchestrator/types.ts`, `src/orchestrator/intent-router.ts`, `src/cli/commands/analyze.ts`, `src/orchestrator/__tests__`, `docs/REFACTOR_REQUIREMENTS.md`。

## Current Phase
Completed

## Phases
### Phase 1: 差异确认与方案冻结
- [x] 锁定文档-实现偏差点
- [x] 定义最小改动面
- **Status:** complete

### Phase 2: 代码修复
- [x] 类型与路由补齐 secondary
- [x] analyze 执行策略改为“有 secondary 并行，否则回退”
- **Status:** complete

### Phase 3: 测试与收尾
- [x] 更新/新增测试并执行
- [x] 失败模式模拟
- [x] 检查 docs/AGENTS.md/CLAUDE.md/README.md 是否需同步
- **Status:** complete

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 优先最小改动 `types + intent-router + analyze` | 直接命中用户指出的两处偏差 |
| 并行策略仅在存在 secondary 时触发 | 避免改变全部 intent 的既有行为 |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| 暂无 | - | - |

## Execution Update (2026-03-02)
- Phase 1: complete
- Phase 2: complete
- Phase 3: complete

## Acceptance Check
- [x] `IntentRouter.route()` 在 impact 场景返回 secondary=`ast-grep`（`src/orchestrator/intent-router.ts:69`、`src/orchestrator/intent-router.ts:77`）。
- [x] `AnalyzeCommand` 有 secondary 时走并行 `executeParallel`（`src/cli/commands/analyze.ts:164`、`src/cli/commands/analyze.ts:166`）。
- [x] 无 secondary 时走 `executeWithFallback`（`src/cli/commands/analyze.ts:179`）。
- [x] 测试通过（见 progress.md Test Results）。
