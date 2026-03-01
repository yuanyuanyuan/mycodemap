# CodeMap 重构审查终版报告（最终版）

> 生成时间：2026-03-01
> 复核对象：`/data/codemap/REVIEW_REPORT.md`、`/data/codemap/CODEMAP_REFACTOR_REVIEW_REPORT.md`
> 复核方式：多 Agent 并行复核 + 主协调器二次取证

---

## 0. DoD（完成定义）

- [证据] **目标**：判断两份既有审查报告是否正确、是否有遗漏（用户指令）。
- [证据] **限制**：仅基于仓库当前实现与设计文档；必须给出文件行号证据（`AGENTS.md`约束 + 本次任务约束）。
- [证据] **验收标准**：
  1) 对两份报告关键断言给出“正确/不准确/证据不足”；
  2) 至少给出一个遗漏项；
  3) 给出至少一个失败模式（触发/影响/检测/缓解）。
- [证据] **依赖**：`src/`实现、`docs/REFACTOR_*.md`、`docs/CI_GATEWAY_DESIGN.md`、两份待复核报告。

---

## 1. 总体结论（先否定薄弱前提）

- [推论] 前提“现有两份报告可直接作为最终验收依据”**不成立**。两份报告都有高价值信息，但都存在高影响误判与漏报。
- [证据] `REVIEW_REPORT.md:187` 将 Phase 11 判为完成；但 `src/orchestrator/workflow/workflow-orchestrator.ts:138`、`src/orchestrator/workflow/workflow-orchestrator.ts:142` 显示 `runAnalysis()` 仍为存根并返回空数组。
- [证据] `CODEMAP_REFACTOR_REVIEW_REPORT.md:131`、`CODEMAP_REFACTOR_REVIEW_REPORT.md:267` 将 TestLinker 打高分/打勾；但设计要求 `buildMapping`/`findRelatedTests`/`WorkflowTestLinker`（`docs/REFACTOR_TEST_LINKER_DESIGN.md:107`、`docs/REFACTOR_TEST_LINKER_DESIGN.md:145`、`docs/REFACTOR_TEST_LINKER_DESIGN.md:265`），当前实现仅有 `resolveTestFile/resolveTestFiles`（`src/orchestrator/test-linker.ts:113`、`src/orchestrator/test-linker.ts:188`）。
- [推论] 因此，**两份报告方向正确，但都需要勘误后才能作为“最终版验收结论”。**

---

## 2. 对 `REVIEW_REPORT.md` 的复核结论

### 2.1 正确项

- [证据] AstGrep/rg-internal 适配器缺失：`REVIEW_REPORT.md:69`、`REVIEW_REPORT.md:70`；实现仅导出 `CodemapAdapter`（`src/orchestrator/adapters/index.ts:5`-`src/orchestrator/adapters/index.ts:7`）。
- [证据] ResultFusion 核心链路存在（加权/去重/排序/截断）：`REVIEW_REPORT.md:123`；`src/orchestrator/result-fusion.ts:77`、`src/orchestrator/result-fusion.ts:152`、`src/orchestrator/result-fusion.ts:175`、`src/orchestrator/result-fusion.ts:230`。
- [证据] CI 服务端门禁链不完整：`REVIEW_REPORT.md:114`；设计要求含 AI 饲料同步/风险评估/输出契约（`docs/CI_GATEWAY_DESIGN.md:36`-`docs/CI_GATEWAY_DESIGN.md:38`），现 workflow 仅 commit/file header/unit/typecheck（`.github/workflows/ci-gateway.yml:10`、`.github/workflows/ci-gateway.yml:46`、`.github/workflows/ci-gateway.yml:90`、`.github/workflows/ci-gateway.yml:111`）。

### 2.2 不准确项

- [证据] “Phase 11 已完成”不准确：`REVIEW_REPORT.md:187` vs `src/orchestrator/workflow/workflow-orchestrator.ts:142`。
- [证据] “HeatScore 缺 stability”不准确：`REVIEW_REPORT.md:129` vs `src/orchestrator/types.ts:57`、`src/orchestrator/types.ts:58`。
- [证据] “本地 Git Hooks 未配置”表述不准确（应为“实现形态与设计不一致”）：`REVIEW_REPORT.md:84`、`REVIEW_REPORT.md:113`；仓库已配置 hooksPath 与 hook 文件（`.git/config:6`、`.githooks/pre-commit:1`、`.githooks/commit-msg:1`、`package.json:16`、`scripts/hooks/install-hooks.sh:25`）。

### 2.3 遗漏项

