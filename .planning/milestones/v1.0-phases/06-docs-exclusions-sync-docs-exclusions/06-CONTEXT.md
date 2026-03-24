# Phase 6: Docs Exclusions Sync（共享排除规则与最终文档护栏收口） - Context

**Gathered:** 2026-03-24
**Status:** Ready for execution
**Source:** Roadmap Phase 6 goal + analyzer/scanner/docs guardrail audit

<domain>
## Phase Boundary

本阶段只处理三个闭环：
1. 用共享文件发现模块统一 `analyze`、`generate` 侧的扫描逻辑与 `ci check-headers -d` 的目录扫描逻辑；
2. 同步 README / AI 文档 / 输出文档 / 验证规则，使它们准确反映 workflow 四阶段、ship/ci 边界与文件发现契约；
3. 把这些新事实写进 docs guardrail 与测试，防止回退。

本阶段**不**重做 analyze 四意图、**不**重构 workflow/ship 主逻辑、**不**引入新的 public CLI surface。

</domain>

<decisions>
## Implementation Decisions

### Single source of truth
- **D-01:** 新建 `src/core/file-discovery.ts` 作为共享发现模块，统一 `.gitignore` 感知、默认排除规则、`.git` worktree 兼容与子目录扫描的 root 解析。
- **D-02:** 默认排除模式修正为真正可递归命中的 `**/*.test.ts` / `**/*.spec.ts` / `**/*.d.ts`，避免 `*.test.ts` 只在根层生效的伪契约。

### Scope control
- **D-03:** `ci check-branch --allow` 文档已公开 `release/*` 示例，因此实现需要补齐 `*` 通配和 CI detached HEAD 分支回退；这是 Phase 6 的契约修复，不是新功能扩张。
- **D-04:** `ci-gateway.yml` 的真实执行面保持当前实现，只修正文档和 guardrail 对它的描述，避免再制造“workflow / ship / ci-gateway” 三方漂移。

### Verification
- **D-05:** 最小验证集合固定为：共享发现相关单测、docs guardrail 测试、workflow/ci/ship 回归、`npm run docs:check`、`npm run build`、`node dist/cli/index.js ci check-docs-sync`、`npm run lint`。

</decisions>

<specifics>
## Specific Ideas

- `src/core/analyzer.ts` 原先直接持有默认排除列表，但 `*.test.ts` 对嵌套文件不生效；Phase 6 需要从根因修正。
- `src/orchestrator/file-header-scanner.ts` 之前用手写目录跳过规则递归扫描，无法复用 `.gitignore` 与统一默认排除。
- `scripts/validate-docs.js` 之前没有固定 workflow 四阶段、ship 复用 ci、共享文件发现契约这些新事实。
- `docs/rules/engineering-with-codex-openai.md` 与 `docs/rules/validation.md` 需要明确：`check-working-tree` / `check-branch` / `check-scripts` 是本地 / ship 复用 gate checks，而不是当前 `ci-gateway.yml` 直接执行的全部内容。

</specifics>

<canonical_refs>
## Canonical References

- `.planning/ROADMAP.md` — Phase 6 目标、成功标准、`06-01` / `06-02` / `06-03`
- `.planning/REQUIREMENTS.md` — `FILE-01`、`DOC-01`、`DOC-02`
- `src/core/analyzer.ts`、`src/orchestrator/file-header-scanner.ts` — 扫描入口
- `src/cli/commands/ci.ts` — `check-branch` / docs-sync 相关 CLI 契约
- `README.md`、`AI_GUIDE.md`、`docs/ai-guide/COMMANDS.md`、`docs/ai-guide/OUTPUT.md` — 入口与 AI 文档
- `docs/rules/validation.md`、`docs/rules/engineering-with-codex-openai.md`、`scripts/validate-docs.js` — guardrail 真相

</canonical_refs>

<deferred>
## Deferred Ideas

- milestone audit / archive / cleanup 可在 phase 全部完成后单独执行
- 更广义的 config 文档整顿（如 `mode/include/schema` 历史漂移）不在本阶段主目标内

</deferred>

---

*Phase: 06-docs-exclusions-sync-docs-exclusions*
*Context gathered: 2026-03-24*