- [证据] 漏报：`ToolOrchestrator` 超时控制名义存在但未真正生效。`AbortController` 被创建（`src/orchestrator/tool-orchestrator.ts:100`），但执行调用未传 signal 且无 `Promise.race`（`src/orchestrator/tool-orchestrator.ts:118`）。
- [证据] 漏报：`analyze` 机器输出契约未落地。设计要求 machine/json 为稳定纯 JSON 契约（`docs/REFACTOR_REQUIREMENTS.md:17`、`docs/REFACTOR_ARCHITECTURE_OVERVIEW.md:224`-`docs/REFACTOR_ARCHITECTURE_OVERVIEW.md:227`），但 `analyzeCommand` 未打印 `execute()` 返回对象（`src/cli/commands/analyze.ts:348`），输出对象也缺 `schemaVersion/tool/confidence`（`src/cli/commands/analyze.ts:143`-`src/cli/commands/analyze.ts:150`）。
- [证据] 漏报：`codemap generate` 未接入 `AIFeedGenerator` 链路。需求要求 `codemap generate` 生成 `.codemap/ai-feed.txt`（`docs/REFACTOR_REQUIREMENTS.md:15`、`docs/REFACTOR_ARCHITECTURE_OVERVIEW.md:327`），但 `generate` 命令未调用 `AIFeedGenerator`（`src/cli/commands/generate.ts:42`-`src/cli/commands/generate.ts:46`）。

---

## 3. 对 `CODEMAP_REFACTOR_REVIEW_REPORT.md` 的复核结论

### 3.1 正确项

- [证据] Analyze 仅 3/8 intent 实现且未接编排器：`CODEMAP_REFACTOR_REVIEW_REPORT.md:43`、`CODEMAP_REFACTOR_REVIEW_REPORT.md:140`、`CODEMAP_REFACTOR_REVIEW_REPORT.md:141`；`src/cli/commands/analyze.ts:114`-`src/cli/commands/analyze.ts:123`。
- [证据] `assess-risk` 未使用 AI 饲料三维模型：`CODEMAP_REFACTOR_REVIEW_REPORT.md:44`；`src/cli/commands/ci.ts:129` 调用的是 `file-header-scanner` 内简化评分（`src/orchestrator/file-header-scanner.ts:163`-`src/orchestrator/file-header-scanner.ts:205`），而非第 8.6 统一公式（`docs/REFACTOR_REQUIREMENTS.md:463`-`docs/REFACTOR_REQUIREMENTS.md:481`）。
- [证据] `check-output-contract` 未校验 analyze 输出：`CODEMAP_REFACTOR_REVIEW_REPORT.md:45`；实现仅读 `package.json`（`src/cli/commands/ci.ts:150`-`src/cli/commands/ci.ts:166`），与设计预期不符（`docs/CI_GATEWAY_DESIGN.md:368`-`docs/CI_GATEWAY_DESIGN.md:436`）。
- [证据] `runAnalysis` 为存根：`CODEMAP_REFACTOR_REVIEW_REPORT.md:46`；`src/orchestrator/workflow/workflow-orchestrator.ts:138`-`src/orchestrator/workflow/workflow-orchestrator.ts:142`。

### 3.2 不准确项

- [证据] 验收表把“回退级联正常工作/多工具融合正确”打 ✅（`CODEMAP_REFACTOR_REVIEW_REPORT.md:265`、`CODEMAP_REFACTOR_REVIEW_REPORT.md:266`），但主入口 analyze 未接 ToolOrchestrator/ResultFusion（`CODEMAP_REFACTOR_REVIEW_REPORT.md:140`、`CODEMAP_REFACTOR_REVIEW_REPORT.md:141`；`src/cli/commands/analyze.ts:114`-`src/cli/commands/analyze.ts:123`）。
- [证据] TestLinker 95% 结论偏乐观：`CODEMAP_REFACTOR_REVIEW_REPORT.md:131`；设计关键能力未落地（`docs/REFACTOR_TEST_LINKER_DESIGN.md:107`、`docs/REFACTOR_TEST_LINKER_DESIGN.md:145`、`docs/REFACTOR_TEST_LINKER_DESIGN.md:265`）。
- [证据] 百分比完成度（80/70/87/75）缺乏可复算依据：`CODEMAP_REFACTOR_REVIEW_REPORT.md:18`-`CODEMAP_REFACTOR_REVIEW_REPORT.md:22`。

### 3.3 遗漏项

- [证据] 漏报：Analyze 参数契约与文档场景冲突。文档存在仅关键词搜索场景（`docs/REFACTOR_REQUIREMENTS.md:129`），代码却强制 `targets` 非空（`src/cli/commands/analyze.ts:86`-`src/cli/commands/analyze.ts:90`）。
- [证据] 漏报：默认 intent 不一致。文档参数默认 `search`（`docs/REFACTOR_ARCHITECTURE_OVERVIEW.md:363`），`AnalyzeCommand` 默认 `impact`（`src/cli/commands/analyze.ts:109`），`IntentRouter` 默认 `search`（`src/orchestrator/intent-router.ts:85`）。
- [证据] 漏报：Workflow 风险阶段命令参数失配 + 失败被吞。workflow 使用 `--threshold`（`src/orchestrator/workflow/workflow-orchestrator.ts:317`），但 `ci assess-risk` 未定义此参数（`src/cli/commands/ci.ts:205`-`src/cli/commands/ci.ts:208`），且 CI 命令失败仅警告不阻断（`src/orchestrator/workflow/workflow-orchestrator.ts:151`-`src/orchestrator/workflow/workflow-orchestrator.ts:153`）。
- [证据] 漏报：CI commit 检查存在“按空白切分 commit 主题”缺陷，可能误判。`COMMITS=$(git log --format=%s ...)` + `for commit in $COMMITS`（`.github/workflows/ci-gateway.yml:22`、`.github/workflows/ci-gateway.yml:26`）。

---

## 4. 两份报告的交叉冲突（高风险）

- [证据] 冲突 1：TestLinker 完成度。`REVIEW_REPORT.md:143`-`REVIEW_REPORT.md:146`（偏低） vs `CODEMAP_REFACTOR_REVIEW_REPORT.md:131`、`CODEMAP_REFACTOR_REVIEW_REPORT.md:267`（偏高）。
- [证据] 冲突 2：Phase 11 完成性。`REVIEW_REPORT.md:187`（完成） vs `CODEMAP_REFACTOR_REVIEW_REPORT.md:220`（存根）。
- [推论] 以上冲突若不清理，会直接影响“是否可发布/是否达成设计 DoD”的管理决策。

---

## 5. 失败模式模拟（强制）

- [证据] **触发**：某适配器阻塞时，`runToolWithTimeout` 未真正中断执行链（`src/orchestrator/tool-orchestrator.ts:100`、`src/orchestrator/tool-orchestrator.ts:118`）。
- [推论] **影响面**：analyze/工作流/CI 可能长时间挂起，回退级联失效，门禁结果失真。
- [证据] **检测信号**：仅存在 `AbortController` 建立与 abort 调用，未见 signal 传递到 adapter.execute（`src/orchestrator/tool-orchestrator.ts:100`-`src/orchestrator/tool-orchestrator.ts:103`、`src/orchestrator/tool-orchestrator.ts:118`）。
- [观点] **缓解路径**：
  1) `Promise.race` + 硬超时；
  2) 适配器接口显式接收 `AbortSignal`；
  3) 增加“挂起适配器”集成测试。

---

## 6. 最终判定（终版）

- [推论] 既有两份报告都**部分正确**，但均存在可影响验收结论的误判/漏报。
- [推论] **最终版结论**：项目“未完全完成”方向成立，但“完成度百分比”和“若干验收打勾项”不可直接采信，需以本终版勘误为准。
- [观点] 在修复以下 4 项前，不建议把该重构标记为“已通过最终验收”：
  1) `runAnalysis` 接线（`src/orchestrator/workflow/workflow-orchestrator.ts:142`）
  2) analyze 端到端接 ToolOrchestrator/ResultFusion（`src/cli/commands/analyze.ts:114`）
  3) output contract 真校验 + 生产端输出字段齐全（`src/cli/commands/ci.ts:150`、`src/cli/commands/analyze.ts:143`）
  4) timeout 机制修实（`src/orchestrator/tool-orchestrator.ts:118`）

---

## 7. 多 Agent 交付记录

- [证据] Agent-R1（REVIEW_REPORT 复核）已完成，关键结论置信度 93%。
- [证据] Agent-R2（CODEMAP_REFACTOR_REVIEW_REPORT 复核）已完成，关键结论置信度 93%。
- [证据] Reviewer-QA（交叉冲突/遗漏审计）已完成，产出 Top 风险误判与失败模式。
- [推论] 主协调器已对高风险点做二次源码复核并纳入本终版。

---

## 8. 置信度声明

- [观点] 本终版结论置信度：**96%**。
- [假设] 未执行动态运行验证（仅静态取证）；若需 99% 置信度，应补充最小回归执行（analyze machine 输出、workflow risk 阶段、ci check-output-contract）。
